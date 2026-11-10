/**
 * Grain + progressive blur for images.
 *
 * The headings paint their glyph alpha through a few cached blur levels, ramped
 * exponentially into the bottom-right, with grain eroded into the partial-alpha
 * edges. This is the same effect for a photograph: the image is drawn into a
 * canvas that is padded on every side, so the blur has room to bleed past the
 * picture's own edges instead of being cut off at them.
 *
 * Colour is handled premultiplied while sampling and un-premultiplied on the
 * way out, so a translucent bleed darkens nothing. Grain is applied twice: the
 * same alpha erosion the headings use, which roughens the soft bleed edge, and
 * a light luminance grain over the picture itself.
 *
 * The paint is one-time and off the idle queue, so the effect costs nothing per
 * frame. It repaints only when the picture's rendered width changes.
 */

import {
  SIGMAS,
  BLUR_SCALE,
  GRAIN,
  GRAIN_AMOUNT,
  REFERENCE_WIDTH,
} from './grain-text.js';
import { paintPause, whenIdle, whenScrollSettled } from './env.js';
import { onLayout } from './layout.js';

// Same steep landing as the text curve; the picture keeps a slightly longer
// flat middle (RAMP_START) so the subject stays in focus.
const CURVE = 4.2;
const DEAD = 0.03; // dead zone keeps the sharp corner properly sharp
const CURVE_DENOM = Math.exp(CURVE) - 1;
const RAMP_SPREAD = (1 / (1 - DEAD)) * 255;
/** Centre of the picture that stays sharp; a line of type is wide enough that
 *  the unmodified ramp reads sharp, a photo is not. */
const RAMP_START = 0.38;
/** Luminance grain over the picture, in 0..255 levels at full coverage. */
const LUMINANCE_GRAIN = 16;
const CHUNK_PIXELS = 120000;

const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);
const curve = (value) => (Math.exp(CURVE * value) - 1) / CURVE_DENOM;
const ramp = (value) =>
  curve(clamp((value - RAMP_START) / (1 - RAMP_START), 0, 1));

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

/* ---------- blur ---------- */

function boxPass(src, dst, w, h, r, horizontal) {
  const inv = 1 / (2 * r + 1);

  if (horizontal) {
    for (let y = 0; y < h; y += 1) {
      const row = y * w;
      for (let c = 0; c < 4; c += 1) {
        let acc = 0;
        for (let k = -r; k <= r; k += 1) {
          const x = k < 0 ? 0 : k >= w ? w - 1 : k;
          acc += src[(row + x) * 4 + c];
        }
        dst[row * 4 + c] = (acc * inv + 0.5) | 0;
        for (let x = 1; x < w; x += 1) {
          const add = x + r < w ? x + r : w - 1;
          const sub = x - r - 1 > 0 ? x - r - 1 : 0;
          acc += src[(row + add) * 4 + c] - src[(row + sub) * 4 + c];
          dst[(row + x) * 4 + c] = (acc * inv + 0.5) | 0;
        }
      }
    }
    return;
  }

  for (let x = 0; x < w; x += 1) {
    for (let c = 0; c < 4; c += 1) {
      let acc = 0;
      for (let k = -r; k <= r; k += 1) {
        const y = k < 0 ? 0 : k >= h ? h - 1 : k;
        acc += src[(y * w + x) * 4 + c];
      }
      dst[x * 4 + c] = (acc * inv + 0.5) | 0;
      for (let y = 1; y < h; y += 1) {
        const add = y + r < h ? y + r : h - 1;
        const sub = y - r - 1 > 0 ? y - r - 1 : 0;
        acc += src[(add * w + x) * 4 + c] - src[(sub * w + x) * 4 + c];
        dst[(y * w + x) * 4 + c] = (acc * inv + 0.5) | 0;
      }
    }
  }
}

function blurRgba(src, w, h, sigma) {
  const r = Math.round(sigma);
  if (r < 1) return src.slice();

  let a = src.slice();
  const b = new Uint8ClampedArray(src.length);
  for (let i = 0; i < 3; i += 1) {
    boxPass(a, b, w, h, r, true);
    boxPass(b, a, w, h, r, false);
  }
  return a;
}

