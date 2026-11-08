/**
 * Grain + progressive-blur text effect.
 *
 * Each rendered line is drawn crisp onto its own canvas, its alpha is read
 * back, blurred into a few levels, then blended per pixel along two exponential
 * diagonals - blur into the bottom-right and, mirrored, into the top-left -
 * with grain eroded into the edges. One canvas per line keeps the existing line
 * reveals animating: the canvas sits inside the line element and moves with it.
 *
 * The blur levels are kept, so the amount of blur can follow the pointer
 * without re-blurring anything: only the blend between levels is re-evaluated.
 * Two mirrored ramps share those levels - one reaching into the bottom-right,
 * one into the top-left. The pointer crossfades them on both axes: the side it
 * is on loses blur while the opposite side gains it, so the bottom-right fades
 * as the cursor moves right or down and the top-left rises to meet it. Neither
 * corner ever exceeds the static amount.
 *
 * Layout is the spec's: word widths come from the canvas measure of the same
 * font, justified lines spread their gaps to the full width, the last line
 * keeps natural spacing. The real element keeps its text (transparent), so
 * sizing, wrapping and spacing stay exactly as the page laid them out.
 */

const SIGMAS = [0, 2, 4, 6, 8]; // blur levels @ 2576px reference
const CURVE = 2.6; // exponential falloff: crisp through the middle, blur at the corners
const DEAD = 0.03; // dead zone keeps the sharp corner properly sharp
const GRAIN = 2.7; // grain contrast (higher = harder grain)
const GRAIN_AMOUNT = 0.31; // 0 = no texture, 1 = full texture
const REFERENCE_WIDTH = 2576;
const TEXT_VALUE = 243; // #f3f3f3, the site foreground

const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);
const CURVE_DENOM = Math.exp(CURVE) - 1;
const curve = (value) => (Math.exp(CURVE * value) - 1) / CURVE_DENOM;

/* ---------- state shared by every canvas ---------- */

let pointerX = 0; // 0 = cursor at the left edge, 1 = at the right
let pointerY = 0; // 0 = cursor at the top of the screen, 1 = at the bottom
let targetX = 0;
let targetY = 0;
let rafId = 0;

const caches = new WeakMap(); // canvas -> levels + mirrored ramps + noise + output buffer
const live = new Set(); // canvases that can be re-blended

/**
 * One lookup for the whole grain pass: index = alpha byte << 8 | noise byte,
 * value = the packed pixel. Built once, so a re-blend never touches
 * Math.random or the grain maths.
 */
const GRAIN_LUT = (() => {
  const lut = new Uint32Array(65536);
  for (let a = 0; a < 256; a += 1) {
    const af = a / 255;
    for (let n = 0; n < 256; n += 1) {
      let v;
      if (af <= 0.002) v = 0;
      else if (af >= 0.998) v = 1;
      else {
        const grain = clamp((af - n / 255) * GRAIN + 0.5, 0, 1);
        v = af + (grain - af) * GRAIN_AMOUNT;
      }
      const at = (v * 255 + 0.5) | 0;
      lut[(a << 8) | n] = (at << 24) | (TEXT_VALUE << 16) | (TEXT_VALUE << 8) | TEXT_VALUE;
    }
  }
  return lut;
})();

/* ---------- separable box blur x3 ~ gaussian ---------- */
function boxH(src, dst, w, h, r) {
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    let acc = 0;
    for (let k = -r; k <= r; k += 1) acc += src[row + Math.min(w - 1, Math.max(0, k))];
    dst[row] = acc * inv;
    for (let x = 1; x < w; x += 1) {
      acc += src[row + Math.min(w - 1, x + r)] - src[row + Math.max(0, x - r - 1)];
      dst[row + x] = acc * inv;
    }
  }
}

function boxV(src, dst, w, h, r) {
  const inv = 1 / (2 * r + 1);
  for (let x = 0; x < w; x += 1) {
    let acc = 0;
    for (let k = -r; k <= r; k += 1) acc += src[Math.min(h - 1, Math.max(0, k)) * w + x];
    dst[x] = acc * inv;
    for (let y = 1; y < h; y += 1) {
      acc += src[Math.min(h - 1, y + r) * w + x] - src[Math.max(0, y - r - 1) * w + x];
      dst[y * w + x] = acc * inv;
    }
  }
}

