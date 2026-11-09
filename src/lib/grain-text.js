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
 * Layout is never recomputed: every word is drawn at the position the browser
 * already gave it, so justification, indent, tracking and wrapping are the
 * browser's own. The real element keeps its text (transparent), so the canvas
 * and the layout cannot drift apart.
 */

import { env, isFinePointer, prefersReducedMotion, nextFrame, whenIdle } from './env.js';

export const SIGMAS = [0, 2, 4, 6, 8]; // blur levels @ 2576px reference
// Flat through the first share of the block, then a steep exponential rise.
// RAMP_START moves where the blur begins, CURVE decides how hard it lands at
// the edge; the two are independent.
const CURVE = 4.2;
const RAMP_START = 0.3;
const DEAD = 0.03; // dead zone keeps the sharp corner properly sharp
export const GRAIN = 2.7; // grain contrast (higher = harder grain)
export const GRAIN_AMOUNT = 0.31; // 0 = no texture, 1 = full texture
export const REFERENCE_WIDTH = 2576;
const TEXT_VALUE = 243; // #f3f3f3, the site foreground
// The blur is part of the signature, but 85% of it is enough. The ramps, the
// pointer crossfade and the grain are untouched: only the sigma scale drops.
export const BLUR_SCALE = 0.85;
// A phone paints a heading as one block canvas, so the softened corners read
// stronger there than on the desktop line-by-line version. Headings keep 70%
// of the blur at that width; the ramp, crossfade and grain stay untouched.
const MOBILE_HEADING_SCALE = 0.7;
// Refinements on the site-wide scale: display type keeps 80% of it, and the
// about copy 60%, so the long paragraph reads clearest.
const HEADING_SCALE = 0.8;
const ABOUT_SCALE = 0.6;
const mobile = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 860px)') : null;

const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);
const CURVE_DENOM = Math.exp(CURVE) - 1;
const curve = (value) => {
  const t = clamp((value - RAMP_START) / (1 - RAMP_START), 0, 1);
  return (Math.exp(CURVE * t) - 1) / CURVE_DENOM;
};

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
/* Integer box blur: the levels are stored as bytes anyway, so working in
   Uint8Array avoids two float conversions per level and is roughly twice as
   fast as the old Float32 version on the large display canvases. */
function boxH(src, dst, w, h, r) {
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    let acc = 0;
    for (let k = -r; k <= r; k += 1) {
      const x = k < 0 ? 0 : k >= w ? w - 1 : k;
      acc += src[row + x];
    }
    dst[row] = (acc * inv + 0.5) | 0;
    for (let x = 1; x < w; x += 1) {
      const add = x + r < w ? x + r : w - 1;
      const sub = x - r - 1 > 0 ? x - r - 1 : 0;
      acc += src[row + add] - src[row + sub];
      dst[row + x] = (acc * inv + 0.5) | 0;
    }
  }
}

function boxV(src, dst, w, h, r) {
  const inv = 1 / (2 * r + 1);
  for (let x = 0; x < w; x += 1) {
    let acc = 0;
    for (let k = -r; k <= r; k += 1) {
      const y = k < 0 ? 0 : k >= h ? h - 1 : k;
      acc += src[y * w + x];
    }
    dst[x] = (acc * inv + 0.5) | 0;
    for (let y = 1; y < h; y += 1) {
      const add = y + r < h ? y + r : h - 1;
      const sub = y - r - 1 > 0 ? y - r - 1 : 0;
      acc += src[add * w + x] - src[sub * w + x];
      dst[y * w + x] = (acc * inv + 0.5) | 0;
    }
  }
}

function blur(src, w, h, sigma) {
  const r = Math.round(sigma);
  if (r < 1) return src.slice();
  let a = src.slice();
  const b = new Uint8Array(src.length);
  for (let i = 0; i < 3; i += 1) {
    boxH(a, b, w, h, r);
    boxV(b, a, w, h, r);
  }
  return a;
}

