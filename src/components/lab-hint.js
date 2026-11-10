import { labHome } from '../data.js';
import { getLabPiecesBySlug } from '../lib/lab-pieces.js';
import { onLayout } from '../lib/layout.js';

/**
 * Five overlapping plates on the homepage. The slots are fixed so the cluster
 * always reads as designed, and the pieces fill them in the order listed in
 * labHome: cmd-z, drone, avatar 3d, sour first instinct, betonbouw hero.
 */
const COUNT = 5;
const SLOT_WIDTHS = [27, 22, 23, 29, 27];

/** Keeps a very tall piece inside the cluster frame without cropping it. */
const widthFor = (item, base) => Math.min(base, 43 * (item.w / item.h));

export async function initLabHint() {
  const cluster = document.querySelector('[data-lab-cluster]');
  if (!cluster) return;

  let ordered = [];
  try {
    ordered = (await getLabPiecesBySlug(labHome)).slice(0, COUNT);
  } catch (error) {
    console.error('[portfolio] lab hint', error);
    return;
  }
  if (!ordered.length) return;

  cluster.innerHTML = ordered
    .map((item, index) => {
      const width = widthFor(item, SLOT_WIDTHS[index] || 27).toFixed(2);
      return `<a
        class="lab-card lab-card--${index + 1}${item.transparent ? ' lab-card--contain' : ''}"
        href="/labs/?item=${encodeURIComponent(item.slug)}"
        aria-label="Open ${item.alt} in the lab"
        data-index="${index}"
        style="--w:${width}; aspect-ratio:${item.w} / ${item.h}"
      >
        <img
          src="${item.src}"
          alt="${item.alt}"
          width="${item.w}"
          height="${item.h}"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
      </a>`;
    })
    .join('');

  const cards = [...cluster.querySelectorAll('.lab-card')];
  const copy = cluster.closest('.lab-hint');
  const heading = copy && copy.querySelector('.lab-hint__title h2');
  const desc = copy && copy.querySelector('.lab-hint__desc');

  // Where each plate sits vertically inside the copy's band, high to low. The
  // band runs from the top of the heading to the bottom of the body copy, so
  // no plate can cross either line however the viewport is sized.
  const BAND_FRACTIONS = [0.2, 0.9, 0.38, 0.72, 0.06];
  const MAX_HEIGHT_SHARE = 0.88;

  cards.forEach((card) => {
    card.dataset.w = card.style.getPropertyValue('--w');
  });

  // Layout position, ignoring reveal transforms: the band must not be measured
  // while the section is mid-animation.
  const layoutTop = (el) => {
    let top = 0;
    for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  };

  function placeCards() {
    if (!heading || !desc) return;

    // On a phone the cluster sits below the copy instead of beside it, so the
    // band does not exist and the plates keep their centred positions.
    if (window.matchMedia('(max-width: 860px)').matches) {
      cards.forEach((card) => {
        card.style.removeProperty('--y');
        card.style.setProperty('--w', card.dataset.w);
      });
      return;
    }

    const clusterTop = layoutTop(cluster);
    const bandTop = layoutTop(heading) - clusterTop;
    const bandBottom = layoutTop(desc) + desc.offsetHeight - clusterTop;
    const bandHeight = bandBottom - bandTop;
    if (bandHeight <= 0) return;

    cards.forEach((card, index) => {
      card.style.setProperty('--w', card.dataset.w);

      // A plate taller than the band can never fit, so tighten its width until
      // it leaves room to be moved as well.
      const baseHeight = card.offsetHeight;
      const maxHeight = bandHeight * MAX_HEIGHT_SHARE;
      if (baseHeight > maxHeight) {
        const width = Number(card.dataset.w);
        card.style.setProperty('--w', (width * (maxHeight / baseHeight)).toFixed(2));
      }

      const height = card.offsetHeight;
      const min = bandTop + height / 2;
      const max = bandBottom - height / 2;
      const fraction = BAND_FRACTIONS[index] ?? 0.5;
      const centre = min + (max - min) * fraction;

      // The card's centre sits at half the cluster plus --y.
      card.style.setProperty('--y', `${(centre - cluster.offsetHeight / 2).toFixed(1)}px`);
    });
  }

  placeCards();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(placeCards).catch(() => {});
  }

  onLayout(placeCards);

  const clear = () => {
    cluster.classList.remove('is-hovering');
    cards.forEach((card) => {
      card.classList.remove('is-active');
      card.style.removeProperty('--push');
    });
  };

  // The raised plate comes forward; every other plate slides a little away
  // from it, so the cluster opens up around the pointer instead of just
  // stacking one image on top.
  const activate = (card) => {
    const active = Number(card.dataset.index);
    cluster.classList.add('is-hovering');
    cards.forEach((other, index) => {
      other.classList.toggle('is-active', index === active);
      other.style.setProperty('--push', `${Math.sign(index - active) * 12}px`);
    });
  };

  cards.forEach((card) => {
    card.addEventListener('pointerenter', () => activate(card));
    card.addEventListener('focus', () => activate(card));
  });

  cluster.addEventListener('pointerleave', clear);
  cluster.addEventListener('focusout', (event) => {
    if (!cluster.contains(event.relatedTarget)) clear();
  });
}
