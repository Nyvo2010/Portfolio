import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects, type Origin, type Project } from "./ProjectsGlobe";

gsap.registerPlugin(ScrollTrigger);

// portrait phone only — the big 2-column thumb grid assumes height ≥
// width. landscape phones fall back to the desktop spread, where the
// 13vw thumbs keep the no-overlap contract on any aspect ratio.
const isMobileView = () =>
  typeof window !== "undefined" &&
  window.innerWidth <= 767 &&
  window.innerHeight >= window.innerWidth;

/* desktop spread — one thumb per zone (top / left-upper /
   left-lower / right-upper / right-lower / bottom-left /
   bottom-right) so no area crowds and the composition feels even.
   positions are numeric so SPOT_RULES can enforce the spacing
   contract in dev: every pair holds MIN_GAP, every thumb's
   nearest neighbor stays under MAX_NN. middle stays empty for
   the blob; top-left (Selected) and bottom-right (Works) stay
   clear. each whole frame drifts gently in place. */
const DESKTOP_SPOTS = [
  { x: 48.5, y: 14.5 },
  { x: 18.5, y: 32 },
  { x: 13, y: 57 },
  { x: 73.5, y: 26 },
  { x: 69.5, y: 55.5 },
  { x: 34, y: 68 },
  { x: 58, y: 76 },
];

/* mobile spread — a designed composition, same spirit as the desktop
   spread: thumbs frame the fixed center blob (4 above, 3 below) with
   the middle kept clear and no shared rows/columns. positions are
   hand-placed in % of the stage (left/top edge semantics — `left` and
   `top` position the thumb's top-left corner) and contract-checked in
   dev like the desktop spots: every box stays well inside the stage,
   no two boxes overlap, and the drift animation (±5/±8px) can never
   bridge a gap. */
const MOBILE_W = 25; // thumb width, % of viewport width (25vw)
const MOBILE_H = 11; // 25vw × 4/3 ≈ % of a portrait phone's height
const MOBILE_MIN_GAP = 3; // edge-gap floor incl. drift (±5/±8px)

const MOBILE_SPOTS: { x: number; y: number }[] = [
  { x: 15, y: 32 },
  { x: 42, y: 18 },
  { x: 60, y: 35 },
  { x: 24, y: 53 },
  { x: 13, y: 69 },
  { x: 49, y: 80 },
  { x: 60, y: 60 },
];

/* spacing contract — desktop % units (thumb ≈ 18 × 24).
   MIN_GAP is the drift-proof floor between any two frames;
   MAX_NN keeps nearest neighbors cohesive, never stranded. */
const SPOT_W = 16;
const SPOT_H = 21.3;
const MIN_GAP = 4;
const MAX_NN = 33;

const checkSpacing = (
  name: string,
  list: { x: number; y: number }[],
  w: number,
  h: number,
  minGap: number,
  maxNn: number
) => {
  for (let i = 0; i < list.length; i++) {
    let nn = Infinity;
    for (let j = 0; j < list.length; j++) {
      if (i === j) continue;
      const a = list[i];
      const b = list[j];
      const gap = Math.max(Math.abs(a.x - b.x) - w, Math.abs(a.y - b.y) - h);
      if (gap < minGap) {
        console.warn(
          `[works] ${name} spots ${i}–${j} gap ${gap.toFixed(1)} < MIN_GAP ${minGap}`
        );
      }
      nn = Math.min(nn, Math.hypot(a.x - b.x, a.y - b.y));
    }
    if (nn > maxNn) {
      console.warn(
        `[works] ${name} spot ${i} nearest neighbor ${nn.toFixed(1)} > MAX_NN ${maxNn}`
      );
    }
  }
};

if (import.meta.env.DEV) {
  checkSpacing("desktop", DESKTOP_SPOTS, SPOT_W, SPOT_H, MIN_GAP, MAX_NN);
  // mobile check — 25vw thumb ≈ 25% of width, 4/3 → ≈11% of height on
  // a portrait phone; max-nn keeps the scatter even (no lonely corners)
  checkSpacing("mobile", MOBILE_SPOTS, MOBILE_W, MOBILE_H, MOBILE_MIN_GAP, 45);
}

