import { siteUrl } from "./urls";

export const OVERLAY_CLOSE_EVENT = "nyvo:close-overlay";

export function isOverlayOpen() {
  if (typeof document === "undefined") return false;
  return document.querySelector('[role="dialog"]') != null;
}

export function closeOverlayIfOpen(): boolean {
  if (!isOverlayOpen()) return false;
  window.dispatchEvent(new CustomEvent(OVERLAY_CLOSE_EVENT));
  return true;
}

/** Resolves once the preview dialog has unmounted (close animation done). */
function waitForOverlayClose(timeoutMs = 2000): Promise<void> {
  return new Promise((resolve) => {
    if (!isOverlayOpen()) {
      resolve();
      return;
    }
    const startedAt = performance.now();
    const tick = () => {
      if (!isOverlayOpen()) {
        resolve();
        return;
      }
      if (performance.now() - startedAt > timeoutMs) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// A stuck veil can only survive via bfcache on back/forward (every
// transition ends in a full load) — drop it so back never lands blank.
if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      document.querySelectorAll(".page-exit-veil").forEach((el) => el.remove());
    }
  });
}

const EXIT_MS = 200;

/** Page background behind the veil (home/blog = white, 404 = black) so
    the fade never flashes a foreign color. */
function currentPageVeilColor(): string {
  const root = document.getElementById("root")?.firstElementChild as HTMLElement | null;
  const bg = root ? getComputedStyle(root).backgroundColor : "";
  return bg && bg !== "rgba(0, 0, 0, 0)" ? bg : "#fff";
}

/**
 * Full page switch with a fast veil fade: overlay fades in over ~200ms,
 * then the browser loads the next document (which fades itself in).
 * Same timing + curve everywhere, so every switch feels identical.
 */
export function transitionTo(url: string) {
  if (prefersReducedMotion()) {
    window.location.href = url;
    return;
  }
  if (document.querySelector(".page-exit-veil")) return; // already leaving
  const veil = document.createElement("div");
  veil.className = "page-exit-veil";
  veil.style.background = currentPageVeilColor();
  veil.setAttribute("aria-hidden", "true");
  document.body.appendChild(veil);
  // Two frames so the opacity transition runs instead of snapping.
  requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add("on")));
  window.setTimeout(() => {
    window.location.href = url;
  }, EXIT_MS + 40);
}

/** Plain-left-click anchor → veil fade then navigate. Modifier/middle
    clicks fall through to native new-tab behavior untouched. */
export function transitionToLink(
  e: {
    preventDefault: () => void;
    button?: number;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    currentTarget: HTMLElement;
  },
  url?: string
) {
  if (e.button !== undefined && e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const href = url ?? e.currentTarget.getAttribute("href");
  if (!href) return;
  transitionTo(href);
}

function smoothBehavior(): ScrollBehavior {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "auto";
  }
  return "smooth";
}

/** Scroll to a home-page section that is guaranteed to exist. */
export function scrollToSection(hash: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const behavior = smoothBehavior();

  if (hash === "#contact") {
    // Contact is a centered 100dvh closing scene — anchoring to #contact
    // leaves it mid-viewport. The intent is the very bottom of the page.
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
    return;
  }

  const el = document.querySelector(hash);
  if (!el) return;

  if (hash === "#works") {
    // Works is a tall 200vh scroll act — land mid-act where the words
    // are split and the image net is fully expanded, not at its empty top.
    requestAnimationFrame(() => {
      const target = document.querySelector("#works");
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top + target.clientHeight * 0.5,
        behavior,
      });
    });
    return;
  }

  if (hash === "#home") {
    window.scrollTo({ top: 0, behavior });
    return;
  }

  el.scrollIntoView({ behavior, block: "start" });
}

/**
 * Header navigation — single entry point for every pill / logo click.
 * - If the project preview overlay is open, close it first and THEN
 *   continue to the pressed section (waits for the close animation so
 *   the scroll lands on the live page, not the locked backdrop).
 * - If the target section exists on this page, smooth-scroll to it.
 * - Otherwise (e.g. on a blog post) do a full navigation home with the
 *   hash attached, so App can scroll after load.
 * Returns true when the click was fully handled (caller should preventDefault).
 */
export function goToSection(e: { preventDefault: () => void; button?: number; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }, href: string): boolean {
  // Modifier / middle clicks fall through to native behavior (new tab)
  // instead of being swallowed by the smooth-scroll.
  if (e.button !== undefined && e.button !== 0) return false;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  e.preventDefault();

  const overlayWasOpen = closeOverlayIfOpen();

  const proceed = () => {
    if (typeof document !== "undefined" && document.querySelector(href)) {
      scrollToSection(href);
      // Keep the URL hash in sync without triggering a jump.
      if (window.location.hash !== href) {
        window.history.replaceState(null, "", href);
      }
      return;
    }

    if (href === "#home") {
      transitionTo(siteUrl("/"));
      return;
    }

    transitionTo(siteUrl(`/${href}`));
  };

  if (overlayWasOpen) {
    // Let the close animation finish + body overflow restore before
    // measuring scroll targets — otherwise the scroll fires behind the
    // locked backdrop and visibly goes nowhere.
    void waitForOverlayClose().then(() => {
      requestAnimationFrame(() => requestAnimationFrame(proceed));
    });
    return true;
  }

  proceed();
  return true;
}

/** After the home page is ready, honour a deep-linked hash (from blog nav). */
export function scrollToInitialHash() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const hash = window.location.hash;
  if (!hash || hash === "#") return;
  // Let layout + loader exit settle before measuring.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => scrollToSection(hash));
  });
}
