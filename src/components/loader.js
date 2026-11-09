import { gsap } from 'gsap';
import { DUR, EASE, LOAD } from '../lib/motion.js';
import { consumeArrival } from './page-transition.js';
import { prefersReducedMotion, wait, nextFrame } from '../lib/env.js';

/** Longest the curtain stays for its own sake, counted from navigation start. */
const MIN_VISIBLE = 420;

/**
 * Resolves once the curtain has gone. `onLift` fires the moment it starts
 * moving, so the intro plays out from under it instead of after it.
 *
 * This deliberately does not wait for `window.load` or the portrait image.
 * Those made the curtain sit while the network was busy, and a single stalled
 * image could hold the whole page hostage. The inline failsafe in index.html
 * removes the curtain even if this module never runs.
 */
export async function initLoader(onLift) {
  const el = document.querySelector('[data-loader]');
  // read before any await: the flag describes how this document was entered
  const arriving = consumeArrival();

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

    if (arriving) {
      // the previous page already read 100% while it handed over: only the
      // dissolve is left, never a second count from zero
      finish();
      await nextFrame();
    } else {
      await wait(Math.max(0, MIN_VISIBLE - performance.now()));
      finish();
      await wait((LOAD.tail + LOAD.hold) * 1000);
    }

    await new Promise((resolve) => {
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        resolve();
      };

      lift();
      try {
        gsap.to(
          el,
          arriving
            ? {
                // an arrival dissolves the frame the previous page raised;
                // sliding it again would read as the same gesture twice
                autoAlpha: 0,
                scale: 1.02,
                transformOrigin: '50% 50%',
                duration: DUR.large,
                ease: EASE.inOut,
                onComplete: end,
              }
            : {
                yPercent: -100,
                duration: DUR.large,
                ease: EASE.inOut,
                onComplete: end,
              },
        );
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
