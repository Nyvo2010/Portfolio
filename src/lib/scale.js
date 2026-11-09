/** Publishes the layout width so --s maps 1:1 to the 1920 Figma frame. */
export function initScale() {
  const root = document.documentElement;
  let last = -1;

  const apply = () => {
    const width = root.clientWidth;
    // A phone's URL bar fires resize without changing the width. Writing the
    // same custom property again invalidates layout for no reason.
    if (width === last) return;
    last = width;
    root.style.setProperty('--vw', `${width}px`);
  };

  apply();
  window.addEventListener('resize', apply, { passive: true });
  window.addEventListener('orientationchange', apply, { passive: true });

  return apply;
}
