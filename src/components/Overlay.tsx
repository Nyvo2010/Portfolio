/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";

export default function Overlay() {
  return (
    <div className="fixed inset-0 z-[450] pointer-events-none p-8 flex flex-col justify-center items-center max-md:-translate-y-[14vh] md:pb-0">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1], delay: 0.2 }}
        className="text-center w-full max-w-2xl px-4"
      >
        <div className="flex flex-col gap-4">
          <p className="font-sans text-2xl md:text-4xl lg:text-6xl tracking-tighter text-black leading-[0.85] uppercase max-w-5xl mx-auto font-medium">
            Creative Design Engineer building brands and digital experiences.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
