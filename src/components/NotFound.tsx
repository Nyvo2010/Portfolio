import React from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

interface NotFoundProps {
  onBack: () => void;
}

export default function NotFound({ onBack }: NotFoundProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background Text Accent */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
        <h1 className="text-[40vw] font-bold tracking-tighter leading-none uppercase">404</h1>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        >
          <span className="text-xs uppercase tracking-[0.4em] mb-8 block font-bold text-black/40">Error Found</span>
          <h2 className="text-6xl md:text-9xl uppercase font-medium tracking-tighter leading-[0.85] mb-12">
            Lost in the <br />
            <span className="italic">Labyrinth</span>
          </h2>
          
          <p className="text-lg md:text-xl text-black/60 font-medium mb-16 leading-relaxed max-w-md mx-auto">
            The page you are looking for has drifted into another timeline or never existed at all.
          </p>

          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group flex items-center gap-4 bg-black text-white px-10 py-5 rounded-full text-sm uppercase tracking-widest font-bold transition-all hover:bg-black/80"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Reality
          </motion.button>
        </motion.div>
      </div>

      {/* Decorative lines matching the Lab aesthetic */}
      <div className="absolute top-0 left-12 w-px h-full bg-black/5" />
      <div className="absolute top-0 right-12 w-px h-full bg-black/5" />
      <div className="absolute bottom-12 left-0 w-full h-px bg-black/5" />
    </div>
  );
}