function blur(src, w, h, sigma) {
  const r = Math.round(sigma);
  if (r < 1) return Float32Array.from(src);
  const a = Float32Array.from(src);
  const b = new Float32Array(src.length);
  for (let i = 0; i < 3; i += 1) {
    boxH(a, b, w, h, r);
    boxV(b, a, w, h, r);
  }
  return a;
}

const scratch = () => document.createElement('canvas').getContext('2d');
let trackingSupport = null;
const supportsTracking = () => (trackingSupport ??= 'letterSpacing' in scratch());

let measureCtx = null;

const toBytes = (source) => {
  const out = new Uint8Array(source.length);
  for (let i = 0; i < source.length; i += 1) out[i] = (clamp(source[i], 0, 1) * 255 + 0.5) | 0;
  return out;
};

/**
 * Two normalised blur ramps, 0..255 per pixel, exponential rather than linear:
 * the middle of the block stays nearly sharp while the corners carry almost all
 * of the blur. `near` reaches into the bottom-right, `far` is its point mirror
 * into the top-left.
 */
function buildRamp(cw, ch, pad, W, linePx, blockPx) {
  const count = cw * ch;
  const near = new Uint8Array(count);
  const far = new Uint8Array(count);
  const columns = new Float32Array(cw);
  const columnsFar = new Float32Array(cw);

  for (let px = 0; px < cw; px += 1) {
    const u = clamp((px - pad.x) / W, 0, 1);
    columns[px] = 0.65 * curve(u);
    columnsFar[px] = 0.65 * curve(1 - u);
  }

  const spread = (1 / (1 - DEAD)) * 255;
  const encode = (t) => (t <= DEAD ? 0 : Math.min(255, ((t - DEAD) * spread) | 0));

  for (let py = 0; py < ch; py += 1) {
    const v = clamp((linePx + (py - pad.top)) / blockPx, 0, 1);
    const down = 0.35 * curve(v);
    const downFar = 0.35 * curve(1 - v);
    const row = py * cw;
    for (let px = 0; px < cw; px += 1) {
      near[row + px] = encode(columns[px] + down);
      far[row + px] = encode(columnsFar[px] + downFar);
    }
  }

  return { near, far };
}

/** Stable grain, so a re-blend (or a resize) never makes the texture shimmer. */
function buildNoise(length) {
  const out = new Uint8Array(length);
  let seed = 0x9e3779b9 ^ length;
  for (let i = 0; i < length; i += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    out[i] = seed & 255;
  }
  return out;
}

const lowerLut = new Uint8Array(256);
const mixLut = new Float32Array(256);

/**
 * Blends the cached blur levels at the current pointer position and writes the
 * pixels back into the canvas. The two mirrored ramps are folded together per
 * pixel (integer only), and the resulting 0..255 field drives the same
 * run-based blend as the static effect.
 */
function paint(ctx, cache) {
  const { levels, near, far, noise, image, pixels, count } = cache;
  const top = levels.length - 1;
  const px = clamp(pointerX, 0, 1);
  const py = clamp(pointerY, 0, 1);

  for (let q = 0; q < 256; q += 1) {
    const f = (q / 255) * top;
    let lower = f | 0;
    if (lower >= top) lower = top - 1;
    lowerLut[q] = lower;
    mixLut[q] = f - lower;
  }

  // the side the cursor is on loses blur, the opposite side gains it. Both
  // axes contribute equally: right/down hands the blur to the top-left,
  // left/up hands it back to the bottom-right.
  const towardFar = (px + py) * 0.5;
  const toFarWeight = (towardFar * 256) | 0;
  const toNearWeight = 256 - toFarWeight;

  let aFrom = levels[0];
  let aTo = levels[1];
  let k = 0;
  let inv = 1;
  let prev = -1;

  for (let i = 0; i < count; i += 1) {
    const toNear = (near[i] * toNearWeight) >> 8;
    const toFar = (far[i] * toFarWeight) >> 8;
    const q = toNear > toFar ? toNear : toFar;

    if (q !== prev) {
      prev = q;
      const lower = lowerLut[q];
      aFrom = levels[lower];
      aTo = levels[lower + 1];
      k = mixLut[q];
      inv = 1 - k;
    }
    const alpha = (aFrom[i] * inv + aTo[i] * k) | 0;
    pixels[i] = GRAIN_LUT[(alpha << 8) | noise[i]];
  }

  ctx.putImageData(image, 0, 0);
}

