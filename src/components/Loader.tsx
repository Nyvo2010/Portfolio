import { useEffect, useRef, useState } from "react";

type LoaderProps = {
  onDone: () => void;
  resources?: Promise<unknown>[];
};

const MINIMUM_DURATION = 700;
const MAXIMUM_DURATION = 6000;

/* The splash screen gates the work that makes the first interaction feel ready:
   fonts, critical images, and the lazy 3D chunk. Progress is deliberately
   smoothed rather than pretending that network byte progress is available. */
export default function Loader({ onDone, resources = [] }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let raf = 0;
    let finishTimer = 0;
    let innerTimer = 0;
    let leaveTimer = 0;
    let mounted = true;
    const startedAt = performance.now();
    const allResources = Promise.allSettled(resources);
    const maximumWait = new Promise<unknown>((resolve) => {
      finishTimer = window.setTimeout(() => resolve(undefined), MAXIMUM_DURATION);
    });

    const update = (now: number) => {
      if (!mounted) return;
      const elapsed = now - startedAt;
      const timeProgress = Math.min(elapsed / MINIMUM_DURATION, 1);
      setProgress((current) => Math.max(current, Math.round(timeProgress * 72)));
      if (timeProgress < 1) raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);

    Promise.race([allResources, maximumWait]).then(() => {
      if (!mounted) return;
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, MINIMUM_DURATION - elapsed);
      innerTimer = window.setTimeout(() => {
        if (!mounted) return;
        setProgress(100);
        setLeaving(true);
        leaveTimer = window.setTimeout(() => {
          if (mounted) done.current();
        }, 350);
      }, remaining);
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(finishTimer);
      window.clearTimeout(innerTimer);
      window.clearTimeout(leaveTimer);
    };
  }, [resources]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white text-black transition-opacity duration-400 ease-out ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-label={`Loading ${progress}%`}
    >
      <span className="t-heading tabular-nums">{progress}</span>
    </div>
  );
}
