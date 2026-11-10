/** Publishes the layout width so --s maps 1:1 to the 1920 Figma frame. */
export function initScale() {
  const root = document.documentElement;
  let last = -1;

  const apply = () => {
    const width = root.clientWidth;
    if (width === last) return;
    last = width;
    root.style.setProperty('--vw', `${width}px`);
  };

  apply();

  // Resizes are owned by initLayout() in lib/layout.js, which calls this
  // before any effect measures the new geometry.
  return apply;
}
