/**
 * One resize path for the whole site.
 *
 * Every effect that depends on the viewport hands its re-layout work in here,
 * so one resize runs the page in a single ordered pass instead of several
 * debounced listeners racing each other. That race used to re-split the type
 * while a canvas was still measuring the previous width, which is how reveals
 * and grain blocks fell out of sync after a resize.
 *
 * Only a real change counts: a phone scrolling its URL bar away reports a
 * resize without changing the width, and re-laying the whole page out for that
 * was the biggest source of mobile jank.
 */

const tasks = [];
let primary = null;
let timer = 0;
let lastWidth = 0;
let lastHeight = 0;

/** Register work that must run after the type has been laid out again. */
export function onLayout(task) {
  tasks.push(task);
  return task;
}

/**
 * Installs the watcher. `relayout` is the page's own layout pass and always
 * runs before the registered tasks; the scroll triggers are refreshed last, so
 * every trigger measures the final geometry.
 *
 * Returns a function that forces the pass now (a late font arriving is a real
 * relayout even though the viewport never changed).
 */
export function initLayout(relayout) {
  primary = relayout;
  lastWidth = document.documentElement.clientWidth;
  lastHeight = window.innerHeight;

  const run = (force = false) => {
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    const widthChanged = width !== lastWidth;
    const heightChanged = Math.abs(height - lastHeight) > 4;

    if (!force) {
      if (!widthChanged && !heightChanged) return;
      // a phone's URL bar slides without changing the width: not a relayout
      const narrow = window.matchMedia('(max-width: 860px)').matches;
      if (!widthChanged && narrow && Math.abs(height - lastHeight) < 140) return;
    }

    lastWidth = width;
    lastHeight = height;

    primary();

    for (let i = 0; i < tasks.length; i += 1) {
      try {
        tasks[i]();
      } catch (error) {
        console.error('[portfolio] layout', error);
      }
    }
  };

  const now = () => {
    clearTimeout(timer);
    timer = 0;
    run(true);
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = 0;
      run();
    }, 150);
  };

  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });

  return now;
}
