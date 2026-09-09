import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import Header from "./components/Header";
import GradualBlur from "./components/GradualBlur";
import Loader from "./components/Loader";
import { assetUrl, routePath } from "./utils/urls";
import { waitForCritical } from "./utils/ready";
import { scrollToInitialHash } from "./utils/navigation";
import { projects } from "./content/content";
// Load the heavy WebGL chunk while the loader is visible, then mount it only
// after the rest of the page is ready.
const loadBlobScene = () => import("./components/ui/r3f-blob");
const BlobScene = lazy(loadBlobScene);
// Grace before the loader appears — cached visits settle faster than this
// and reveal with no loader flash at all.
const LOADER_GRACE_MS = 250;
import Hero from "./sections/Hero";
import About from "./sections/About";
import SelectedWorks from "./sections/SelectedWorks";
import Writings from "./sections/Writings";
import Contact from "./sections/Contact";
import NotFound from "./sections/NotFound";
import WritingPage, { findWriting } from "./sections/WritingPage";
import { ProjectOverlay, type Origin, type Project } from "./sections/ProjectsGlobe";

export default function App() {
  const [active, setActive] = useState<{ p: Project; origin: Origin } | null>(null);
  const [ready, setReady] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const showedLoaderRef = useRef(false);

  const path = routePath(window.location.pathname).replace(/\/+$/, "") || "/";
  const isHome = path === "/" || path === "/index.html";
  const writing = !isHome && path.startsWith("/writings/")
    ? findWriting(path.slice("/writings/".length))
    : null;

  const resources = useMemo(() => {
    if (!isHome) return [];
    // Fonts (every weight the CSS uses) + fully decoded images — the
    // loader holds until ALL of these settle, so reveal never flashes
    // fallback weights or half-decoded bitmaps.
    const imageSources = [assetUrl("/PFP.png"), ...projects.map((project) => project.imageSource)];
    return [loadBlobScene(), ...waitForCritical(imageSources)];
  }, [isHome]);

  // Only show the loader when there is actually something to wait for:
  // on a cached visit fonts/images/chunk settle before the grace timer
  // fires, and the page reveals instantly with no loader flash.
  useEffect(() => {
    if (!isHome) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        showedLoaderRef.current = true;
        setShowLoader(true);
      }
    }, LOADER_GRACE_MS);
    void Promise.allSettled(resources).then(() => {
      if (cancelled) return;
      window.clearTimeout(timer);
      if (!showedLoaderRef.current) {
        setReady(true);
        setLoaderGone(true);
      }
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isHome, resources]);

  const handleLoaded = () => {
    setReady(true);
    window.setTimeout(() => setLoaderGone(true), 200);
  };

  // Deep links from blog-post header pills (e.g. /#writings) land here
  // with a hash — scroll to the right act once the page is ready.
  useEffect(() => {
    if (isHome && ready) scrollToInitialHash();
  }, [isHome, ready]);

  if (!isHome) {
    return writing ? <WritingPage writing={writing} /> : <NotFound />;
  }

  return (
    <div className={`text-black min-h-[100dvh] ${ready ? "app-ready" : ""}`}>
      {showLoader && !loaderGone && <Loader onDone={handleLoaded} resources={resources} />}
      <Header />
      <GradualBlur
        target="page"
        position="top"
        height="4rem"
        strength={1}
        divCount={6}
        curve="bezier"
        className="page-edge-blur"
      />
      <GradualBlur
        target="page"
        position="bottom"
        height="5rem"
        strength={1}
        divCount={6}
        curve="bezier"
        className="page-edge-blur"
      />
      <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
        <div className="blob-enter blob-wrap h-[64vmin] w-[64vmin] max-h-[520px] max-w-[520px] md:h-[52vmin] md:w-[52vmin]">
          {ready && (
            <Suspense fallback={null}>
              <ErrorBoundary>
                <BlobScene />
              </ErrorBoundary>
            </Suspense>
          )}
        </div>
      </div>
      <main className="relative">
        <Hero />
        <About />
        <SelectedWorks onSelect={(p, origin) => setActive({ p, origin })} />
        <Writings />
        <Contact />
      </main>
      <ProjectOverlay
        project={active?.p ?? null}
        origin={active?.origin ?? null}
        onClose={() => setActive(null)}
      />
    </div>
  );
}
