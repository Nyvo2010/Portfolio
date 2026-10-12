import { lazy, Suspense, useEffect, useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import { siteUrl } from "../utils/urls";
import { transitionToLink } from "../utils/navigation";
import { waitForCritical } from "../utils/ready";

// lazy-split three.js / R3F out of the main bundle (same as App) so the
// 404 page doesn't force the 3D engine onto every visitor
const loadBlobScene = () => import("../components/ui/r3f-blob");
const BlobScene = lazy(loadBlobScene);

/* 404 — black void, inverted (white) blob, quiet heading behind it. */
export default function NotFound() {
  const [ready, setReady] = useState(false);

  // Same silent treatment as blog pages: fade in once fonts + 3D chunk
  // are ready, no loading screen.
  useEffect(() => {
    let on = true;
    const chunk = loadBlobScene();
    void Promise.allSettled([chunk, ...waitForCritical([])]).then(() => {
      if (on) setReady(true);
    });
    return () => {
      on = false;
    };
  }, []);

  return (
    <div
      className={`min-h-[100dvh] bg-black text-white transition-opacity duration-300 ${
        ready ? "app-ready opacity-100" : "opacity-0"
      }`}
    >
      <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
        <div className="blob-enter blob-wrap h-[64vmin] w-[64vmin] max-h-[520px] max-w-[520px] md:h-[52vmin] md:w-[52vmin]">
          {ready && (
            <ErrorBoundary>
              <Suspense fallback={null}>
                <BlobScene tone="ghost" start />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </div>
      {/* rise lives on <main> — a transform on the root would un-fix the
          overlay layer above */}
      <main
        className={`relative flex min-h-[100dvh] items-center justify-center overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          ready ? "translate-y-0" : "translate-y-3"
        }`}
      >
        <div className="pointer-events-none relative z-0 px-6 text-center">
          <h1 className="t-heading text-balance">It&rsquo;s quiet here,<br />try another page?</h1>
          <a
            href={siteUrl("/")}
            onClick={(e) => transitionToLink(e)}
            className="t-body pointer-events-auto mx-auto mt-5 inline-block opacity-70 transition-opacity hover:opacity-100"
          >
            Take me back
          </a>
        </div>
      </main>
    </div>
  );
}
