import { gsap } from 'gsap';
import { DUR, EASE, LOAD } from '../lib/motion.js';
import { consumeArrival } from './page-transition.js';
import { prefersReducedMotion, wait } from '../lib/env.js';

/**
 * The lab's curtain. It counts the pieces in while they load (capped, so a slow
 * connection cannot hold the page hostage), then lifts on the same curve and
 * duration as every other page turn.
 */
export async function initLabLoader(onReveal, ready = Promise.resolve()) {
  const el = document.querySelector('[data-lab-loader]');
  // read before any await: the flag describes how this document was entered
  const arriving = consumeArrival();

  if (!el || prefersReducedMotion()) {
    if (el) el.remove();
    if (onReveal) await onReveal();
    return;
  }

  const count = el.querySelector('[data-lab-loader-count]');

  const update = (value) => {
    const progress = Math.min(1, Math.max(0, value));
    if (count) count.textContent = `${Math.round(progress * 100)}%`;
  };

  update(arriving ? 1 : 0);

  // The count is a short, eased climb rather than a number that jumps from 0
  // to 100 when the cache is warm. An arrival skips it: the number is already
  // at 100 and only the lift is left.
  const displayed = { value: 0 };
  const climb = arriving
    ? Promise.resolve()
    : new Promise((resolve) => {
        gsap.to(displayed, {
          value: LOAD.cap,
          duration: LOAD.count,
          // power3.out is the same cubic the inline counter uses
          ease: 'power3.out',
          onUpdate: () => update(displayed.value),
          onComplete: resolve,
        });
      });

  const fonts =
    document.fonts && document.fonts.ready
      ? Promise.race([document.fonts.ready, wait(1200)])
      : wait(0);

  // The plates do not exist yet when this module starts: the folder has to be
  // probed for dimensions first. The count covers that work, and the media wait
  // happens after it, otherwise a fast count would query nothing and the
  // curtain could lift onto an empty field.
  await Promise.all([climb, fonts, ready]);

  const images = [...document.querySelectorAll('.lab-item img')];
  const media = new Promise((resolve) => {
    if (!images.length) {
      resolve();
      return;
    }

    let remaining = images.length;
    const settle = () => {
      remaining -= 1;
      if (!remaining) resolve();
    };

    images.forEach((image) => {
      if (image.complete) settle();
      else {
        image.addEventListener('load', settle, { once: true });
        image.addEventListener('error', settle, { once: true });
      }
    });
  });

  // The media wait is capped in both directions: an arrival only needs a beat,
  // and a direct visit must never sit at the cap waiting for a slow image.
  await Promise.race([media, wait((arriving ? LOAD.arrivalMedia : LOAD.media) * 1000)]);

  if (arriving) {
    update(1);
    await wait(90);
  } else {
    await new Promise((resolve) => {
      gsap.to(displayed, {
        value: 1,
        duration: LOAD.tail,
        ease: 'power3.out',
        onUpdate: () => update(displayed.value),
        onComplete: resolve,
      });
    });
    await wait(LOAD.hold * 1000);
  }

  // The pieces arrive while the panel is still travelling, so the canvas is
  // already alive by the time the curtain clears instead of starting after it.
  // The reveal also paints any in-view text, so that work happens under the
  // curtain rather than in front of the visitor.
  if (onReveal) {
    try {
      await onReveal();
    } catch (error) {
      console.error('[lab] reveal', error);
    }
  }

  await new Promise((resolve) => {
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      resolve();
    };

    // An arrival dissolves the frame the previous page raised: sliding it up
    // again would read as the same gesture twice. A direct visit still gets the
    // curtain lifting off the canvas.
    gsap.to(
      el,
      arriving
        ? {
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
    window.setTimeout(end, 1200);
  });

  el.remove();
}
