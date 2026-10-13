import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { Project } from "../content/content";
import { OVERLAY_CLOSE_EVENT } from "../utils/navigation";
import { startSmooth, stopSmooth } from "../utils/smooth";

export type { Project } from "../content/content";

/** Viewport rect of the clicked thumbnail — fallback only.
    The overlay re-measures the live source element for exactness. */
export type Origin = { x: number; y: number; w: number; h: number } | null;

export { projects } from "../content/content";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function sourceEls(id: string) {
  const btn = document.querySelector<HTMLElement>(`[data-thumb="${CSS.escape(id)}"]`);
  const img = btn?.querySelector<HTMLElement>("img") ?? null;
  return { btn, img };
}

export function ProjectOverlay({
  project,
  origin,
  onClose,
}: {
  project: Project | null;
  origin: Origin;
  onClose: () => void;
}) {
  const [rendered, setRendered] = useState<Project | null>(null);
  const [closing, setClosing] = useState(false);
  const [imageRatio, setImageRatio] = useState(16 / 9);
  const [imageLoaded, setImageLoaded] = useState(false);
  // Re-measure the destination box when the viewport changes while the
  // overlay is open (rotate/resize) — otherwise the flight lands stale.
  const [viewport, setViewport] = useState(() =>
    typeof window !== "undefined"
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 1280, h: 800 }
  );
  const previewTextGap = 16;

  const backdropRef = useRef<HTMLDivElement | null>(null);
  const whiteRef = useRef<HTMLDivElement | null>(null);
  const flyRef = useRef<HTMLDivElement | null>(null);
  const destRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const descriptionRef = useRef<HTMLParagraphElement | null>(null);
  const textWrapRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const closedRef = useRef(false);
  const fromRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // mount — hide the real thumbnail so there is exactly ONE visible image
  // (thumbnails stay parked, so no freeze/drift handling needed).
  // The full-res file is decoded BEFORE first paint of the overlay, so
  // there is never a low-res → high-res pop mid-flight.
  useEffect(() => {
    if (!project) return;

    closedRef.current = false;
    tlRef.current?.kill();
    tlRef.current = null;
    setClosing(false);
    // Start from the known source aspect so the destination box is
    // exact on the first frame; the onload re-measure only corrects
    // rounding, never causes a visible resize mid-flight.
    setImageRatio(project.ratio ?? 16 / 9);
    setImageLoaded(false);
    setRendered(project);

    let cancelled = false;
    const image = new Image();
    const finish = () => {
      if (cancelled) return;
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        setImageRatio(image.naturalWidth / image.naturalHeight);
      }
      setImageLoaded(true);
      const { btn } = sourceEls(project.id);
      if (btn) btn.style.visibility = "hidden";
    };
    const finishDecoded = () => {
      if (cancelled) return;
      if (typeof image.decode === "function") {
        image.decode().catch(() => {}).finally(finish);
      } else {
        finish();
      }
    };
    image.onload = finishDecoded;
    image.onerror = finish;
    image.src = project.imageSource;
    if (image.complete && image.naturalWidth > 0) finishDecoded();

    // Safety: never trap the UI behind a stalled decode.
    const fallback = window.setTimeout(finish, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      image.onload = null;
      image.onerror = null;
      const { btn } = sourceEls(project.id);
      if (btn) btn.style.visibility = "";
    };
  }, [project]);

  // overflow hidden while any overlay is open, restored only on true close/unmount
  const isOpen = rendered != null;
  useEffect(() => {
    if (!isOpen) return;
    stopSmooth();
    // Freeze on the ROOT scroller, never on <body>: a body overflow:hidden
    // turns <body> into a scroll container, which re-anchors the sticky
    // SelectedWorks stage away from the viewport — the thumbnails jump off
    // their visible spots, so the overlay flight measures the wrong rect
    // (starts and returns to the wrong place). overflow:hidden on the html
    // root freezes the current scroll bar position while sticky stays
    // anchored to the viewport exactly where the user clicked.
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
      startSmooth();
    };
  }, [isOpen]);

  // Track viewport size while open so the preview box stays correct.
  useEffect(() => {
    if (!isOpen) return;
    let raf = 0;
    const onResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setViewport({ w: window.innerWidth, h: window.innerHeight });
      });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [isOpen]);

  // OPEN — fixed flying frame starts pixel-exact on the thumbnail,
  // morphs to the destination placeholder, text blurs in after landing
  useLayoutEffect(() => {
    if (!rendered) return;
    tlRef.current?.kill();
    tlRef.current = null;
    const fly = flyRef.current;
    const dest = destRef.current;
    const bd = backdropRef.current;
    const wt = whiteRef.current;
    const wrap = textWrapRef.current;
    if (!fly || !dest || !bd || !wrap || !wt) return;

    const items = Array.from(wrap.querySelectorAll<HTMLElement>(".ov-text"));
    const positionPreviewText = (box: DOMRect) => {
      if (window.innerWidth < 768) return;
      const anchor = (titleRef.current?.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? wrap.getBoundingClientRect();
      const centerX = box.left + box.width / 2;
      gsap.set(titleRef.current, {
        left: centerX - anchor.left,
        top: box.top - anchor.top - previewTextGap,
        xPercent: -50,
        yPercent: -100,
      });
      gsap.set(descriptionRef.current, {
        left: centerX - anchor.left,
        top: box.bottom - anchor.top + previewTextGap,
        xPercent: -50,
      });
    };

    if (reducedMotion()) {
      gsap.set(bd, { opacity: 1 });
      gsap.set(wt, { opacity: 1 });
      const d0 = dest.getBoundingClientRect();
      positionPreviewText(d0);
      gsap.set(fly, { left: d0.left, top: d0.top, width: d0.width, height: d0.height, x: 0, y: 0, scale: 1, opacity: 1 });
      fromRef.current = { x: d0.left, y: d0.top, w: d0.width, h: d0.height };
      gsap.set(items, { opacity: 1, filter: "blur(0px)", y: 0 });
      return () => {
        tlRef.current?.kill();
        tlRef.current = null;
      };
    }

    // Fly from the rect captured at click time — exactly what the user
    // saw under the cursor. It is the pixel-truth anchor for both
    // directions: the thumb's own live box can shift by a few px while
    // the overlay opens (the works frame's idle drift), and the click
    // rect keeps the flight deterministic and right on the seen spot.
    const from =
      origin && origin.w > 2
        ? { x: origin.x, y: origin.y, w: origin.w, h: origin.h }
        : null;

    const d = dest.getBoundingClientRect();
    positionPreviewText(d);

    if (!from) {
      // absolute fallback: fade in place
      gsap.set(fly, { left: d.left, top: d.top, width: d.width, height: d.height });
      fromRef.current = { x: d.left, y: d.top, w: d.width, h: d.height };
      const tlFallback = gsap.timeline();
      tlRef.current = tlFallback;
      tlFallback.fromTo(bd, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
      tlFallback.fromTo(wt, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.inOut" }, 0.25);
      tlFallback.fromTo(fly, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" }, 0.05);
      tlFallback.fromTo(
        items,
        { opacity: 0, filter: "blur(12px)", y: 14 },
        { opacity: 1, filter: "blur(0px)", y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 },
        0.3
      );
      return () => {
        tlRef.current?.kill();
        tlRef.current = null;
      };
    }

    // pin the flying frame at the DESTINATION size from the very first
    // frame, scaled down onto the thumbnail. The raster is therefore
    // always dest-sized (full-res) — scaling a large sharp bitmap down
    // and back up never blurs, unlike the old small-frame-scaled-up
    // approach which showed a soft thumb raster mid-flight.
    // Center-origin: visual center = layout center + x/y exactly.
    const destCx = d.left + d.width / 2;
    const destCy = d.top + d.height / 2;
    const fromCx = from.x + from.w / 2;
    const fromCy = from.y + from.h / 2;
    const startScale = from.w / d.width;
    const startX = fromCx - destCx;
    const startY = fromCy - destCy;
    gsap.set(fly, {
      left: d.left,
      top: d.top,
      width: d.width,
      height: d.height,
      x: startX,
      y: startY,
      scale: startScale,
      opacity: 1,
      transformOrigin: "center center",
    });
    fromRef.current = { x: d.left, y: d.top, w: d.width, h: d.height };
    gsap.set(bd, { opacity: 0 });
    gsap.set(wt, { opacity: 0 });
    gsap.set(items, { opacity: 0, filter: "blur(12px)", y: 16 });

    const tl = gsap.timeline();
    tlRef.current = tl;

    // phase 1 — page melts into blurred white as the flight starts
    tl.to(bd, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0);
    // phase 2 — white finishes to solid while the image is mid-flight,
    // so the bg is pure white the moment the preview lands
    tl.to(wt, { opacity: 1, duration: 0.5, ease: "power2.inOut" }, 0.4);

    // the image itself: one transform, same sharp pixels throughout,
    // lands exact (dest-sized frame → scale 1, zero offset).
    // power3.inOut instead of expo.out — the flight spans a tiny
    // thumbnail → large preview, and a pure ease-out blasts through
    // most of the distance in the first frames then crawls in, which
    // reads as a jumpy/wrong path. Symmetric in/out keeps it a
    // smooth continuous expansion from the thumb to the preview.
    tl.to(
      fly,
      {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: "power3.inOut",
      },
      0.05
    );
    // text blurs in only after the image has nearly settled
    tl.to(
      items,
      {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        duration: 0.75,
        ease: "power3.out",
        stagger: 0.09,
      },
      0.62
    );

    return () => {
      tl.kill();
      if (tlRef.current === tl) tlRef.current = null;
    };
    // NOTE: imageRatio intentionally omitted — the dest box resizes via
    // render and snapCrisp re-measures live, so a late ratio arrival must
    // not restart the flight (that restart was a fast-click flicker).
    // imageLoaded IS included: the overlay renders null until the full-res
    // file is decoded, so the first run finds no refs — without this dep
    // the flight timeline would never build and the overlay stays blank.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered, origin, imageLoaded]);

  const finishClose = useCallback(() => {
    const id = rendered?.id;
    tlRef.current?.kill();
    tlRef.current = null;
    // restore the real thumbnail BEFORE unmount so there is no gap
    if (id != null) {
      const { btn } = sourceEls(id);
      if (btn) btn.style.visibility = "";
    }
    fromRef.current = null;
    setRendered(null);
    setClosing(false);
    onClose();
  }, [onClose, rendered]);

  // CLOSE — text blurs out first, flying frame returns to the live
  // thumbnail rect, backdrop releases, thumbnail restored on arrival
  const requestClose = useCallback(() => {
    if (!rendered || closedRef.current) return;
    const fly = flyRef.current;
    const bd = backdropRef.current;
    const wt = whiteRef.current;
    const wrap = textWrapRef.current;
    if (!fly || !bd) {
      finishClose();
      return;
    }
    if (reducedMotion()) {
      finishClose();
      return;
    }
    closedRef.current = true;
    setClosing(true);
    tlRef.current?.kill();

    const { img: srcImg } = sourceEls(rendered.id);
    const live = srcImg?.getBoundingClientRect();
    const back =
      live && live.width > 2
        ? { x: live.left, y: live.top, w: live.width, h: live.height }
        : origin && origin.w > 2
          ? origin
          : null;

    const items = Array.from(
      wrap?.querySelectorAll<HTMLElement>(".ov-text") ?? []
    );

    const tl = gsap.timeline({ onComplete: finishClose });
    tlRef.current = tl;

    if (items.length) {
      tl.to(
        items,
        {
          opacity: 0,
          filter: "blur(12px)",
          y: 10,
          duration: 0.3,
          ease: "power2.in",
          stagger: 0.04,
        },
        0
      );
    }

    if (back && fromRef.current && fromRef.current.w > 0) {
      // reverse of the sharp open: the frame keeps its dest-sized layout
      // (full-res raster) and shrinks its transform onto the thumbnail
      // center — sharp all the way home. gsap.to() starts from the live
      // transform, so mid-flight closes glide smoothly instead of jumping.
      const destBox = fromRef.current;
      const destCx = destBox.x + destBox.w / 2;
      const destCy = destBox.y + destBox.h / 2;
      const backCx = back.x + back.w / 2;
      const backCy = back.y + back.h / 2;
      tl.to(
        fly,
        {
          x: backCx - destCx,
          y: backCy - destCy,
          scale: back.w / destBox.w,
          duration: 0.8,
          ease: "power3.inOut",
        },
        0
      );
    } else {
      tl.to(
        fly,
        { opacity: 0, scale: "-=0.04", duration: 0.45, ease: "power2.in" },
        0
      );
    }
    // Close IS the open reversed — one continuous gesture, not phases:
    // text blurs out, and while the image dives back home the white
    // sheet and the page-blur melt away AROUND it in the same stroke
    // they used to fade in with. The page re-materializes in the margin
    // as the image shrinks, exactly like it dissolved when the image
    // grew, so the close reads as the mirror of the open and takes the
    // same length of time. The thumbnail reappears the instant the
    // flight lands underneath it — never earlier, so there is never a
    // duplicated image on screen.
    const restoreThumb = () => {
      const { btn, img } = sourceEls(rendered.id);
      if (btn) btn.style.visibility = "";
      // Snap the parked flight onto the thumb's LIVE rect — the works
      // frames idle-drift a few px even mid-fade, so without this the
      // hand-off at unmount would leave a tiny gap.
      if (img && flyRef.current && fromRef.current && fromRef.current.w > 0) {
        const r = img.getBoundingClientRect();
        const destBox = fromRef.current;
        gsap.set(flyRef.current, {
          x: r.x + r.width / 2 - (destBox.x + destBox.w / 2),
          y: r.y + r.height / 2 - (destBox.y + destBox.h / 2),
          scale: r.width / destBox.w,
        });
      }
    };
    tl.call(restoreThumb, undefined, ">");
    // the melts use opacity only, exactly like the open: the backdrop
    // keeps its static blur(40px) layer as a pre-rendered composited
    // texture and fades its intensity, so the background dissolves
    // without re-rasterizing a full-viewport blur every frame.
    if (wt) {
      tl.to(wt, { opacity: 0, duration: 0.45, ease: "power2.inOut" }, 0.15);
    }
    tl.to(
      bd,
      {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut",
      },
      0.25
    );
  }, [rendered, origin, finishClose]);

  useEffect(() => {
    if (rendered == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    const onCloseEvent = () => requestClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener(OVERLAY_CLOSE_EVENT, onCloseEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OVERLAY_CLOSE_EVENT, onCloseEvent);
    };
  }, [requestClose, rendered]);

  // if the project prop clears externally, restore thumb too
  useEffect(() => {
    if (!project && rendered) {
      const { btn } = sourceEls(rendered.id);
      if (btn) btn.style.visibility = "";
      fromRef.current = null;
      setRendered(null);
    }
  }, [project, rendered]);

  if (!rendered || !imageLoaded) return null;

  const maxWidth = Math.min(viewport.w * 0.88, 1200);
  const maxHeight = Math.max(220, viewport.h - 220);
  // Preview sits at 3/4 of the available frame — presence without
  // swallowing the page.
  const previewWidth = Math.min(maxWidth, maxHeight * imageRatio) * 0.75;
  const previewHeight = previewWidth / imageRatio;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={rendered.title}>
      {/* backdrop — static blur strength, opacity-only animation (cheap:
          fades the page into blurred white instead of flashing it) */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-white/70 opacity-0 backdrop-blur-xl"
        onClick={requestClose}
      />
      {/* white finish — fades in after the blur so the bg lands solid
          white; never intercepts clicks (backdrop still closes) */}
      <div
        ref={whiteRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-white opacity-0"
      />

      {/* content — clicks on empty space close, clicks on text/image stay */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        onClick={requestClose}
      >
        <div
          ref={textWrapRef}
          className="relative flex w-full max-w-4xl flex-col items-center gap-4 md:h-full md:max-w-none md:block"
        >
          <div className="order-1 flex w-full flex-col items-center gap-4 md:absolute md:inset-0 md:block md:order-2">
            <h3
              ref={titleRef}
              onClick={(e) => e.stopPropagation()}
              className="ov-text t-heading order-1 max-w-[min(92vw,56rem)] text-center md:absolute md:order-2"
            >
              {rendered.title}
            </h3>
            {/* invisible box — the flying image lands exactly here */}
            <div
              ref={destRef}
              className="order-2 bg-neutral-100 opacity-0 md:absolute md:left-1/2 md:top-1/2 md:order-1 md:-translate-x-1/2 md:-translate-y-1/2"
              style={{ width: previewWidth, height: previewHeight, aspectRatio: imageRatio }}
              aria-hidden
            />
            <p
              ref={descriptionRef}
              onClick={(e) => e.stopPropagation()}
              className="ov-text t-body order-3 max-w-[min(92vw,48rem)] text-center opacity-70 md:absolute md:order-3"
            >
              {rendered.description}
            </p>
          </div>
        </div>
      </div>

      {/* THE flying image — fixed, dest-sized from the first frame with the
          full-res file decoded before mount, so the preview is sharp
          throughout the flight (never a scaled-up thumb raster).
          Clicks on it stay (it's the content); clicks anywhere else close. */}
        <div
          ref={flyRef}
          className="fixed z-[55] overflow-hidden bg-neutral-100 opacity-0 will-change-transform"
          style={{
            left: 0,
            top: 0,
            transformOrigin: "center center",
            imageRendering: "auto",
            pointerEvents: closing ? "none" : "auto",
          }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={rendered.imageSource}
          alt={rendered.title}
          decoding="async"
          draggable={false}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-contain"
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              setImageRatio(image.naturalWidth / image.naturalHeight);
            }
          }}
        />
      </div>
    </div>
  );
}
