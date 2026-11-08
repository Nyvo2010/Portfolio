import { gsap } from 'gsap';
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
 */
export function initScrollBlur(selector = '[data-blur]') {
  if (reduced()) return;

  gsap.utils.toArray(selector).forEach((el) => {
    let applied = -1;

    const paint = (progress) => {
      const enter = Math.min(1, progress / RAMP);
      const leave = Math.min(1, (1 - progress) / RAMP);
      // squared so the sharp zone holds longer than the blurred edges
      const px = EDGE * (1 - Math.min(enter, leave)) ** 2;

      if (Math.abs(px - applied) < 0.05) return;
      applied = px;
      el.style.filter = px < 0.06 ? '' : `blur(${px.toFixed(2)}px)`;
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
