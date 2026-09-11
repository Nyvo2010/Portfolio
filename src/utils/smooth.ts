import type Lenis from "lenis";

let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

export function stopSmooth() {
  lenis?.stop();
}

export function startSmooth() {
  lenis?.start();
}

function nativeBehavior(): ScrollBehavior {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "auto";
  }
  return "smooth";
}

/**
 * One animated-scroll entry point — Lenis when it is running (desktop,
 * no reduced motion), native smooth scrolling otherwise. The -80 offset
 * on elements mirrors scroll-mt-20 (5rem) used by the sections.
 */
export function smoothTo(target: number | HTMLElement, offset = 0) {
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.2 });
    return;
  }
  const behavior = nativeBehavior();
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior });
  } else {
    target.scrollIntoView({ behavior, block: "start" });
  }
}
