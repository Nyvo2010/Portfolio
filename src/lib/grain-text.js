/**
 * Grain + progressive-blur text effect (see the implementation spec).
 *
 * Each rendered line is drawn crisp onto its own canvas, its alpha is read
 * back, blurred into a few levels, then blended per pixel along a diagonal -
 * sharp top-left, blurrier bottom-right - with grain eroded into the edges.
 * One canvas per line keeps the existing line reveals animating: the canvas
 * sits inside the line element and moves with it.
 *
 * Layout is the spec's: word widths come from the canvas measure of the same
 * font, justified lines spread their gaps to the full width, the last line
 * keeps natural spacing. The real element keeps its text (transparent), so
 * sizing, wrapping and spacing stay exactly as the page laid them out.
 */

const SIGMAS = [0, 1.8, 3.2, 4.6, 6.2, 8]; // blur levels @ 2576px reference
const GRAIN = 2.6; // grain contrast (higher = harder grain)
const GRAIN_AMOUNT = 0.25; // 0 = no texture, 1 = full texture
const REFERENCE_WIDTH = 2576;
const TEXT_VALUE = 243; // #f3f3f3, the site foreground

const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);

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

/**
 * Progressive blur (sharp top-left to blurred bottom-right) with grain eroded
 * into the edges, written straight back into the canvas that was just drawn.
 * `linePx` is where this canvas starts inside its block, so the vertical ramp
 * stays continuous whether one line or a whole paragraph is in here.
 */
function finish(ctx, { cw, ch, pad, W, sigmas, linePx, blockPx }) {
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const alpha = new Float32Array(cw * ch);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = data[i * 4 + 3] / 255;

  const levels = sigmas.map((sigma, i) => (i === 0 ? alpha : blur(alpha, cw, ch, Math.max(0.6, sigma))));
  const top = levels.length - 1;

  const out = new ImageData(cw, ch);
  const pixels = new Uint32Array(out.data.buffer);

  for (let py = 0; py < ch; py += 1) {
    const ty = 0.35 * clamp((linePx + (py - pad.top)) / blockPx, 0, 1);
    for (let px = 0; px < cw; px += 1) {
      const t = clamp(0.65 * clamp((px - pad.x) / W, 0, 1) + ty, 0, 1);
      const f = Math.pow(Math.max(0, (t - 0.04) / 0.96), 1.15) * top; // dead zone keeps the corner sharp
      const lower = Math.min(top - 1, f | 0);
      const k = f - lower;
      const index = py * cw + px;
      const a = levels[lower][index] * (1 - k) + levels[lower + 1][index] * k;

      let v = 0;
      if (a > 0.002) {
        if (a > 0.998) {
          v = 1;
        } else {
          const grain = clamp((a - Math.random()) * GRAIN + 0.5, 0, 1);
          v = a + (grain - a) * GRAIN_AMOUNT;
        }
      }

      const at = (v * 255) | 0;
      pixels[index] = (at << 24) | (TEXT_VALUE << 16) | (TEXT_VALUE << 8) | TEXT_VALUE;
    }
  }

  ctx.putImageData(out, 0, 0);
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
}

/** Re-renders the elements that already have a canvas (the DOM was re-split). */
export function renderGrainText() {
  rendered.forEach((el) => {
    if (renderElement(el)) return;
    // the canvas is the only visible text once is-grain is set: a block that
    // cannot be painted has to fall back to plain text instead of staying
    // transparent until the page is reloaded
    el.classList.remove('is-grain', 'is-grain--block');
    el.querySelectorAll('.grain__c').forEach((canvas) => canvas.remove());
    rendered.delete(el);
  });
}
