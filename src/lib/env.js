/**
 * Small, dependency-free environment helpers.
 *
 * Everything here is defensive: older Safari and embedded webviews are missing
 * pieces of the modern API surface (MediaQueryList.addEventListener,
 * replaceChildren, requestIdleCallback...), and a single missing method used to
 * take the whole boot sequence down with it.
 */

const media = (query) => {
  try {
    return window.matchMedia ? window.matchMedia(query) : null;
  } catch {
    return null;
  }
};

export const prefersReducedMotion = () => {
  const mql = media('(prefers-reduced-motion: reduce)');
  return Boolean(mql && mql.matches);
};

export const isTouchLike = () => {
  const hover = media('(hover: none)');
  const pointer = media('(pointer: coarse)');
  return Boolean((hover && hover.matches) || (pointer && pointer.matches));
};

export const isFinePointer = () => {
  const hover = media('(hover: hover)');
  const pointer = media('(pointer: fine)');
  return Boolean(hover && hover.matches && pointer && pointer.matches);
};

/**
 * `MediaQueryList.addEventListener` only exists in Safari 14+. The old
 * `addListener` path keeps the menu working on older iPhones and webviews.
 */
export function onMediaChange(query, handler) {
  const mql = media(query);
  if (!mql) return () => {};

  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }
  if (typeof mql.addListener === 'function') {
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }
  return () => {};
}

/** `Element.replaceChildren` is Safari 14+; this is the same operation. */
export function replaceChildren(node, children) {
  if (!node) return;
  if (typeof node.replaceChildren === 'function') {
    node.replaceChildren(...children);
    return;
  }
  while (node.firstChild) node.removeChild(node.firstChild);
  children.forEach((child) => node.appendChild(child));
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const nextFrame = () =>
  new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 16);
    }
  });

export function whenIdle(callback, timeout = 1500) {
  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback, { timeout });
  }
  return window.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 1);
}

export function cancelIdle(id) {
  if (!id) return;
  if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(id);
  else window.clearTimeout(id);
}

/**
 * The expensive parts of the site are all visual: the per-pixel grain canvas,
 * the scroll blur and the wheel smoothing. On a phone, a low-core laptop, a
 * battery saver or a slow connection they are switched off so the design still
 * reads the same but scrolls and loads like a normal page.
 */
let cached = null;

export function env() {
  if (cached) return cached;

  const cores = Number(navigator.hardwareConcurrency) || 4;
  const memory = Number(navigator.deviceMemory) || 4;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
  const slowNetwork = Boolean(connection.saveData) || /(^|-)2g$/.test(connection.effectiveType || '');
  const reduced = prefersReducedMotion();
  const touch = isTouchLike();
  // A narrow viewport is a phone or a split-screen window. Treat it as
  // low-power even when the touch media query is unreliable (some Android
  // webviews and headless browsers report hover:hover).
  const smallQuery = media('(max-width: 860px)');
  const smallScreen = Boolean(smallQuery && smallQuery.matches);

  // Four cores and 4 GB are ordinary laptops, not a reason to drop the design.
  // Only genuinely constrained machines (and metered/slow connections) take the
  // reduced path; phones are already covered by touch/smallScreen.
  const lowPower = cores <= 2 || memory <= 2 || slowNetwork;
  const weak = reduced || touch || smallScreen || lowPower;

  cached = {
    cores,
    memory,
    slowNetwork,
    reduced,
    touch,
    weak,
    // The canvas is the visible text, so it keeps the original 2x cap: lowering
    // it would visibly soften the type on a high-DPI screen.
    dprCap: 2,
  };

  return cached;
}
