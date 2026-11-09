import manifest from 'virtual:lab-manifest';

/**
 * The lab is a folder, not a list. The build exposes every image in
 * public/assets/lab, and each piece's slug, alt text, ratio and cut-out state
 * are derived from the file itself. Adding or deleting an image is the whole
 * workflow: there is no entry to add, duplicate or leave empty.
 */

const EXTENSION = /\.[^.]+$/;

const humanize = (slug) =>
  slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const slugOf = (src) => src.split('/').pop().replace(EXTENSION, '');

/** Natural size, plus a cheap alpha probe so a cut-out gets no plate. */
function readMeta(src) {
  return new Promise((resolve) => {
    const probe = new Image();
    probe.decoding = 'async';

    probe.onload = () => {
      let transparent = false;

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(probe, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 250) {
            transparent = true;
            break;
          }
        }
      } catch {
        /* an unreadable canvas still gets its normal plate */
      }

      resolve({
        w: probe.naturalWidth || 1200,
        h: probe.naturalHeight || 1200,
        transparent,
      });
    };

    probe.onerror = () => resolve({ w: 1200, h: 1200, transparent: false });
    probe.src = src;
  });
}

const pieces = new Map();
let all = null;

function pieceFor(src) {
  if (!pieces.has(src)) {
    pieces.set(
      src,
      readMeta(src).then((meta) => {
        const slug = slugOf(src);
        return { slug, src, alt: humanize(slug), ...meta };
      }),
    );
  }
  return pieces.get(src);
}

/** Every image in the lab folder, in filename order. */
export function getLabPieces() {
  if (!all) all = Promise.all(manifest.map(pieceFor));
  return all;
}

/** Only the named pieces, in the order given (the homepage teaser). */
export function getLabPiecesBySlug(slugs) {
  const bySlug = new Map(manifest.map((src) => [slugOf(src), src]));
  const srcs = slugs.map((slug) => bySlug.get(slug)).filter(Boolean);
  return Promise.all(srcs.map(pieceFor));
}
