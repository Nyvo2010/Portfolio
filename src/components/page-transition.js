import { gsap } from 'gsap';
import { DUR, EASE } from '../lib/motion.js';
import { prefersReducedMotion } from '../lib/env.js';

/**
 * One page turn for the whole site.
 *
 * The panel is the loading screen: a flat dark frame with the count in the
 * middle. It rises while counting in and holds at 100%, and the next document
 * opens on the same frame before dissolving it away. Every internal navigation
 * (home ⇄ lab, hash links included) runs through here, so both directions share
 * one continuous gesture instead of one having a curtain and the other a hard
 * cut.
 *
 * The key below is repeated by the inline scripts in index.html and
 * labs/index.html: the destination learns before its first paint that the
 * curtain is already up, which is what makes the handover seamless.
 */
export const ARRIVAL_KEY = 'nyvo:page-arrival';

/** Reads and clears the arrival flag, so a reload counts in normally. */
export function consumeArrival() {
  try {
    const arriving = sessionStorage.getItem(ARRIVAL_KEY) === '1';
    if (arriving) sessionStorage.removeItem(ARRIVAL_KEY);
    return arriving;
  } catch {
    /* private mode: the page simply counts in again */
    return false;
  }
}

/** A short hold lets the 100% read before the next page takes over. */
const HOLD = 0.1;

/** Same document, same search: an in-page anchor or a no-op link. */
const isSameDocument = (url) =>
  url.pathname === window.location.pathname && url.search === window.location.search;

export function initPageTransition() {
  if (prefersReducedMotion()) return;

  let panel = null;
  let busy = false;
  let failsafe = 0;

  const makePanel = () => {
    if (panel) return panel;

    panel = document.createElement('div');
    panel.className = 'page-wipe';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = '<span class="loader__pct" data-wipe-pct>0%</span>';

    document.body.append(panel);
    gsap.set(panel, { yPercent: 100 });
    return panel;
  };

  window.addEventListener('pageshow', (event) => {
    // coming back through the bfcache: the panel must not still cover the page
    if (!event.persisted || !panel) return;
    busy = false;
    window.clearTimeout(failsafe);
    failsafe = 0;
    gsap.killTweensOf(panel);
    gsap.set(panel, { yPercent: 100 });
  });

  document.addEventListener('click', (event) => {
    if (busy || event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download')) return;
    if (link.target && link.target !== '_self') return;

    let url;
    try {
      url = new URL(link.getAttribute('href'), window.location.href);
    } catch {
      return;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.origin !== window.location.origin) return;
    // native smooth scroll owns anchors inside this document
    if (url.hash && isSameDocument(url)) return;
    if (!url.hash && url.href === window.location.href) return;

    event.preventDefault();
    busy = true;

    const curtain = makePanel();
    const label = curtain.querySelector('[data-wipe-pct]');
    const count = { value: 0 };

    const go = () => {
      window.clearTimeout(failsafe);
      failsafe = 0;
      try {
        sessionStorage.setItem(ARRIVAL_KEY, '1');
      } catch {
        /* private mode: the destination counts in again */
      }
      window.location.href = url.href;
    };

    if (label) label.textContent = '0%';

    gsap
      .timeline({ onComplete: go })
      .to(curtain, { yPercent: 0, duration: DUR.large, ease: EASE.inOut }, 0)
      .to(
        count,
        {
          value: 100,
          duration: DUR.large,
          ease: EASE.inOut,
          onUpdate: () => {
            if (label) label.textContent = `${Math.round(count.value)}%`;
          },
        },
        0,
      )
      .to({}, { duration: HOLD }, DUR.large);

    // a stalled tween must never strand the visitor on the old page
    failsafe = window.setTimeout(go, DUR.large * 1000 + 900);
  });
}