/**
 * The blur levels are smooth by definition, so they are computed at half
 * resolution and expanded again. That quarters the most expensive pass while
 * the crisp base level and the grain stay at full resolution.
 */
function downsampleInto(src, w, h, dw, dh, out, yStart, yEnd) {
  // Two horizontally adjacent source bytes can be read as one 16-bit word.
  const src16 = (src.byteOffset & 1) === 0 ? new Uint16Array(src.buffer, src.byteOffset, src.length >> 1) : null;
  const fast = Boolean(src16) && (w & 1) === 0;

  for (let y = yStart; y < yEnd; y += 1) {
    const sy = y * 2;
    const sy2 = sy + 1 < h ? sy + 1 : sy;
    const row = y * dw;
    const rowA = sy * w;
    const rowB = sy2 * w;

    if (fast) {
      const rowA16 = rowA >> 1;
      const rowB16 = rowB >> 1;
      for (let x = 0; x < dw; x += 1) {
        const a = src16[rowA16 + x];
        const b = src16[rowB16 + x];
        out[row + x] = ((a & 255) + (a >> 8) + (b & 255) + (b >> 8)) >> 2;
      }
    } else {
      for (let x = 0; x < dw; x += 1) {
        const sx = x * 2;
        const sx2 = sx + 1 < w ? sx + 1 : sx;
        out[row + x] =
          (src[rowA + sx] + src[rowA + sx2] + src[rowB + sx] + src[rowB + sx2]) >> 2;
      }
    }
  }
}

function downsample(src, w, h, dw, dh) {
  const out = new Uint8Array(dw * dh);
  downsampleInto(src, w, h, dw, dh, out, 0, dh);
  return out;
}

function upsampleInto(src, sw, sh, w, h, out, yStart, yEnd) {
  // Walk the small buffer and write 2x2 blocks; this is four times fewer
  // iterations than walking the full-resolution output. When a row is a whole
  // number of 32-bit words, two source pixels expand into one word, so the
  // inner loop halves again and needs no bounds checks.
  if ((w & 3) === 0 && (out.byteOffset & 3) === 0) {
    const out32 = new Uint32Array(out.buffer, out.byteOffset, out.length >> 2);
    const words = w >> 2;

    for (let y = yStart; y < yEnd; y += 1) {
      const dy = y * 2;
      const row0 = dy * words;
      const row1 = dy + 1 < h ? row0 + words : -1;
      const srcRow = y * sw;

      for (let x = 0; x < words; x += 1) {
        const i = srcRow + x * 2;
        const v0 = src[i];
        const v1 = src[i + 1];
        const word = v0 | (v0 << 8) | (v1 << 16) | (v1 << 24);
        out32[row0 + x] = word;
        if (row1 >= 0) out32[row1 + x] = word;
      }
    }
    return;
  }

  for (let y = yStart; y < yEnd; y += 1) {
    const dy = y * 2;
    const srcRow = y * sw;
    const row0 = dy * w;
    const row1 = dy + 1 < h ? row0 + w : -1;
    for (let x = 0; x < sw; x += 1) {
      const value = src[srcRow + x];
      const dx = x * 2;
      out[row0 + dx] = value;
      if (dx + 1 < w) out[row0 + dx + 1] = value;
      if (row1 >= 0) {
        out[row1 + dx] = value;
        if (dx + 1 < w) out[row1 + dx + 1] = value;
      }
    }
  }
}

function upsample(src, sw, sh, w, h) {
  const out = new Uint8Array(w * h);
  upsampleInto(src, sw, sh, w, h, out, 0, sh);
  return out;
}

const scratch = () => document.createElement('canvas').getContext('2d');
let trackingSupport = null;
const supportsTracking = () => {
  if (trackingSupport === null) trackingSupport = 'letterSpacing' in scratch();
  return trackingSupport;
};

let measureCtx = null;

/**
 * Two normalised blur ramps, 0..255 per pixel, exponential rather than linear:
 * the middle of the block stays nearly sharp while the corners carry almost all
 * of the blur. `near` reaches into the bottom-right, `far` is its point mirror
 * into the top-left.
 */