function downsampleRgba(src, w, h, dw, dh) {
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y += 1) {
    const sy = y * 2 < h ? y * 2 : h - 1;
    const sy2 = sy + 1 < h ? sy + 1 : sy;
    const row = y * dw;
    for (let x = 0; x < dw; x += 1) {
      const sx = x * 2 < w ? x * 2 : w - 1;
      const sx2 = sx + 1 < w ? sx + 1 : sx;
      const i0 = (sy * w + sx) * 4;
      const i1 = (sy * w + sx2) * 4;
      const i2 = (sy2 * w + sx) * 4;
      const i3 = (sy2 * w + sx2) * 4;
      const o = (row + x) * 4;
      out[o] = (src[i0] + src[i1] + src[i2] + src[i3]) >> 2;
      out[o + 1] = (src[i0 + 1] + src[i1 + 1] + src[i2 + 1] + src[i3 + 1]) >> 2;
      out[o + 2] = (src[i0 + 2] + src[i1 + 2] + src[i2 + 2] + src[i3 + 2]) >> 2;
      out[o + 3] = (src[i0 + 3] + src[i1 + 3] + src[i2 + 3] + src[i3 + 3]) >> 2;
    }
  }
  return out;
}

/* ---------- paint ---------- */

/** Newest paint wins: a resize mid-paint must not put the old width back. */
let paintToken = 0;

async function paint(figure) {
  const token = ++paintToken;
  const img = figure.querySelector('img');
  if (!img || !img.naturalWidth) return false;

  const box = img.getBoundingClientRect();
  if (box.width < 2 || box.height < 2) return false;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.max(1, Math.round(box.width * dpr));
  const H = Math.max(1, Math.round(box.height * dpr));

  const radius = parseFloat(figure.dataset.grainImage) || 6;
  const scale = (document.documentElement.clientWidth * dpr) / REFERENCE_WIDTH;
  const sigmas = SIGMAS.map((sigma) => sigma * (radius / 6) * scale * BLUR_SCALE);

  // enough room for the widest blur to spread without a hard canvas edge
  const pad = Math.ceil((Math.max(...sigmas) * 3 + 4) / dpr) * dpr;
  const cw = W + pad * 2;
  const ch = H + pad * 2;

  let canvas = figure.querySelector('.grain__c');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'grain__c';
    canvas.setAttribute('aria-hidden', 'true');
    figure.appendChild(canvas);
  }
  canvas.width = cw;
  canvas.height = ch;
  canvas.style.left = `${-pad / dpr}px`;
  canvas.style.top = `${-pad / dpr}px`;
  canvas.style.width = `${cw / dpr}px`;
  canvas.style.height = `${ch / dpr}px`;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, cw, ch);

  // object-fit: cover, clipped to the picture's own box so the pad stays empty
  // for the blur to bleed into
  const ratio = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const dw = img.naturalWidth * ratio;
  const dh = img.naturalHeight * ratio;
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad, pad, W, H);
  ctx.clip();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, pad + (W - dw) / 2, pad + (H - dh) / 2, dw, dh);
  ctx.restore();

  const source = ctx.getImageData(0, 0, cw, ch).data;

  // premultiplied, so blurring across the transparent pad does not pull the
  // colours towards black. Chunked: the whole picture in one task was the
  // longest block this effect produced, and it was easy to feel on scroll.
  const premultiplied = new Uint8ClampedArray(source.length);
  const preRows = Math.max(1, Math.floor(CHUNK_PIXELS / Math.max(1, cw)));
  for (let y0 = 0; y0 < ch; y0 += preRows) {
    const y1 = Math.min(ch, y0 + preRows);
    for (let i = y0 * cw * 4; i < y1 * cw * 4; i += 4) {
      const alpha = source[i + 3];
      premultiplied[i] = (source[i] * alpha) / 255;
      premultiplied[i + 1] = (source[i + 1] * alpha) / 255;
      premultiplied[i + 2] = (source[i + 2] * alpha) / 255;
      premultiplied[i + 3] = alpha;
    }
    await paintPause();
    if (token !== paintToken) return false;
  }

  // the levels are smooth, so they are blurred at half resolution and sampled
  // from there; only the sharp base stays at full resolution
  const hw = Math.max(1, (cw + 1) >> 1);
  const hh = Math.max(1, (ch + 1) >> 1);
  const half = downsampleRgba(premultiplied, cw, ch, hw, hh);

  const levels = new Array(sigmas.length);
  levels[0] = premultiplied;
  for (let i = 1; i < sigmas.length; i += 1) {
    levels[i] = blurRgba(half, hw, hh, Math.max(0.6, sigmas[i] * 0.5));
    // one level per frame instead of every level in one long task
    if (i < sigmas.length - 1) await paintPause();
    if (token !== paintToken) return false;
  }

  const out = new ImageData(cw, ch);
  const pixels = new Uint32Array(out.data.buffer);
  const noise = buildNoise(cw * ch);

  // one lookup per q instead of a division per pixel
  const top = levels.length - 1;
  const lowerLut = new Uint8Array(256);
  const mixLut = new Float32Array(256);
  for (let q = 0; q < 256; q += 1) {
    const f = (q / 255) * top;
    let lower = f | 0;
    if (lower >= top) lower = top - 1;
    lowerLut[q] = lower;
    mixLut[q] = f - lower;
  }

  // the same near ramp as the headings at rest - sharp top-left into a soft
  // bottom-right - but with a flat middle so the subject stays in focus
  const columns = new Float32Array(cw);
  for (let x = 0; x < cw; x += 1) {
    columns[x] = 0.65 * ramp((x - pad) / W);
  }

  const rows = Math.max(1, Math.floor(CHUNK_PIXELS / Math.max(1, cw)));
  for (let y0 = 0; y0 < ch; y0 += rows) {
    const y1 = Math.min(ch, y0 + rows);

    for (let y = y0; y < y1; y += 1) {
      const down = 0.35 * ramp((y - pad) / H);
      const hiRow = Math.min(hh - 1, y >> 1) * hw;

      for (let x = 0; x < cw; x += 1) {
        const i = y * cw + x;
        const q = clamp((columns[x] + down - DEAD) * RAMP_SPREAD, 0, 255) | 0;
        const lower = lowerLut[q];
        const mix = mixLut[q];
        const inv = 1 - mix;

        // the blurred levels are half resolution; the base is the sharp one
        let ar;
        let ag;
        let ab;
        let aa;
        if (lower === 0) {
          const base = i * 4;
          ar = premultiplied[base];
          ag = premultiplied[base + 1];
          ab = premultiplied[base + 2];
          aa = premultiplied[base + 3];
        } else {
          const base = (hiRow + (x >> 1)) * 4;
          const level = levels[lower];
          ar = level[base];
          ag = level[base + 1];
          ab = level[base + 2];
          aa = level[base + 3];
        }

        const blurred = lower + 1;
        const b4 = (hiRow + (x >> 1)) * 4;
        const level = levels[blurred];
        const br = level[b4];
        const bg = level[b4 + 1];
        const bb = level[b4 + 2];
        const ba = level[b4 + 3];

        const pr = ar * inv + br * mix;
        const pg = ag * inv + bg * mix;
        const pb = ab * inv + bb * mix;
        const pa = aa * inv + ba * mix;

        if (pa < 0.5) {
          pixels[i] = 0;
          continue;
        }

        const n = noise[i];
        let a = pa;

        // the heading texture: grain eroded into the partial-alpha edge
        if (pa < 252) {
          const af = pa / 255;
          const grain = clamp((af - n / 255) * GRAIN + 0.5, 0, 1);
          a = (af + (grain - af) * GRAIN_AMOUNT) * 255;
        }

        // un-premultiply, then a light film grain over the picture
        const k = 255 / pa;
        const d = ((n / 255 - 0.5) * LUMINANCE_GRAIN * pa) / 255;
        const r = clamp(pr * k + d, 0, 255) | 0;
        const g = clamp(pg * k + d, 0, 255) | 0;
        const bl = clamp(pb * k + d, 0, 255) | 0;
        const al = clamp(a, 0, 255) | 0;

        pixels[i] = (al << 24) | (bl << 16) | (g << 8) | r;
      }
    }

    await paintPause();
    if (token !== paintToken) return false;
  }

  ctx.putImageData(out, 0, 0);
  figure.classList.add('is-grain-image');
  return true;
}