/**
 * Progressive blur (sharp top-left to blurred bottom-right) with grain eroded
 * into the edges. The blur levels are cached so `paint` can re-blend them when
 * the pointer moves. `linePx` is where this canvas starts inside its block, so
 * the vertical ramp stays continuous whether one line or a whole paragraph is
 * in here.
 */
function finish(ctx, { cw, ch, pad, W, sigmas, linePx, blockPx }) {
  const count = cw * ch;
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const alpha = new Float32Array(count);
  for (let i = 0; i < count; i += 1) alpha[i] = data[i * 4 + 3] / 255;

  const levels = new Array(sigmas.length);
  levels[0] = toBytes(alpha);
  for (let i = 1; i < sigmas.length; i += 1) {
    levels[i] = toBytes(blur(alpha, cw, ch, Math.max(0.6, sigmas[i])));
  }

  const image = new ImageData(cw, ch);
  const ramps = buildRamp(cw, ch, pad, W, linePx, blockPx);
  const cache = {
    levels,
    near: ramps.near,
    far: ramps.far,
    noise: buildNoise(count),
    image,
    pixels: new Uint32Array(image.data.buffer),
    count,
  };

  caches.set(ctx.canvas, cache);
  live.add(ctx.canvas);
  paint(ctx, cache);
}

/** Draws one line into its own canvas and paints the effect over it. */
function paintLine(node, { words, width, lineHeight, baseline, blockHeight, lineTop, config }) {
  const { font, tracking, gap, indent, dpr, sigmas, pad } = config;

  const W = Math.max(1, Math.round(width * dpr));
  const H = Math.max(1, Math.round(lineHeight * dpr));
  const cw = W + pad.x * 2;
  const ch = H + pad.top + pad.bottom;

  let canvas = node.querySelector('.grain__c');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'grain__c';
    canvas.setAttribute('aria-hidden', 'true');
    node.appendChild(canvas);
  }
  canvas.width = cw;
  canvas.height = ch;
  canvas.style.left = `${-pad.x / dpr}px`;
  canvas.style.top = `${-pad.top / dpr}px`;
  canvas.style.width = `${cw / dpr}px`;
  canvas.style.height = `${ch / dpr}px`;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  /* 1. the text, crisp - in CSS pixels, the backing store is the DPR one */
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw / dpr, ch / dpr);
  ctx.font = font;
  if (supportsTracking()) ctx.letterSpacing = `${tracking}px`;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';

  const mctx = measureCtx;
  mctx.font = font;
  let x = indent + pad.x / dpr;
  const y = baseline + pad.top / dpr;
  words.forEach((word) => {
    ctx.fillText(word, x, y);
    x += mctx.measureText(word).width + gap;
  });

  finish(ctx, { cw, ch, pad, W, sigmas, linePx: lineTop * dpr, blockPx: blockHeight * dpr });
}

/**
 * Paints an unsplit block as a single canvas. Word positions come from Range
 * rects, so the canvas follows the browser's own line breaking and spacing
 * instead of the DOM being cut into one element per line.
 */