function rampColumns(cw, pad, W) {
  const columns = new Float32Array(cw);
  const columnsFar = new Float32Array(cw);

  for (let px = 0; px < cw; px += 1) {
    const u = clamp((px - pad.x) / W, 0, 1);
    columns[px] = 0.65 * curve(u);
    columnsFar[px] = 0.65 * curve(1 - u);
  }

  return { columns, columnsFar };
}

function buildRampRows(columns, columnsFar, near, far, cw, pad, linePx, blockPx, yStart, yEnd) {
  const spread = (1 / (1 - DEAD)) * 255;

  for (let py = yStart; py < yEnd; py += 1) {
    const v = clamp((linePx + (py - pad.top)) / blockPx, 0, 1);
    const down = 0.35 * curve(v);
    const downFar = 0.35 * curve(1 - v);
    const row = py * cw;
    for (let px = 0; px < cw; px += 1) {
      // Inlined encode: two function calls per pixel were a measurable share
      // of the block paint on a throttled phone.
      const tn = columns[px] + down;
      const vn = tn <= DEAD ? 0 : (tn - DEAD) * spread;
      near[row + px] = vn > 255 ? 255 : vn | 0;

      const tf = columnsFar[px] + downFar;
      const vf = tf <= DEAD ? 0 : (tf - DEAD) * spread;
      far[row + px] = vf > 255 ? 255 : vf | 0;
    }
  }
}