/**
 * Paints on approach, repaints when the picture's rendered width changes.
 * The original image stays in the document (transparent once painted) for
 * semantics, selection and the no-JS path.
 */
export function initGrainImages(selector = '[data-grain-image]') {
  const figures = [...document.querySelectorAll(selector)];
  if (!figures.length) return;

  const painted = new Map();
  // figures whose paint has been requested, finished or still in flight
  const requested = new Set();
  const io =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              io.unobserve(entry.target);
              const img = entry.target.querySelector('img');
              const run = () =>
                whenIdle(() => {
                  // the picture is still offscreen; do not paint over a scroll
                  whenScrollSettled(() => {
                    requested.add(entry.target);
                    paint(entry.target)
                      .then((done) => {
                        if (done) painted.set(entry.target, entry.target.getBoundingClientRect().width);
                      })
                      .catch((error) => console.error('[portfolio] grain image', error));
                  });
                }, 600);

              if (!img) return;
              if (img.complete && img.naturalWidth) run();
              else img.addEventListener('load', run, { once: true });
            });
          },
          { rootMargin: '600px 0px' },
        )
      : null;

  if (io) figures.forEach((figure) => io.observe(figure));

  onLayout(() => {
    requested.forEach((figure) => {
      if (!figure.isConnected) {
        requested.delete(figure);
        painted.delete(figure);
        return;
      }
      const next = figure.getBoundingClientRect().width;
      if (Math.abs(next - (painted.get(figure) ?? -1)) < 0.5) return;
      paint(figure)
        .then((done) => {
          if (done) painted.set(figure, next);
        })
        .catch((error) => console.error('[portfolio] grain image', error));
    });
  });
}
