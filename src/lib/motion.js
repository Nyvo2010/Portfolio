/**
 * One shared set of durations and curves, mirrored by the --motion-* and
 * --ease-* tokens in base.css so a CSS transition and a GSAP tween feel like
 * the same system. Seconds, because that is what GSAP reads.
 */

export const DUR = {
  fast: 0.12, // hover, focus, button feedback
  base: 0.2, // small panels, colour and opacity
  slow: 0.3, // large panels, header, menu
  large: 0.5, // page-level movement: display lines, the curtain
};

/** Cubic bezier sampled the way CSS samples it. */
const cubic = (t, a, b) => {
  const u = 1 - t;
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
};

function bezier(x1, y1, x2, y2) {
  return (p) => {
    if (p <= 0 || p >= 1) return p;
    let lo = 0;
    let hi = 1;
    let t = p;
    for (let i = 0; i < 24; i += 1) {
      const x = cubic(t, x1, x2);
      if (Math.abs(x - p) < 0.0005) break;
      if (x < p) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return cubic(t, y1, y2);
  };
}

const enter = bezier(0.2, 0.8, 0.2, 1);

export const EASE = {
  // quick start, gentle settle: entrances and user-initiated feedback
  out: enter,
  // the same curve reversed, for exits
  in: (p) => 1 - enter(1 - p),
  // elements visibly travelling between two states
  inOut: bezier(0.65, 0, 0.35, 1),
  // continuous, non-interactive motion only
  linear: (p) => p,
};

/** Longer travel earns a little more time, inside the shared band. */
export const forTravel = (px, min = DUR.base) =>
  Math.min(DUR.large, Math.max(min, DUR.base + Math.max(0, px) / 240));
