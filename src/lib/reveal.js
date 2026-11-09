import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DUR, DIST, EASE, STAGGER, forTravel } from './motion.js';

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const timelines = new Map();

function buildTimeline(el) {
  const lines = [...el.querySelectorAll('.ln__i')];
  const count = lines.length;

  if (!count) return null;

  const timeline = gsap.timeline({ paused: true });
  gsap.set(lines, { yPercent: DIST.line, opacity: 0 });

  for (let i = 0; i < count; i += 1) {
    timeline.to(
      lines[i],
      { yPercent: 0, opacity: 1, duration: DUR.large, ease: EASE.out },
      i * STAGGER.line,
    );
  }

  timelines.set(el, timeline);
  return timeline;
}

/** Each line rises after the previous one, on scroll. */
export function lineReveals() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    const timeline = buildTimeline(el);
    if (!timeline) return;

    if (reduced()) {
      timeline.progress(1);
      return;
    }

    // the hero is played by heroIntro once the curtain lifts, never on scroll
    if (el.hasAttribute('data-intro') || el.closest('.hero')) return;

    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      // every pass replays: lines rise as the block arrives, run back out as it
      // leaves, from whichever direction it is entered
      toggleActions: 'play reverse play reverse',
      animation: timeline,
    });
  });
}

/** Hero lines, played once the loader starts lifting. */
export function playHero() {
  const el = document.querySelector('.hero [data-split]');
  const timeline = el && timelines.get(el);
  if (!timeline) return;
  if (timeline.progress() === 0 && !timeline.isActive()) timeline.play();
}

/** Everything smaller fades and rises. */
export function softReveals() {
  if (reduced()) return;

  gsap.utils.toArray('[data-rise]').forEach((el) => {
    if (el.closest('[data-split]')) return;
    gsap.from(el, {
      y: DIST.rise,
      opacity: 0,
      duration: forTravel(DIST.rise),
      ease: EASE.out,
      scrollTrigger: { trigger: el, start: 'top 94%', toggleActions: 'play reverse play reverse' },
    });
  });

  gsap.utils.toArray('[data-rows]').forEach((list) => {
    gsap.from(list.querySelectorAll('.row'), {
      y: DIST.row,
      opacity: 0,
      duration: forTravel(DIST.row),
      stagger: STAGGER.row,
      ease: EASE.out,
      scrollTrigger: { trigger: list, start: 'top 88%', toggleActions: 'play reverse play reverse' },
    });
  });
}

/**
 * The header arrives with the first frame after a curtain, on every page and
 * on the same curve, so the homepage intro and the lab intro are one gesture.
 */
export function introHeader() {
  if (reduced()) return;
  const header = document.querySelector('.header__inner');
  if (!header) return;

  gsap.fromTo(
    header,
    { opacity: 0, y: -DIST.header },
    {
      opacity: 1,
      y: 0,
      duration: forTravel(DIST.header),
      ease: EASE.out,
      delay: DUR.fast,
    },
  );
}

export function heroIntro() {
  if (reduced()) {
    playHero();
    return;
  }

  playHero();
  introHeader();
}
