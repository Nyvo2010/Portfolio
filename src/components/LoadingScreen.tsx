/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";

interface LoadingScreenProps {
  isVisible: boolean;
  progress: number;
}

export default function LoadingScreen({ isVisible, progress }: LoadingScreenProps) {
  return (
    <motion.div
      id="loading-screen"
      // Start off-screen when not visible to avoid a brief flash on mount when routing
      initial={{ y: isVisible ? "0%" : "-100%" }}
      animate={{ y: isVisible ? "0%" : "-100%" }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-[#111111] text-white"
    >
      <div className="flex flex-col items-center">
        <span className="font-sans text-[10vw] tracking-tighter tabular-nums leading-none">
          {Math.round(progress)}
        </span>
      </div>
    </motion.div>
  );
}
