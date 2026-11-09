/**
 * One shared set of durations, distances and curves, mirrored by the
 * --motion-* and --ease-* tokens in base.css so a CSS transition and a GSAP
 * tween feel like the same system. Seconds, because that is what GSAP reads.
 */

export const DUR = {
  fast: 0.14, // hover, focus, press feedback
  base: 0.22, // small panels, colour and opacity
  slow: 0.34, // chrome that travels: header, menu, plates
  large: 0.56, // page-level movement: display lines, the curtain
  travel: 0.8, // long spatial moves: the lab camera
};

/** Distances, in the units the tweens use (px, or % of the element). */
export const DIST = {
  rise: 24,
  row: 22,
  header: 10,
  line: 55, // % of a display line's own height
};

/** Shared cadence for anything that arrives as a group. */
export const STAGGER = {
  line: 0.055,
  row: 0.045,
  menu: 0.04,
  card: 0.016,
};

/**
 * The loader's count and tail. The inline scripts in index.html and
 * labs/index.html mirror these numbers so the first paint and the module agree.
 */
export const LOAD = {
  count: 0.9,
  cap: 0.94,
  tail: 0.2,
  hold: 0.14,
  media: 2.2,
  arrivalMedia: 0.32,
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

const enter = bezier(0.16, 1, 0.3, 1);

export const EASE = {
  // quick start, long settle: entrances and user-initiated feedback
  out: enter,
  // the same curve reversed, for exits
  in: (p) => 1 - enter(1 - p),
  // elements visibly travelling between two states
  inOut: bezier(0.76, 0, 0.24, 1),
};

/** Longer travel earns a little more time, inside the shared band. */
export const forTravel = (px, min = DUR.base) =>
  Math.min(DUR.slow, Math.max(min, DUR.base + Math.max(0, px) / 240));
