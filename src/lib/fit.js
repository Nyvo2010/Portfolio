/**
 * Shrinks a display line until it fits its container, so the type stays as
 * large as the design allows on every aspect ratio.
 */
export function fitText(el, { limit = el.parentElement, reserve = 0, min = 14 } = {}) {
  if (!el || !limit) return;

  el.style.fontSize = '';
  const available = () => limit.clientHeight - reserve;
  const ideal = parseFloat(getComputedStyle(el).fontSize) || 16;

  // scrollHeight also counts ink that spills past the line box, so measure in
  // whole lines at the real line-height instead of trusting it directly
  const fits = (px) => {
    el.style.fontSize = `${px}px`;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || px;
    const lines = Math.max(1, Math.round(el.scrollHeight / lineHeight));
    return lines * lineHeight <= available() + 1 && el.scrollWidth <= el.clientWidth + 1;
  };

  let size = ideal;

  if (!fits(ideal)) {
    let lo = min;
    let hi = ideal;
    for (let i = 0; i < 16; i += 1) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    size = lo;
  }

  el.style.fontSize = `${size}px`;
}
