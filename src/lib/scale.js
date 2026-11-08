/** Publishes the layout width so --s maps 1:1 to the 1920 Figma frame. */
export function initScale() {
  const root = document.documentElement;

  const apply = () => {
    root.style.setProperty('--vw', `${root.clientWidth}px`);
  };

  apply();
  window.addEventListener('resize', apply, { passive: true });
  window.addEventListener('orientationchange', apply, { passive: true });

  return apply;
}
