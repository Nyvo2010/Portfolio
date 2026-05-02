import { useState } from "react";
import { motion } from "motion/react";
import Navigation from "./Navigation";
import ChatWidget from "./ChatWidget";

interface NotFoundProps {
  onBack: () => void;
}

export default function NotFound({ onBack }: NotFoundProps) {
  const [activePage, setActivePage] = useState("404");

  const handlePageChange = (page: string) => {
    if (page === "home") {
      onBack();
    } else {
      setActivePage(page);
      window.history.pushState({}, "", page === "home" ? "/" : `/${page}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f7f7f5] flex flex-col items-center justify-center p-8 overflow-hidden">
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="text-center"
        >
          <p className="font-sans text-2xl md:text-4xl lg:text-6xl tracking-tighter text-black leading-[0.85] uppercase max-w-5xl mx-auto font-medium mb-16">
            This page doesn't exist or has been moved.
          </p>

          <motion.button
            onClick={onBack}
            className="text-4xl text-left tracking-tighter hover:translate-x-4 transition-all duration-300 cursor-pointer text-black opacity-40 hover:opacity-100"
          >
            Home
          </motion.button>
        </motion.div>
      </div>

      <Navigation activePage={activePage} onPageChange={handlePageChange} />
      <ChatWidget onPageChange={handlePageChange} />
    </div>
  );
}