const ORIGINAL = 'data-text';

const escape = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Rebuilds a text block as one element per rendered line. Justified blocks keep
 * their justification because every non-final line is justified to full width.
 */
/**
 * Puts a block back to plain, naturally wrapping text, and drops the grain
 * canvases that were painted per line.
 */
export function unsplit(el) {
  if (!el) return;
  const text = el.getAttribute(ORIGINAL);
  if (text !== null) el.textContent = text;
  el.querySelectorAll('.grain__c').forEach((canvas) => canvas.remove());
  el.classList.remove('is-split', 'is-grain', 'is-grain--block');
}

export function splitLines(el) {
  if (!el) return 0;

  if (!el.hasAttribute(ORIGINAL)) {
    el.setAttribute(ORIGINAL, el.textContent.replace(/\s+/g, ' ').trim());
  }

  const words = el.getAttribute(ORIGINAL).split(' ');
  el.classList.remove('is-split');
  el.innerHTML = words.map((word) => `<span class="w">${escape(word)}</span>`).join(' ');

  const spans = [...el.querySelectorAll('.w')];
  const groups = [];
  let top = null;

  spans.forEach((span) => {
    const y = Math.round(span.offsetTop);
    if (top === null || Math.abs(y - top) > 1) {
      groups.push([]);
      top = y;
    }
    groups[groups.length - 1].push(span.textContent);
  });

  el.innerHTML = groups
    .map((line) => `<span class="ln"><span class="ln__i">${escape(line.join(' '))}</span></span>`)
    .join('');
  el.classList.add('is-split');
  el.classList.remove('is-grain', 'is-grain--block');

  return groups.length;
}
