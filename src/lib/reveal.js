import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DUR, DIST, EASE, STAGGER, forTravel } from './motion.js';

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const timelines = new Map();
const lineTriggers = [];
let heroPlayed = false;

function buildTimeline(el) {
  const lines = [...el.querySelectorAll('.ln__i')];
  if (!lines.length) return null;

  const timeline = gsap.timeline({ paused: true });
  gsap.set(lines, { yPercent: DIST.line, opacity: 0 });

  lines.forEach((line, index) => {
    timeline.to(
      line,
      { yPercent: 0, opacity: 1, duration: DUR.large, ease: EASE.out },
      index * STAGGER.line,
    );
  });

  timelines.set(el, timeline);
  return timeline;
}

function clearLineTriggers() {
  lineTriggers.forEach((trigger) => trigger.kill());
  lineTriggers.length = 0;
  timelines.forEach((timeline) => timeline.kill());
  timelines.clear();
}

/**
 * Each line rises after the previous one, on scroll.
 *
 * The timelines hold the line elements they were built from, so they are
 * rebuilt whenever the type is re-split (boot, resize, a late font). Without
 * that, the old timeline kept animating detached nodes and the new lines never
 * played at all.
 */
export function lineReveals() {
  clearLineTriggers();

  document.querySelectorAll('[data-split]').forEach((el) => {
    const timeline = buildTimeline(el);
    if (!timeline) return;

    // the hero is played by heroIntro once the curtain lifts, never on scroll
    if (el.closest('.hero')) {
      timeline.progress(heroPlayed || reduced() ? 1 : 0);
      return;
    }

    if (reduced()) {
      timeline.progress(1);
      return;
    }

    // already in the reading zone after a relayout: show it now rather than
    // wait for a trigger that refresh does not replay
    const shown = el.getBoundingClientRect().top < window.innerHeight * 0.92;
    timeline.progress(shown ? 1 : 0);

    lineTriggers.push(
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        // every pass replays: lines rise as the block arrives, run back out as
        // it leaves, from whichever direction it is entered
        toggleActions: 'play reverse play reverse',
        animation: timeline,
      }),
    );
  });
}

/** Hero lines, played once the loader starts lifting. */
export function playHero() {
  heroPlayed = true;
  const el = document.querySelector('.hero [data-split]');
  const timeline = el && timelines.get(el);
  if (!timeline) return;
  if (reduced()) timeline.progress(1);
  else if (timeline.progress() === 0 && !timeline.isActive()) timeline.play();
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
