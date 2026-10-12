let observer: IntersectionObserver | null = null;

/**
 * One-shot scroll reveals for `[data-reveal]` sections.
 *
 * The document is flagged first so the hidden state can only ever apply
 * when this actually runs — a failed script leaves the page fully
 * visible. Each element is unobserved once it lands, so a section
 * never re-animates on the way back up.
 */
export function initReveals() {
  if (typeof document === "undefined") return;

  const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
  if (nodes.length === 0) return;

  observer?.disconnect();
  observer = null;

  // Reduced motion gets the final state with no transition at all.
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    typeof IntersectionObserver === "undefined"
  ) {
    nodes.forEach((node) => node.classList.add("is-in"));
    return;
  }

  document.documentElement.classList.add("has-reveal");

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    },
    // fire a touch before the block is fully in, so it is already
    // settling as it enters instead of after it lands
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  nodes.forEach((node) => io.observe(node));
  observer = io;
}
