import { preloadImage } from "./urls";

/**
 * The single gate for "everything ACTUALLY loads during the loading screen".
 * Loader waits on these promises, so first paint never shows fallback
 * weights or half-decoded images.
 */
export function waitForFonts(): Promise<unknown> {
  if (typeof document === "undefined" || !document.fonts) {
    return Promise.resolve();
  }
  const samples = [
    // headings (350) + header pills (500), normal + italic — every weight
    // the CSS actually uses, so no axis snaps in after reveal.
    document.fonts.load('350 100px Erode', "Exploring the limits"),
    document.fonts.load('500 16px Erode', "Works Writings Contact"),
    document.fonts.load('italic 350 100px Erode', "Exploring"),
    document.fonts.load('16px "Helvetica Neue"', "Nyvo"),
  ];
  const timeout = new Promise((resolve) => window.setTimeout(resolve, 4000));
  return Promise.race([
    Promise.allSettled(samples).then(() => document.fonts.ready),
    timeout,
  ]);
}

export function waitForImages(sources: string[]): Promise<unknown>[] {
  return sources.map((src) => preloadImage(src));
}

export function waitForCritical(images: string[]): Promise<unknown>[] {
  return [waitForFonts(), ...waitForImages(images)];
}
