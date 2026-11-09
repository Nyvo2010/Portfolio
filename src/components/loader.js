import { gsap } from 'gsap';
import { DUR, EASE } from '../lib/motion.js';
import { prefersReducedMotion, wait, nextFrame } from '../lib/env.js';

/** Longest the curtain may stay after the fonts/layout are ready. */
const MIN_VISIBLE = 420;

/**
 * Resolves once the curtain has gone. `onLift` fires the moment it starts
 * moving, so the intro plays out from under it instead of after it.
 *
 * This deliberately does not wait for `window.load` or the portrait image any
 * more. Those made the curtain sit at 90% while the network was busy, and a
 * single stalled image could hold the whole page hostage. The inline failsafe
 * in index.html removes the curtain even if this module never runs.
 */
export async function initLoader(onLift) {
  const el = document.querySelector('[data-loader]');

  let lifted = false;
  const lift = () => {
    if (lifted) return;
    lifted = true;
    try {
      if (onLift) onLift();
    } catch (error) {
      console.error('[portfolio] intro', error);
    }
  };

  const finish = () => {
    try {
      if (typeof window.__loaderFinish === 'function') window.__loaderFinish();
    } catch {
      /* the inline fallback owns the element now */
    }
  };

  if (!el) {
    lift();
    return;
  }

  if (prefersReducedMotion()) {
    finish();
    lift();
    el.remove();
    return;
  }

  try {
    // One paint first, so the curtain lifts onto a laid-out page.
    await nextFrame();
    await wait(MIN_VISIBLE);
    finish();
    await wait(120);

    await new Promise((resolve) => {
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        resolve();
      };

      lift();
      try {
        gsap.to(el, {
          yPercent: -100,
          duration: DUR.large,
          ease: EASE.inOut,
          onComplete: end,
        });
      } catch {
        end();
      }
      // never let a stalled tween hold the page hostage
      setTimeout(end, 1200);
    });
  } finally {
    // `finally` also covers a throw from GSAP, a lost frame, or a tab that was
    // backgrounded mid-lift: the page is never left behind a fixed curtain.
    finish();
    lift();
    el.remove();
  }
}