function paintBlock(el, config) {
  const { width, lineHeight, baseline, font, tracking, uppercase, dpr, sigmas, pad } = config;

  const node = [...el.childNodes].find((child) => child.nodeType === 3 && child.textContent.trim());
  if (!node) return false;

  const base = el.getBoundingClientRect();
  const words = [];

  for (const match of node.textContent.matchAll(/\S+/g)) {
    const range = document.createRange();
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    const rect = range.getBoundingClientRect();
    if (!rect.width) continue;
    words.push({ text: match[0], x: rect.left - base.left, top: Math.round(rect.top) });
  }

  if (!words.length) return false;

  const lines = [...new Set(words.map((word) => word.top))].sort((a, b) => a - b);
  const lineOf = new Map(lines.map((top, i) => [top, i]));
  const blockHeight = Math.max(base.height, lines.length * lineHeight);

  const W = Math.max(1, Math.round(width * dpr));
  const H = Math.max(1, Math.round(blockHeight * dpr));
  const cw = W + pad.x * 2;
  const ch = H + pad.top + pad.bottom;

  let canvas = el.querySelector('.grain__c');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'grain__c';
    canvas.setAttribute('aria-hidden', 'true');
    el.appendChild(canvas);
  }
  canvas.width = cw;
  canvas.height = ch;
  canvas.style.left = `${-pad.x / dpr}px`;
  canvas.style.top = `${-pad.top / dpr}px`;
  canvas.style.width = `${cw / dpr}px`;
  canvas.style.height = `${ch / dpr}px`;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw / dpr, ch / dpr);
  ctx.font = font;
  if (supportsTracking()) ctx.letterSpacing = `${tracking}px`;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';

  words.forEach((word) => {
    const line = lineOf.get(word.top) || 0;
    ctx.fillText(
      uppercase ? word.text.toUpperCase() : word.text,
      word.x + pad.x / dpr,
      line * lineHeight + baseline + pad.top / dpr,
    );
  });

  finish(ctx, { cw, ch, pad, W, sigmas, linePx: 0, blockPx: blockHeight * dpr });

  el.classList.add('is-grain', 'is-grain--block');
  return true;
}

/** Font, tracking, blur levels and canvas padding, shared by both paint paths. */
function measureConfig(el) {
  const style = getComputedStyle(el);
  const fontSize = parseFloat(style.fontSize);
  const width = el.getBoundingClientRect().width;
  if (!fontSize || width < 2) return null;

  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
  const font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  const tracking = style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing) || 0;
  const uppercase = style.textTransform === 'uppercase';
  const justified = style.textAlign === 'justify';
  const indent = parseFloat(style.textIndent) || 0;
  const radius = parseFloat(el.dataset.grain) || 6;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  if (!measureCtx) measureCtx = scratch();
  measureCtx.font = font;
  if (supportsTracking()) measureCtx.letterSpacing = `${tracking}px`;

  // half-leading, the same way the browser centres the line box
  const metrics = measureCtx.measureText('Hg');
  const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.75;
  const descent = metrics.fontBoundingBoxDescent || fontSize * 0.25;
  const baseline = (lineHeight - (ascent + descent)) / 2 + ascent;

  const scale = (document.documentElement.clientWidth * dpr) / REFERENCE_WIDTH;
  const sigmas = SIGMAS.map((sigma) => sigma * (radius / 6) * scale);
  const space = measureCtx.measureText(' ').width;

  // room for the blur, plus whatever the glyphs reach past their line box
  // (a descender such as the comma in "FAR," starts below the 0.82 box)
  const bleed = Math.ceil((Math.max(...sigmas) * 3 + 4) / dpr) * dpr;
  const pad = {
    x: bleed,
    top: bleed + Math.ceil(Math.max(0, ascent - baseline)) * dpr,
    bottom: bleed + Math.ceil(Math.max(0, baseline + descent - lineHeight)) * dpr,
  };

  return {
    width,
    lineHeight,
    font,
    tracking,
    uppercase,
    justified,
    indent,
    dpr,
    sigmas,
    space,
    baseline,
    pad,
  };
}

function renderElement(el) {
  const nodes = [...el.querySelectorAll('.ln__i')];
  const config = measureConfig(el);
  if (!config) return false;

  // an unsplit block (a phone) has no line elements to paint one by one, so the
  // whole paragraph is drawn as one canvas instead
  if (!nodes.length) return paintBlock(el, config);

  const { width, lineHeight, baseline, font, tracking, uppercase, justified, indent, space, dpr, sigmas, pad } = config;
  const blockHeight = nodes.length * lineHeight;

  nodes.forEach((node, i) => {
    const raw = node.textContent;
    const words = (uppercase ? raw.toUpperCase() : raw).split(/\s+/).filter(Boolean);
    if (!words.length) return;

    const lead = i === 0 ? indent : 0;
    const sum = words.reduce((total, word) => total + measureCtx.measureText(word).width, 0);
    const isLast = i === nodes.length - 1;
    const gap =
      justified && !isLast && words.length > 1 ? (width - lead - sum) / (words.length - 1) : space;

    paintLine(node, {
      words,
      width,
      lineHeight,
      baseline,
      blockHeight,
      lineTop: i * lineHeight,
      config: { font, tracking, gap, indent: lead, dpr, sigmas, pad },
    });
  });

  el.classList.add('is-grain');
  return true;
}

