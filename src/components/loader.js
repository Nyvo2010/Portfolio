import { gsap } from 'gsap';
import { DUR, EASE } from '../lib/motion.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves once the curtain has gone. `onLift` fires the moment it starts
 * moving, so the intro plays out from under it instead of after it.
 */
export function initLoader(onLift) {
  const el = document.querySelector('[data-loader]');
  if (!el) return Promise.resolve();

  const finish = () => {
    if (typeof window.__loaderFinish === 'function') window.__loaderFinish();
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finish();
    el.remove();
    if (onLift) onLift();
    return Promise.resolve();
  }

  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const loaded = new Promise((resolve) => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve, { once: true });
  });
  const portrait = document.querySelector('.about__portrait img');
  const image = portrait && portrait.decode ? portrait.decode().catch(() => {}) : Promise.resolve();

  return Promise.race([Promise.all([fonts, loaded, image]), wait(2400)])
    .then(() => {
      finish();
      return wait(140);
    })
    .then(
      () =>
        new Promise((resolve) => {
          if (onLift) onLift();
          gsap.to(el, {
            yPercent: -100,
            duration: DUR.large,
            ease: EASE.inOut,
            onComplete: resolve,
          });
          // never let a stalled tween hold the page hostage
          setTimeout(resolve, 1400);
        }),
    )
    .then(() => {
      el.remove();
      return wait(40);
    });
}
