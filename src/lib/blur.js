import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reduced } from './reveal.js';

/** Pixels of blur while a block is fully out of the reading zone. */
const EDGE = 10.2; // 85% of the previous 12px
/** Share of the pass spent blurring in, and again blurring out. */
const RAMP = 0.22;
/** Writes closer together than this are served by one trailing update. */
const INTERVAL = 32;

/**
 * Blurs a block while it arrives and while it leaves, and keeps it sharp across
 * the middle of its pass. One ScrollTrigger owns the filter per block, so no
 * second tween can write the same property mid-scroll.
 *
 * A new blur radius makes the browser re-rasterise the whole block, which is
 * the expensive part. Scroll events can arrive faster than frames, so updates
 * are coalesced to at most one write per ~2 frames, always with the latest
 * value: the ramp is slow enough that this is invisible, and it halves the
 * number of large rasterisations during a pass.
 */
export function initScrollBlur(selector = '[data-blur]') {
  if (reduced()) return;

  document.querySelectorAll(selector).forEach((el) => {
    let applied = -1;
    let promoted = false;
    let lastWrite = 0;
    let trailing = 0;
    let pending = -1;

    const write = (progress) => {
      // 0 and 1 are the fully offscreen ends. Painting a blurred layer there
      // rasterised every block below the fold during boot and kept it
      // promoted, which was pure GPU work for something nobody could see.
      if (progress <= 0 || progress >= 1) {
        if (!applied) return;
        applied = 0;
        if (promoted) {
          promoted = false;
          el.style.willChange = '';
        }
        el.style.filter = '';
        return;
      }

      const enter = Math.min(1, progress / RAMP);
      const leave = Math.min(1, (1 - progress) / RAMP);
      // squared so the sharp zone holds longer than the blurred edges
      const px = EDGE * (1 - Math.min(enter, leave)) ** 2;

      if (Math.abs(px - applied) < 0.35) return;
      applied = px;

      const blurred = px >= 0.06;
      if (blurred !== promoted) {
        promoted = blurred;
        el.style.willChange = blurred ? 'filter' : '';
      }
      el.style.filter = blurred ? `blur(${px.toFixed(2)}px)` : '';
    };

    const flush = () => {
      trailing = 0;
      if (pending < 0) return;
      lastWrite = performance.now();
      write(pending);
      pending = -1;
    };

    const paint = (progress, immediate) => {
      pending = progress;
      const now = performance.now();
      if (immediate || now - lastWrite >= INTERVAL) {
        if (trailing) clearTimeout(trailing);
        trailing = 0;
        flush();
        return;
      }
      if (!trailing) trailing = setTimeout(flush, INTERVAL - (now - lastWrite));
    };

    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      // refresh paints the state a page loads or resizes into, so a block is
      // never left sharp at the edge waiting for the first scroll event
      onRefresh: (self) => paint(self.progress, true),
      onUpdate: (self) => paint(self.progress, false),
    });
  });
}