function buildRamp(cw, ch, pad, W, linePx, blockPx) {
  const count = cw * ch;
  const near = new Uint8Array(count);
  const far = new Uint8Array(count);

  const { columns, columnsFar } = rampColumns(cw, pad, W);
  buildRampRows(columns, columnsFar, near, far, cw, pad, linePx, blockPx, 0, ch);
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
function paintRows(cache, start, end) {
  const { levels, near, far, noise, pixels } = cache;
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

  for (let i = start; i < end; i += 1) {
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
}

function paint(ctx, cache) {
  paintRows(cache, 0, cache.count);
  ctx.putImageData(cache.image, 0, 0);
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
  const base = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) base[i] = data[i * 4 + 3];

  const levels = new Array(sigmas.length);
  levels[0] = base;

  const hw = Math.max(1, (cw + 1) >> 1);
  const hh = Math.max(1, (ch + 1) >> 1);
  const small = downsample(base, cw, ch, hw, hh);

  for (let i = 1; i < sigmas.length; i += 1) {
    const blurred = blur(small, hw, hh, Math.max(0.6, sigmas[i] * 0.5));
    levels[i] = upsample(blurred, hw, hh, cw, ch);
  }

  const image = new ImageData(cw, ch);
  const ramps = buildRamp(cw, ch, pad, W, linePx, blockPx);
  const cache = {
    ctx,
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

/**
 * The same result as `finish`, but the expensive row loops are split across
 * frames. A whole unsplit paragraph on a phone is one large canvas; doing the
 * downsample, every blur level, the ramp and the blend in one task was the
 * 1.5s block on a throttled device. The output is byte-for-byte the same.
 */
const CHUNK_PIXELS = 150000;
const ASYNC_MIN_PIXELS = 250000;

async function finishAsync(ctx, { cw, ch, pad, W, sigmas, linePx, blockPx }) {
  const count = cw * ch;
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const base = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) base[i] = data[i * 4 + 3];

  const hw = Math.max(1, (cw + 1) >> 1);
  const hh = Math.max(1, (ch + 1) >> 1);
  const rows = Math.max(1, Math.floor(CHUNK_PIXELS / Math.max(1, cw)));

  const small = new Uint8Array(hw * hh);
  await nextFrame();
  for (let y = 0; y < hh; y += rows) {
    downsampleInto(base, cw, ch, hw, hh, small, y, Math.min(hh, y + rows));
    await nextFrame();
  }

  // The blur passes are already at half resolution; they are cheap enough to
  // run one level per frame instead of chunking them further.
  const blurredLevels = new Array(sigmas.length);
  for (let i = 1; i < sigmas.length; i += 1) {
    blurredLevels[i] = blur(small, hw, hh, Math.max(0.6, sigmas[i] * 0.5));
    if (i < sigmas.length - 1) await nextFrame();
  }

  const levels = new Array(sigmas.length);
  levels[0] = base;
  for (let i = 1; i < sigmas.length; i += 1) levels[i] = new Uint8Array(count);

  const image = new ImageData(cw, ch);
  const near = new Uint8Array(count);
  const far = new Uint8Array(count);
  const { columns, columnsFar } = rampColumns(cw, pad, W);
  const cache = {
    ctx,
    levels,
    near,
    far,
    noise: buildNoise(count),
    image,
    pixels: new Uint32Array(image.data.buffer),
    count,
  };

  caches.set(ctx.canvas, cache);
  live.add(ctx.canvas);

  // One small-buffer row feeds two output rows. Expanding every level, building
  // the ramp and blending the same band in one pass keeps the number of frames
  // low while every task stays bounded.
  const rowsSmall = Math.max(1, Math.floor(CHUNK_PIXELS / Math.max(1, cw * 2)));
  for (let sy = 0; sy < hh; sy += rowsSmall) {
    const ey = Math.min(hh, sy + rowsSmall);
    const y0 = sy * 2;
    const y1 = Math.min(ch, ey * 2);

    for (let i = 1; i < sigmas.length; i += 1) {
      upsampleInto(blurredLevels[i], hw, hh, cw, ch, levels[i], sy, ey);
    }
    buildRampRows(columns, columnsFar, near, far, cw, pad, linePx, blockPx, y0, y1);
    paintRows(cache, y0 * cw, y1 * cw);
    await nextFrame();
  }

  ctx.putImageData(image, 0, 0);
}

async function finishMaybeAsync(ctx, spec) {
  if (spec.cw * spec.ch >= ASYNC_MIN_PIXELS) await finishAsync(ctx, spec);
  else finish(ctx, spec);
}

/*
 * One painter for both shapes of element: a split line (one canvas inside its
 * own line, so the line reveal carries the canvas with it) and an unsplit
 * paragraph (one canvas over the whole block). Words are placed from Range
 * rects, so the browser's own line breaking, justification and spacing are the
 * only layout there is - there is no second word-spacing model to drift.
 * `lineTop` is how far the element starts inside its block, so the blur ramp
 * stays continuous across lines.
 */
function prepareCanvas(el, config, lineTop = 0) {
  const { width, lineHeight, baseline, font, tracking, uppercase, dpr, sigmas, pad } = config;

  const node = [...el.childNodes].find((child) => child.nodeType === 3 && child.textContent.trim());
  if (!node) return null;

  const base = el.getBoundingClientRect();
  const words = [];
  const wordPattern = /\S+/g;
  let match;

  // `String.prototype.matchAll` is Safari 13+; an exec loop keeps older
  // webviews from throwing during the very first paint.
  while ((match = wordPattern.exec(node.textContent))) {
    const range = document.createRange();
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    const rect = range.getBoundingClientRect();
    if (!rect.width) continue;
    words.push({ text: match[0], x: rect.left - base.left, top: Math.round(rect.top) });
  }

  if (!words.length) return null;

  const lines = [...new Set(words.map((word) => word.top))].sort((a, b) => a - b);
  const lineOf = new Map(lines.map((top, i) => [top, i]));
  const blockHeight = Math.max(base.height, lines.length * lineHeight);

  const W = Math.max(1, Math.round(width * dpr));
  const H = Math.max(1, Math.round(blockHeight * dpr));
  const cw = W + pad.x * 2;
  const ch = H + pad.top + pad.bottom;

  // An absolutely positioned canvas resolves against its nearest positioned
  // ancestor, but the host only becomes one when `is-grain` lands - after the
  // paint. Without this the canvas sits at the page origin for the frames the
  // paint takes and then jumps into place, which is visible on any page without
  // a curtain. Make the host a containing block before the canvas exists, while
  // the real text is still there.
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

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

  return { ctx, cw, ch, pad, W, sigmas, linePx: lineTop * dpr, blockPx: config.blockHeight * dpr };
}

function paintCanvas(el, config, lineTop = 0, block = false) {
  const prep = prepareCanvas(el, config, lineTop);
  if (!prep) return false;
  finish(prep.ctx, prep);
  if (block) el.classList.add('is-grain', 'is-grain--block');
  return true;
}

async function paintCanvasAsync(el, config, lineTop = 0, block = false) {
  const prep = prepareCanvas(el, config, lineTop);
  if (!prep) return false;

  // Small canvases finish in one go; only one big enough to become a long task
  // pays for the extra frames.
  await finishMaybeAsync(prep.ctx, prep);

  if (block) el.classList.add('is-grain', 'is-grain--block');
  return true;
}

/** Font, tracking, blur levels and canvas padding, shared by both paint paths. */
function measureConfig(el) {
  const style = getComputedStyle(el);
  const fontSize = parseFloat(style.fontSize);
  const rect = el.getBoundingClientRect();
  const width = rect.width;
  const blockHeight = rect.height;
  if (!fontSize || width < 2) return null;

  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
  const font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  const tracking = style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing) || 0;
  const uppercase = style.textTransform === 'uppercase';
  const radius = parseFloat(el.dataset.grain) || 6;

  // The canvas is the visible text, so this keeps the original 2x cap. The
  // heavy work is chunked and the blur is computed at half resolution instead
  // of lowering the resolution of the type itself.
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
  const headingOnPhone = Boolean(mobile && mobile.matches && el.closest('h1, h2, h3'));
  const contextScale = el.closest('.about')
    ? ABOUT_SCALE
    : el.closest('.display')
      ? HEADING_SCALE
      : 1;
  const sigmas = SIGMAS.map(
    (sigma) =>
      sigma *
      (radius / 6) *
      scale *
      BLUR_SCALE *
      contextScale *
      (headingOnPhone ? MOBILE_HEADING_SCALE : 1),
  );

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
    blockHeight,
    lineHeight,
    font,
    tracking,
    uppercase,
    dpr,
    sigmas,
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
  if (!nodes.length) return paintCanvas(el, config, 0, true);

  nodes.forEach((node, i) => paintCanvas(node, config, i * config.lineHeight));

  el.classList.add('is-grain');
  return true;
}

/**
 * The same paint as `renderElement`, but it yields a frame between lines. The
 * hero uses this so a low-power device can still animate the loader counter
 * while the canvases are being prepared.
 */
async function renderElementAsync(el) {
  const nodes = [...el.querySelectorAll('.ln__i')];
  const config = measureConfig(el);
  if (!config) return false;

  if (!nodes.length) {
    const painted = await paintCanvasAsync(el, config, 0, true);
    return painted && el.isConnected;
  }

  for (let i = 0; i < nodes.length; i += 1) {
    await paintCanvasAsync(nodes[i], config, i * config.lineHeight);
    // a resize re-splits the block, so the nodes captured above are gone: this
    // paint no longer describes the DOM and must not claim the element
    if (!nodes[i].isConnected) return false;
    if (i < nodes.length - 1) await nextFrame();
  }

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

// A large hero is several megapixels of blending; a hard budget per frame keeps
// the effect from ever becoming the reason the page drops a frame. Canvases are
// picked up by the next frame, so the whole block still lands on the target.
const FRAME_BUDGET = env().weak ? 4 : 8;

let queue = null;
let scrollingUntil = 0;
let scrollTimer = 0;

function tick() {
  rafId = 0;

  // While the page is scrolling the cursor is not the thing being read. Give
  // the frame back to the scroll and repaint once it settles.
  if (performance.now() < scrollingUntil) {
    queue = null;
    return;
  }

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
    if (canvas.isConnected) paint(cache.ctx, cache);
  }
  if (!queue.length) queue = null;

  if (moving || queue) rafId = requestAnimationFrame(tick);
}

function onPointerMove(event) {
  if (event.pointerType === 'touch') return;
  // relative to the screen, not the block: left/top are 0, right/bottom are 1
  targetX = clamp(event.clientX / window.innerWidth, 0, 1);
  targetY = clamp(event.clientY / window.innerHeight, 0, 1);
  if (performance.now() < scrollingUntil) return;
  if (!rafId) rafId = requestAnimationFrame(tick);
}

function onScroll() {
  scrollingUntil = performance.now() + 140;
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    scrollTimer = 0;
    if (rafId) return;
    if (
      Math.abs(targetX - pointerX) > 0.0015 ||
      Math.abs(targetY - pointerY) > 0.0015 ||
      queue
    ) {
      rafId = requestAnimationFrame(tick);
    }
  }, 150);
}