/* ---------- pointer-driven blur ---------- */

/** Canvases on (or just off) screen, in paint order. */
function visibleItems() {
  const items = [];
  for (const canvas of live) {
    if (!canvas.isConnected) {
      live.delete(canvas);
      continue;
    }
    const cache = caches.get(canvas);
    if (!cache) continue;

    const rect = canvas.getBoundingClientRect();
    if (rect.bottom < -160 || rect.top > window.innerHeight + 160) continue;

    items.push({ canvas, cache });
  }
  return items;
}

const HOVER_FINE = '(hover: hover) and (pointer: fine)';
const REDUCED = '(prefers-reduced-motion: reduce)';

// a large hero is several megapixels of blending; a hard budget per frame keeps
// the effect from ever becoming the reason the page drops a frame. Canvases are
// picked up by the next frame, so the whole block still lands on the target.
const FRAME_BUDGET = 8;

let queue = null;

function tick() {
  rafId = 0;

  const dx = targetX - pointerX;
  const dy = targetY - pointerY;
  const moving = Math.abs(dx) > 0.0015 || Math.abs(dy) > 0.0015;

  if (moving) {
    pointerX += dx * 0.16;
    pointerY += dy * 0.16;
  } else if (pointerX !== targetX || pointerY !== targetY) {
    pointerX = targetX;
    pointerY = targetY;
    queue = null; // repaint everything once at the exact value
  } else if (!queue) {
    return; // pointer did not move: nothing to repaint
  }

  if (!queue) queue = visibleItems();

  const start = performance.now();
  while (queue.length && performance.now() - start < FRAME_BUDGET) {
    const { canvas, cache } = queue.shift();
    if (canvas.isConnected) paint(canvas.getContext('2d', { willReadFrequently: true }), cache);
  }
  if (!queue.length) queue = null;

  if (moving || queue) rafId = requestAnimationFrame(tick);
}

function onPointerMove(event) {
  if (event.pointerType === 'touch') return;
  // relative to the screen, not the block: left/top are 0, right/bottom are 1
  targetX = clamp(event.clientX / window.innerWidth, 0, 1);
  targetY = clamp(event.clientY / window.innerHeight, 0, 1);
  if (!rafId) rafId = requestAnimationFrame(tick);
}

let pointerBound = false;

const rendered = new Set();
let observer = null;

/** Renders the hero at once, everything else shortly before it scrolls in. */
export function initGrainText(selector = '[data-grain]') {
  const elements = [...document.querySelectorAll(selector)];
  if (!elements.length) return;

  if (observer) observer.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (renderElement(entry.target)) rendered.add(entry.target);
      });
    },
    { rootMargin: '600px 0px' },
  );

  elements.forEach((el) => {
    if (el.closest('.hero')) {
      if (renderElement(el)) rendered.add(el);
    } else {
      observer.observe(el);
    }
  });

  if (!pointerBound && !window.matchMedia(REDUCED).matches && window.matchMedia(HOVER_FINE).matches) {
    pointerBound = true;
    window.addEventListener('pointermove', onPointerMove, { passive: true });
  }
}

/** Re-renders the elements that already have a canvas (the DOM was re-split). */
export function renderGrainText() {
  rendered.forEach((el) => {
    if (renderElement(el)) return;
    // the canvas is the only visible text once is-grain is set: a block that
    // cannot be painted has to fall back to plain text instead of staying
    // transparent until the page is reloaded
    el.classList.remove('is-grain', 'is-grain--block');
    el.querySelectorAll('.grain__c').forEach((canvas) => {
      live.delete(canvas);
      canvas.remove();
    });
    rendered.delete(el);
  });
}
