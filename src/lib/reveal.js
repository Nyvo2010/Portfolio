import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const timelines = new Map();

function buildTimeline(el) {
  const lines = [...el.querySelectorAll('.ln__i')];
  const count = lines.length;

  if (!count) return null;

  const timeline = gsap.timeline({ paused: true });
  gsap.set(lines, { yPercent: 55, opacity: 0 });

  for (let i = 0; i < count; i += 1) {
    timeline.to(lines[i], { yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out' }, i * 0.085);
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
      y: 24,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 94%', toggleActions: 'play reverse play reverse' },
    });
  });

  gsap.utils.toArray('[data-rows]').forEach((list) => {
    gsap.from(list.querySelectorAll('.row'), {
      y: 22,
      opacity: 0,
      duration: 0.85,
      stagger: 0.055,
      ease: 'power3.out',
      scrollTrigger: { trigger: list, start: 'top 88%', toggleActions: 'play reverse play reverse' },
    });
  });
}

export function heroIntro() {
  if (reduced()) {
    playHero();
    return;
  }

  playHero();
  const header = document.querySelector('.header__inner');
  if (header) {
    gsap.from(header, { opacity: 0, y: -10, duration: 0.9, ease: 'power2.out', delay: 0.35 });
  }
}
