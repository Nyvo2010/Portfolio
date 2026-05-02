/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from "react";
import Gallery from "./components/Gallery";
import Overlay from "./components/Overlay";
import LoadingScreen from "./components/LoadingScreen";
import Navigation from "./components/Navigation";
import Lab from "./components/Lab";
import Blog from "./components/Blog";
import ChatWidget from "./components/ChatWidget";
import NotFound from "./components/NotFound";
import { AnimatePresence, motion } from "motion/react";

interface RouteState {
  page: string;
  projectSlug?: string;
  blogSlug?: string;
}

function parseUrl(): RouteState {
  const redirectPath = sessionStorage.getItem('spa_redirect');
  if (redirectPath) {
    sessionStorage.removeItem('spa_redirect');
    const segments = redirectPath.split("/").filter(Boolean);
    if (segments[0] === "projects" || segments[0] === "project") {
      if (segments.length >= 2 && segments[1]) {
        return { page: "project", projectSlug: segments[1] };
      }
      return { page: "home" };
    }
    if (segments[0] === "blog") {
      if (segments.length >= 2 && segments[1]) {
        return { page: "blog_post", blogSlug: segments[1] };
      }
      return { page: "blog" };
    }
    if (segments[0] === "lab") {
      return { page: "lab" };
    }
    return { page: "home" };
  }

  const path = window.location.pathname;
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0 || (segments.length === 1 && segments[0] === "")) {
    return { page: "home" };
  }

  if (segments[0] === "projects" || segments[0] === "project") {
    if (segments.length >= 2 && segments[1]) {
      return { page: "project", projectSlug: segments[1] };
    }
    return { page: "home" };
  }

  if (segments[0] === "blog") {
    if (segments.length >= 2 && segments[1]) {
      return { page: "blog_post", blogSlug: segments[1] };
    }
    return { page: "blog" };
  }

  if (segments[0] === "lab") {
    return { page: "lab" };
  }

  return { page: "404" };
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function App() {
  const [progress, setProgress] = useState(0);
  const [isLoadingVisible, setIsLoadingVisible] = useState(true);
  const [isStackComplete, setIsStackComplete] = useState(false);
  const [isReadyForOrbit, setIsReadyForOrbit] = useState(false);
  const [route, setRoute] = useState<RouteState>(() => parseUrl());
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string | null>(null);

  const galleryMode = route.page === "project" ? "grid" : "orbit";

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseUrl());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const activePage = route.page;

  useEffect(() => {
    if (route.page === "project" && route.projectSlug) {
      setSelectedProjectSlug(route.projectSlug);
    } else if (route.page === "home") {
      setSelectedProjectSlug(null);
    }
  }, [route.page, route.projectSlug]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const nextProgress = prev + Math.random() * 8;
        return nextProgress >= 100 ? 100 : nextProgress;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleStackComplete = useCallback(() => {
    if (progress >= 100) {
      setIsStackComplete(true);
    }
  }, [progress]);

  useEffect(() => {
    if (isStackComplete) {
      setIsLoadingVisible(false);
    }
  }, [isStackComplete]);

  useEffect(() => {
    if (!isLoadingVisible && isStackComplete) {
      const timer = setTimeout(() => {
        setIsReadyForOrbit(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingVisible, isStackComplete]);

  const handlePageChange = (page: string) => {
    let path = "/";
    if (page === "blog") path = "/blog";
    else if (page === "lab") path = "/lab";
    else if (page === "home") path = "/";
    navigate(path);
    setRoute(parseUrl());
    if (page === "home") {
      setSelectedProjectSlug(null);
    }
  };

  const handleProjectClick = (slug: string) => {
    setRoute({ page: "project", projectSlug: slug });
    setSelectedProjectSlug(slug);
    navigate(`/projects/${slug}`);
  };

  const handleBlogPostClick = (slug: string) => {
    setRoute({ page: "blog_post", blogSlug: slug });
    navigate(`/blog/${slug}`);
  };

  const showProjectView = route.page === "home" || route.page === "project";

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#f7f7f5]">
      <LoadingScreen isVisible={isLoadingVisible} progress={progress} />
      
      {/* Background/Main Content */}
      <AnimatePresence mode="wait">
        {showProjectView && (
          <motion.div
            key={route.page}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={`absolute inset-0 flex items-center justify-center ${(!isReadyForOrbit && progress >= 100) ? "z-[3000]" : "z-0"} ${isLoadingVisible ? "pointer-events-none" : ""}`}
          >
            <Gallery 
              onStackComplete={handleStackComplete} 
              isReadyForOrbit={isReadyForOrbit}
              onProjectClick={handleProjectClick}
              viewMode={galleryMode}
              startStack={progress >= 100}
              selectedProjectSlug={selectedProjectSlug}
              onPageChange={handlePageChange}
            />
            {route.page === "home" && isReadyForOrbit && <Overlay />}
          </motion.div>
        )}

        {route.page === "lab" && (
          <motion.div
            key="lab"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 z-20"
          >
            <Lab />
          </motion.div>
        )}

        {(route.page === "blog" || route.page === "blog_post") && (
          <motion.div
            key="blog"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 z-20"
          >
            <Blog 
              onPageChange={handlePageChange} 
              activePage={route.page}
              onPostClick={handleBlogPostClick}
              selectedSlug={route.blogSlug}
            />
          </motion.div>
        )}

        {route.page === "404" && (
          <motion.div
            key="404"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-50"
          >
            <NotFound onBack={() => handlePageChange("home")} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isLoadingVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="pointer-events-none fixed inset-0 z-[1000]"
          >
            <Navigation activePage={activePage} onPageChange={handlePageChange} />
            <ChatWidget onPageChange={handlePageChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