let pointerBound = false;

const rendered = new Set();
let observer = null;

/** Renders the hero at once, everything else shortly before it scrolls in. */
export async function initGrainText(selector = '[data-grain]') {
  const elements = [...document.querySelectorAll(selector)];
  if (!elements.length) return;

  // Without canvas letter-spacing the painted text would not match the DOM's
  // tracking and could clip at the line edge. Plain, crisp text is the better
  // fallback on those browsers.
  if (!supportsTracking()) return;

  if (observer) observer.disconnect();

  const heroElements = [];
  const otherElements = [];

  elements.forEach((el) => {
    if (el.closest('.hero')) heroElements.push(el);
    else otherElements.push(el);
  });

  // Anything already on screen is part of the first frame - the lab wordmark,
  // the 404 heading. It is painted before the curtain lifts, so plain text
  // never swaps to grain in front of the visitor.
  const onScreen = [];
  const below = [];
  otherElements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    (rect.bottom > 0 && rect.top < window.innerHeight ? onScreen : below).push(el);
  });

  for (const el of onScreen) {
    try {
      if (await renderElementAsync(el)) rendered.add(el);
    } catch (error) {
      console.error('[portfolio] grain', error);
    }
  }

  // Every other block keeps the effect, on phones too. It is painted only when
  // it is about to enter the viewport, off the idle queue, and the large
  // canvases are split across frames, so the design is unchanged without
  // spending the scroll budget on offscreen text.
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          // Deferred so a block entering during a scroll never blocks the
          // scroll itself. Lines are painted across frames for the same
          // reason: a 15-line paragraph must not become one 200ms task.
          whenIdle(async () => {
            try {
              if (await renderElementAsync(entry.target)) rendered.add(entry.target);
            } catch (error) {
              console.error('[portfolio] grain', error);
            }
          }, 500);
        });
      },
      { rootMargin: '400px 0px' },
    );

    below.forEach((el) => observer.observe(el));
  } else {
    below.forEach((el) => {
      try {
        if (renderElement(el)) rendered.add(el);
      } catch (error) {
        console.error('[portfolio] grain', error);
      }
    });
  }

  // The hero is painted before the curtain lifts, one line per frame, so the
  // loader never freezes behind a single long canvas task.
  for (const el of heroElements) {
    try {
      if (await renderElementAsync(el)) rendered.add(el);
    } catch (error) {
      console.error('[portfolio] grain', error);
    }
  }

  if (
    !pointerBound &&
    !prefersReducedMotion() &&
    isFinePointer() &&
    window.matchMedia(HOVER_FINE).matches
  ) {
    pointerBound = true;
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
  }
}

/** Re-renders the elements that already have a canvas (the DOM was re-split). */
export function renderGrainText() {
  rendered.forEach((el) => {
    try {
      if (renderElement(el)) return;
    } catch (error) {
      console.error('[portfolio] grain', error);
    }
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