// desktop thumbs are slightly reduced while preserving the same constellation layout;
// mobile thumbs stay compact and scattered with even gaps
const DESKTOP_NET = "min(16vw, 210px)";
const MOBILE_NET = "min(25vw, 120px)";
const MARGIN = 16;
// vertical breathing room for the split words — pulled a bit off the
// top/bottom edges (horizontal stays pinned at MARGIN). vh-scaled so it
// grows with the viewport, with a px floor on short screens.
const V_INSET_RATIO = 0.12;
const V_INSET_MIN = 64;
const WORKS_EASE = "power2.inOut";

/**
 * Works scene — a tall scroll act with a sticky viewport:
 * "Selected Works" rises from the bottom, splits diagonally to
 * opposite corners (Selected → top-left, Works → bottom-right),
 * and only then blurs the image net in behind.
 * Clicking an image morphs it into the project preview overlay.
 */
export default function SelectedWorks({
  onSelect,
}: {
  onSelect: (p: Project, origin: Origin) => void;
}) {
  const root = useRef<HTMLElement | null>(null);
  const [mobile, setMobile] = useState(isMobileView);

  // re-render the thumb grid when crossing the mobile breakpoint /
  // rotating the phone, so the bigger mobile thumbs always use the
  // mobile-only spread (no overlap)
  useEffect(() => {
    const onChange = () => setMobile(isMobileView());
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    // full-res preload is per-thumb on hover — the flying preview image
    // then hits the memory cache instead of the network, without
    // downloading all 7 full-res files at page load (which used to
    // fight the grid thumbs for bandwidth)
    const preloaded = new Set<number>();
    const preload = (url: string) => {
      const im = new Image();
      im.src = url;
      im.decode?.().catch(() => {});
    };
    const onPointerOver = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest?.("[data-thumb]") as HTMLElement | null;
      if (!btn) return;
      const id = Number(btn.dataset.thumb);
      if (!Number.isInteger(id) || preloaded.has(id)) return;
      preloaded.add(id);
      const p = projects.find((x) => x.id === id);
      if (p) {
        preload(p.imageSource); // full-res — the flying preview image itself
      }
    };
    el.addEventListener("pointerover", onPointerOver);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: gsap.Context | null = null;

    // Correction state — the corner targets are measured from live word
    // geometry, so they are only exact with the real display face. A
    // fallback-face measurement bakes in wrong end positions (words land
    // off-center / off-corner), and rebuilding mid-act would snap
    // visibly — so late arrivals park a pending flag that rebuilds the
    // moment scroll rests back at the top, where a rebuild is invisible.
    let built = false;
    let pending = false;
    let cancelled = false;
    let fontTimer = 0;
    // Fires from both triggers' onUpdate, but only ever acts when a
    // correction is parked AND scroll is fully at rest — otherwise a
    // harmless no-op that keeps the flag for the next rest.
    const correctSoon = () => {
      if (!pending) return;
      requestAnimationFrame(() => {
        if (!cancelled && pending && !isActive()) {
          pending = false;
          build();
        }
      });
    };
    const restUpdate = (self: { progress: number }) => {
      if (self.progress === 0) correctSoon();
    };

    const build = () => {
      // revert first so every measurement happens at x: 0, y: 0.
      // rect.left is immune to the rise's y-translation, and after
      // revert the heading sits centered — the exact split baseline.
      ctx?.revert();
      built = true;
      const mobile = isMobileView();
      const a = el.querySelector<HTMLElement>(".sw-a");
      const b = el.querySelector<HTMLElement>(".sw-b");
      const stage = el.querySelector<HTMLElement>(".sw-stage");
      let targetAX = 0;
      let targetAY = 0;
      let targetBX = 0;
      let targetBY = 0;
      // corner targets only matter for the desktop split — mobile fades
      // the words out in place instead (see ACT 2)
      if (!mobile && a && b && stage && a.offsetWidth > 0) {
        const stageBox = stage.getBoundingClientRect();
        const aBox = a.getBoundingClientRect();
        const bBox = b.getBoundingClientRect();
        const aLeft = aBox.left - stageBox.left;
        const aTop = aBox.top - stageBox.top;
        const bRight = bBox.right - stageBox.left;
        const bBottom = bBox.bottom - stageBox.top;
        const vw = stageBox.width;
        const vh = stageBox.height;
        const vInset = Math.max(V_INSET_MIN, vh * V_INSET_RATIO);
        // Selected → top-left (a bit off the top edge), Works → bottom-right
        // (a bit off the bottom edge); only the vertical inset differs from
        // MARGIN, horizontal stays pinned
        targetAX = Math.max(-vw * 0.5, Math.min(0, MARGIN - aLeft));
        targetAY = Math.max(-vh * 0.5, Math.min(0, vInset - aTop));
        targetBX = Math.max(0, Math.min(vw * 0.5, vw - MARGIN - bRight));
        targetBY = Math.max(0, Math.min(vh * 0.5, vh - vInset - bBottom));
      }

      ctx = gsap.context(() => {
        // ACT 1 — rise: plays only while the section scrolls into view.
        // Heading travels from below into the viewport center, finishing
        // exactly when the stage pins (section top hits viewport top).
        // mobile runs y-only: act 2 owns opacity (the fade-out below), so
        // no two tweens ever fight over the same property (that fight is
        // what made the words flicker/jump on small screens)
        const riseFrom = mobile ? { y: "12vh" } : { y: "12vh", opacity: 0.6 };
        const riseTo = mobile
          ? { y: "0vh", ease: WORKS_EASE, scrollTrigger: { id: "works-rise", trigger: el, start: "top bottom", end: "top top", scrub: 1.3, onUpdate: restUpdate } }
          : {
              y: "0vh",
              opacity: 1,
              ease: WORKS_EASE,
              scrollTrigger: {
                id: "works-rise",
                trigger: el,
                start: "top bottom",
                end: "top top",
                scrub: 1.3,
                onUpdate: restUpdate,
              },
            };
        gsap.fromTo(".sw-rise", riseFrom, riseTo);
        // ACT 2 — split + reveal: only starts once the stage is pinned,
        // i.e. the heading is sitting in center view. No progress before that.
        const tl = gsap.timeline({
          scrollTrigger: {
            id: "works-act",
            trigger: el,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.3,
            onUpdate: restUpdate,
          },
        });
        // 2 — brief hold, one heading
        tl.to({}, { duration: 0.15 });
        // 3 — desktop: words split diagonally to opposite corners (plain
        // pixel targets, measured above — deterministic on any screen).
        // mobile: no corner travel at all — the centered words simply
        // fade out (nothing to measure, nothing to jump)
        if (mobile) {
          tl.to(".sw-rise", { opacity: 0, ease: WORKS_EASE, duration: 0.5 }, "<");
        } else {
          tl.to(".sw-a", { x: targetAX, y: targetAY, ease: WORKS_EASE, duration: 1.0 });
          tl.to(".sw-b", { x: targetBX, y: targetBY, ease: WORKS_EASE, duration: 1.0 }, "<");
        }
        // 4 — only now does the image net blur in behind (from true
        // invisible — never ghosting behind the heading). blur fades AND
        // sharpens together with opacity/rise, all scrubbed — so every
        // pass down the section plays the same reveal, and scrolling
        // back up reverses it identically. mobile skips the blur filter
        // entirely — per-frame blur on 7 images is the heavy part, and
        // on a phone the reveal reads the same without it
        const imgFrom: gsap.TweenVars = mobile
          ? { opacity: 0, y: 60, scale: 0.92 }
          : { opacity: 0, y: 90, scale: 0.85, filter: "blur(12px)" };
        const imgTo: gsap.TweenVars = mobile
          ? { opacity: 1, y: 0, scale: 1, ease: WORKS_EASE, stagger: 0.12, duration: 1 }
          : {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              ease: WORKS_EASE,
              stagger: 0.12,
              duration: 1,
            };          tl.fromTo(".sw-img", imgFrom, imgTo);
        // 5 — hold the composition before handing off to Writings
        tl.to({}, { duration: 0.5 });

        // no scrolltrigger idle drift on the frames (each wrapper
        // drifts via CSS) so the overlay open/close always measures
        // the exact resting rect
      }, root);
      // Defer refresh a frame so back-and-forth scrubbing never sees a
      // half-built trigger — prevents the fast-scroll jump.
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };

    // Mid-act state helpers — a rebuild re-measures from the untransformed
    // baseline, so it only ever runs at rest (both triggers at progress
    // 0 or unstarted); anything mid-flight parks a pending correction.
    const isActive = () => {
      const act = ScrollTrigger.getById("works-act");
      const rise = ScrollTrigger.getById("works-rise");
      const inAct = !!act && act.progress > 0 && act.progress < 1;
      const inRise = !!rise && rise.progress > 0 && rise.progress < 1;
      return inAct || inRise;
    };
    const maybeRebuild = () => {
      if (!isActive()) build();
    };

    // First build waits for the real display face whenever possible —
    // the loader gates on these same fonts, so this resolves behind it
    // and the heading never pops. Slow-face fallback (2s) builds anyway
    // and parks a correction for the next rest.
    const startBuild = () => {
      if (!cancelled) build();
    };
    let fontSettled = false;
    try {
      fontSettled = !!document.fonts?.check?.("350 100px Erode");
    } catch {
      fontSettled = false;
    }
    if (fontSettled || !document.fonts) {
      startBuild();
    } else {
      fontTimer = window.setTimeout(() => {
        pending = true;
        startBuild();
      }, 2000);
      document.fonts
        .load("350 100px Erode", "Selected Works")
        .then(() => {
          window.clearTimeout(fontTimer);
          if (cancelled) return;
          fontSettled = true;
          if (!built) {
            // Not measured yet — build immediately even mid-act. One
            // snap now beats forever-wrong end positions.
            startBuild();
          } else if (!isActive()) {
            pending = false;
            startBuild();
          } else {
            pending = true;
            correctSoon();
          }
        })
        .catch(() => {
          window.clearTimeout(fontTimer);
          startBuild();
        });
    }

    // resizes move everything — rebuild debounced; a mid-act resize
    // parks a correction instead of being silently skipped forever
    let rz: number | undefined;
    const onResize = () => {
      window.clearTimeout(rz);
      rz = window.setTimeout(() => {
        if (isActive()) {
          pending = true;
          correctSoon();
        } else {
          maybeRebuild();
        }
      }, 300);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(fontTimer);
      el.removeEventListener("pointerover", onPointerOver);
      window.removeEventListener("resize", onResize);
      ctx?.revert();
    };
  }, []);

  return (
    <section id="works" ref={root} className="relative z-10 -mt-6 h-[200vh] scroll-mt-20 text-black">
      <div className="sw-stage sticky top-0 flex h-[100dvh] items-center justify-center overflow-hidden">
        {/* image net — each thumb keeps its source aspect ratio so the overlay
            flying image starts pixel-exact on the same visible pixels */}
        <div className="absolute inset-0">
          {projects.map((p, i) => {
            const spots = mobile ? MOBILE_SPOTS : DESKTOP_SPOTS;
            const s = spots[i % spots.length];
            return (
              <div
                key={p.id}
                className="sw-drift absolute"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: mobile ? MOBILE_NET : DESKTOP_NET,
                  animationDuration: `${6 + i * 0.9}s`,
                  animationDelay: `${-i * 1.7}s`,
                }}
              >
                <button
                  type="button"
                  data-thumb={p.id}
                  onClick={(e) => {
                    const img = e.currentTarget.querySelector("img");
                    const r = (img ?? e.currentTarget).getBoundingClientRect();
                    onSelect(p, { x: r.x, y: r.y, w: r.width, h: r.height });
                  }}
                  className="sw-img block w-full cursor-pointer overflow-hidden bg-neutral-100"
                  style={{ aspectRatio: `${p.ratio}` }}
                  aria-label={`Open ${p.title}`}
                >
                  <img
                    src={p.thumbSource}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    draggable={false}
                    className="block h-full w-full object-cover"
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* splitting headline — single line: both words are plain
            inline-blocks sharing ONE line box, so their baselines always
            sit on exactly the same level (no flex cross-axis at all —
            immune to per-word line-box rounding). the split tween
            animates x/y only, measured from the centered baseline, so
            progress 0 starts from the aligned state. */}
        <h2 className="t-heading sw-rise pointer-events-none relative whitespace-nowrap">
          <span className="sw-word sw-a inline-block">Selected</span><span className="sw-word sw-b ml-[0.16em] inline-block">Works</span>
        </h2>
      </div>
    </section>
  );
}
