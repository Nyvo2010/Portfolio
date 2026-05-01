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

export default function App() {
  const [progress, setProgress] = useState(0);
  const [isLoadingVisible, setIsLoadingVisible] = useState(true);
  const [isStackComplete, setIsStackComplete] = useState(false);
  const [isReadyForOrbit, setIsReadyForOrbit] = useState(false);
  const [activePage, setActivePage] = useState("home");
  const [galleryMode, setGalleryMode] = useState<"orbit" | "grid">("orbit");
  const [selectedProjectIndex, setSelectedProjectIndex] = useState<number | null>(null);

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
    setActivePage(page);
    if (page === "home") {
      setGalleryMode("orbit");
      setSelectedProjectIndex(null);
    }
  };

  const handleImageClick = (index: number) => {
    if (galleryMode === "orbit") {
      setActivePage("project");
      setGalleryMode("grid");
      setSelectedProjectIndex(index);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#f7f7f5]">
      <LoadingScreen isVisible={isLoadingVisible} progress={progress} />
      
      {/* Background/Main Content */}
      <AnimatePresence mode="wait">
        {(activePage === "home" || activePage === "project") && (
          <motion.div
            key={activePage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={`absolute inset-0 flex items-center justify-center ${(!isReadyForOrbit && progress >= 100) ? "z-[3000]" : "z-0"} ${isLoadingVisible ? "pointer-events-none" : ""}`}
          >
            <Gallery 
              onStackComplete={handleStackComplete} 
              isReadyForOrbit={isReadyForOrbit}
              onImageClick={handleImageClick}
              viewMode={galleryMode}
              startStack={progress >= 100}
              selectedProjectIndex={selectedProjectIndex}
              onPageChange={handlePageChange}
            />
            {activePage === "home" && isReadyForOrbit && <Overlay />}
          </motion.div>
        )}

        {activePage === "lab" && (
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

        {(activePage === "blog" || activePage === "blog_post") && (
          <motion.div
            key="blog"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 z-20"
          >
            <Blog onPageChange={handlePageChange} activePage={activePage} />
          </motion.div>
        )}

        {!["home", "project", "lab", "blog", "blog_post"].includes(activePage) && (
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


