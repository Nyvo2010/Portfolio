import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reduced } from './reveal.js';

/** Pixels of blur while a block is fully out of the reading zone. */
const EDGE = 12;
/** Share of the pass spent blurring in, and again blurring out. */
const RAMP = 0.22;

/**
 * Blurs a block while it arrives and while it leaves, and keeps it sharp across
 * the middle of its pass. One ScrollTrigger owns the filter per block, so no
 * second tween can write the same property mid-scroll.
 *
 * The effect is kept on every device, including phones: it is part of the
 * design. Only the number of writes is reduced (a larger change threshold and
 * `will-change` promoted only while the filter is actually active).
 */
export function initScrollBlur(selector = '[data-blur]') {
  if (reduced()) return;

  document.querySelectorAll(selector).forEach((el) => {
    let applied = -1;
    let promoted = false;

    const paint = (progress) => {
      const enter = Math.min(1, progress / RAMP);
      const leave = Math.min(1, (1 - progress) / RAMP);
      // squared so the sharp zone holds longer than the blurred edges
      const px = EDGE * (1 - Math.min(enter, leave)) ** 2;

      if (Math.abs(px - applied) < 0.25) return;
      applied = px;

      const blurred = px >= 0.06;
      if (blurred !== promoted) {
        promoted = blurred;
        el.style.willChange = blurred ? 'filter' : '';
      }
      el.style.filter = blurred ? `blur(${px.toFixed(2)}px)` : '';
    };

    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      // refresh paints the state a page loads or resizes into, so a block is
      // never left sharp at the edge waiting for the first scroll event
      onRefresh: (self) => paint(self.progress),
      onUpdate: (self) => paint(self.progress),
    });
  });
}
