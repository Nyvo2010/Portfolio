import { reduced } from './reveal.js';

/** Share of the remaining distance covered each frame. Higher = tighter. */
const EASE = 0.16;
/** Below this many pixels the glide is over. */
const SETTLE = 0.4;

/**
 * A deliberately small wheel smoothing pass. Wheel deltas move a target and the
 * page eases towards it; nothing else is touched, so keyboard, the scrollbar,
 * touch and anchor jumps keep scrolling natively. Any of those cancel the glide
 * instead of fighting it.
 */
export function initSmoothScroll() {
  if (reduced()) return;
  if (window.matchMedia('(hover: none)').matches) return; // touch scrolls itself

  const root = document.documentElement;
  let target = window.scrollY;
  let current = window.scrollY;
  let frame = 0;

  const limit = () => Math.max(0, root.scrollHeight - window.innerHeight);
  const clamp = (value) => Math.min(limit(), Math.max(0, value));

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    current = target = window.scrollY;
  };

  const step = () => {
    const gap = target - current;
    current = Math.abs(gap) < SETTLE ? target : current + gap * EASE;
    // behaviour 'instant' so the page's own smooth-scroll cannot ease twice
    window.scrollTo({ top: current, behavior: 'instant' });

    if (Math.abs(target - current) < 0.5) {
      frame = 0;
      current = target;
    } else {
      frame = requestAnimationFrame(step);
    }
  };

  window.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || event.metaKey) return; // pinch zoom belongs to the browser
      const scale =
        event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? window.innerHeight : 1;
      event.preventDefault();
      target = clamp(target + event.deltaY * scale);
      if (!frame) frame = requestAnimationFrame(step);
    },
    { passive: false },
  );

  // anything that is not the wheel wins: keys, bar, momentum, anchor jumps
  window.addEventListener(
    'scroll',
    () => {
      if (!frame) current = target = window.scrollY;
    },
    { passive: true },
  );
  window.addEventListener('pointerdown', stop, { passive: true });
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('keydown', stop);
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('a[href^="#"]')) stop();
  });
}
