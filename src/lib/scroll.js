import { env, prefersReducedMotion } from './env.js';

export function initSmoothScroll() {
  if (prefersReducedMotion() || env().touch) return;

  const root = document.documentElement;
  let wheelTimer = 0;

  // CSS-based approach: briefly enable smooth scroll only for the wheel delta,
  // then immediately return to auto. This lets the browser's native
  // interpolation handle the tiny easing - far lighter than any JS loop.
  window.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || event.metaKey) return;
      if (event.defaultPrevented) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

      root.style.scrollBehavior = 'smooth';
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        root.style.scrollBehavior = 'auto';
      }, 120); // only the immediate wheel gesture gets smoothed
    },
    { passive: true }, // do NOT preventDefault - let browser scroll natively
  );

  // Anchor links get native smooth scroll
  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const anchor = document.querySelector(href);
    if (!anchor) return;

    event.preventDefault();
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (history.pushState) history.pushState(null, '', href);
  });
}
