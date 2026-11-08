import { gsap } from 'gsap';
import { DUR, EASE, forTravel } from '../lib/motion.js';

/** Full screen menu for touch and small screens. */
export function initMenu() {
  const root = document.querySelector('[data-menu]');
  const toggle = document.querySelector('[data-menu-toggle]');
  if (!root || !toggle) return;

  const items = [...root.querySelectorAll('.menu__nav a')];
  const foot = root.querySelector('.menu__foot');
  let open = false;
  let busy = false;

  const timeline = gsap.timeline({
    paused: true,
    onStart: () => {
      busy = true;
      root.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      document.documentElement.style.overflow = 'hidden';
    },
    onReverseComplete: () => {
      busy = false;
      root.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Menu');
      document.documentElement.style.overflow = '';
    },
    onComplete: () => {
      busy = false;
    },
  });

  timeline
    .to(root, { autoAlpha: 1, duration: DUR.slow, ease: EASE.inOut })
    .from(
      items,
      { yPercent: 118, opacity: 0, duration: DUR.large, stagger: 0.05, ease: EASE.out },
      0.05,
    )
    .from(foot, { opacity: 0, y: 18, duration: forTravel(18), ease: EASE.out }, 0.25);

  const setState = (next) => {
    if (busy || next === open) return;
    open = next;
    // the exit is a touch quicker than the entrance: the choice is already made
    if (open) timeline.timeScale(1).play();
    else timeline.timeScale(1.6).reverse();
  };

  toggle.addEventListener('click', () => setState(!open));

  root.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setState(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) setState(false);
  });

  window.matchMedia('(min-width: 861px)').addEventListener('change', (event) => {
    if (event.matches && open) {
      timeline.progress(0).pause();
      open = false;
      busy = false;
      root.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Menu');
      document.documentElement.style.overflow = '';
    }
  });
}
