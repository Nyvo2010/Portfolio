import { gsap } from 'gsap';
import { DUR, EASE, STAGGER } from '../lib/motion.js';
import { onMediaChange, prefersReducedMotion } from '../lib/env.js';

/** Full screen menu for touch and small screens. */
export function initMenu() {
  const root = document.querySelector('[data-menu]');
  const toggle = document.querySelector('[data-menu-toggle]');
  if (!root || !toggle) return;

  const items = [...root.querySelectorAll('.menu__nav a')];
  const foot = root.querySelector('.menu__foot');
  const reduced = prefersReducedMotion();
  let open = false;

  // Locking both boxes keeps iOS from scrolling the page behind the overlay.
  const lockPage = (locked) => {
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    document.body.style.overflow = locked ? 'hidden' : '';
    document.body.style.touchAction = locked ? 'none' : '';
  };

  const timeline = gsap.timeline({
    paused: true,
    onReverseComplete: () => {
      // grabbed again mid-close: the menu is still on its way back in
      if (open) return;
      root.setAttribute('aria-hidden', 'true');
      lockPage(false);
    },
  });

  // fromTo throughout, so a half-played close can run forwards again without a
  // jump and both ends of the timeline are the same in either direction.
  timeline
    .to(root, { autoAlpha: 1, duration: DUR.base, ease: EASE.out })
    .fromTo(
      items,
      { yPercent: 112, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: DUR.slow, stagger: STAGGER.menu, ease: EASE.out },
      DUR.fast,
    )
    .fromTo(
      foot,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: DUR.base, ease: EASE.out },
      DUR.fast + STAGGER.menu * items.length,
    );

  const setState = (next) => {
    if (next === open) return;
    open = next;

    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    root.setAttribute('aria-hidden', String(!open));

    if (open) {
      lockPage(true);
      if (reduced) timeline.progress(1).pause();
      else timeline.play();
      return;
    }

    if (reduced) {
      timeline.progress(0).pause();
      root.setAttribute('aria-hidden', 'true');
      lockPage(false);
      return;
    }

    // the exit is the same gesture run backwards, never a faster second one
    timeline.reverse();
  };

  toggle.addEventListener('click', () => setState(!open));

  root.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setState(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) setState(false);
  });

  onMediaChange('(min-width: 861px)', (event) => {
    if (!event.matches || !open) return;
    timeline.progress(0).pause();
    open = false;
    root.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menu');
    lockPage(false);
  });
}
