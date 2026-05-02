/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import gsap from "gsap";
import yaml from "js-yaml";

const rawProjects = (import.meta as any).glob("/src/content/projects/*.yaml", { query: "?raw", eager: true });
const parsedProjects = Object.entries(rawProjects).map(([path, module]: [string, any]) => {
  const content = module && typeof module === 'object' && 'default' in module ? module.default : module;
  if (typeof content !== 'string') return null;
  try {
    const data = yaml.load(content) as any;
    const id = path.split("/").pop()?.replace(".yaml", "") || Math.random().toString();
    return { ...data, id };
  } catch (e) {
    return null;
  }
}).filter(Boolean);

const PROJECTS = [...parsedProjects].sort((a, b) => {
  const timeA = a.date ? new Date(a.date).getTime() : 0;
  const timeB = b.date ? new Date(b.date).getTime() : 0;
  return (timeB || 0) - (timeA || 0);
});

export { getItemClass } from "../utils/grid";

import ReactMarkdown from "react-markdown";

import Footer from "./Footer";
import { slugify } from "../utils/slugify";
import { markdownPlugins, markdownComponents } from "../utils/markdown";

interface GalleryProps {
  onStackComplete: () => void;
  isReadyForOrbit: boolean;
  onProjectClick: (slug: string) => void;
  viewMode: "orbit" | "grid";
  startStack: boolean;
  selectedProjectSlug: string | null;
  onPageChange: (page: string) => void;
}

export default function Gallery({ onStackComplete, isReadyForOrbit, onProjectClick, viewMode, startStack, selectedProjectSlug, onPageChange }: GalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const scrollRotationRef = useRef(0);
  const cardsRef = useRef<HTMLElement[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const prevModeRef = useRef<"orbit" | "grid">(viewMode);

  useEffect(() => {
    if (!itemsRef.current || !startStack) return;

    const cards = Array.from(itemsRef.current.querySelectorAll('.carousel-item')) as HTMLElement[];
    cardsRef.current = cards;
    
    // Initial state: stacked and hidden at center (High Z to show on loader)
    gsap.set(cards, {
      opacity: 0,
      scale: 0.5,
      x: 0,
      y: 0,
      left: "50%",
      top: "50%",
      xPercent: -50,
      yPercent: -50,
      rotation: 0,
      zIndex: 3000,
    });

    const timeline = gsap.timeline({
      onComplete: () => {
        onStackComplete();
      }
    });

    cards.forEach((card, i) => {
      timeline.to(card, {
        opacity: 1,
        scale: 0.85,
        duration: 0.6,
        ease: "power2.out",
      }, i * 0.05);
    });

    return () => {
      timeline.kill();
    };
  }, [onStackComplete, startStack]);

  const updatePositions = (rotationAngle: number, mode: "orbit" | "grid", immediate = false) => {
    if (!cardsRef.current.length) return;
    
    if (mode === "orbit") {
      const isMobile = window.innerWidth < 768;
      const radiusX = window.innerWidth * (isMobile ? 0.44 : 0.42);
      const radiusY = window.innerHeight * (isMobile ? 0.32 : 0.34);
      const yOffset = isMobile ? -60 : 0;
      const duration = immediate ? 0 : 2.2;
      
      cardsRef.current.forEach((card, i) => {
        const baseAngle = (i / cardsRef.current.length) * Math.PI * 2;
        const currentAngle = baseAngle + (rotationAngle * (Math.PI / 180));
        
        const x = Math.sin(currentAngle) * radiusX;
        const y = Math.cos(currentAngle) * radiusY + yOffset;
        
        const scale = 0.6 + (Math.cos(currentAngle) + 1) * 0.15; 

        gsap.to(card, {
          x: x,
          y: y,
          scale: scale,
          opacity: 1,
          zIndex: Math.floor(y + 500),
          duration: duration,
          ease: "expo.out",
          overwrite: true
        });
      });
    } else if (selectedProjectSlug !== null) {
      // Transition out of orbit
      cardsRef.current.forEach((card, i) => {
        gsap.to(card, {
          opacity: 0,
          scale: 0.5,
          duration: 1,
          ease: "expo.inOut",
          overwrite: true
        });
      });
    }
  };

  useEffect(() => {
    if (isReadyForOrbit) {
      const immediate = prevModeRef.current === "grid" && viewMode === "orbit";
      updatePositions(scrollRotationRef.current, viewMode, immediate);
      
      prevModeRef.current = viewMode;
      
      if (viewMode === "orbit") {
        const handleWheel = (e: WheelEvent) => {
          if ((e.target as Element).closest(".pointer-events-auto")) return;
          const delta = Math.max(-100, Math.min(100, e.deltaY));
          scrollRotationRef.current -= delta * 0.1;
          updatePositions(scrollRotationRef.current, "orbit");
        };

        window.addEventListener("wheel", handleWheel, { passive: true });
        return () => {
          window.removeEventListener("wheel", handleWheel);
        };
      }
    }
  }, [isReadyForOrbit, viewMode, selectedProjectSlug]);

  const selectedProject = selectedProjectSlug ? PROJECTS.find(p => slugify(p.title) === selectedProjectSlug) : null;

  return (
    <div className={`carousel-container ${viewMode === 'grid' ? 'overflow-y-auto bg-[#f7f7f5] z-[70] scroll-smooth' : 'overflow-hidden'}`} ref={containerRef}>
      <div 
        className={`carousel-items relative ${viewMode === 'grid' ? 'flex flex-col items-center w-full' : 'h-screen'}`} 
        ref={itemsRef}
        style={{ opacity: startStack ? 1 : 0 }}
      >
        {PROJECTS.map((project, i) => {
          const projectSlug = slugify(project.title);
          return (
          <div
            key={i}
            className="carousel-item group absolute cursor-pointer rounded-lg overflow-hidden shadow-none flex"
            style={{ 
              opacity: 0,
              pointerEvents: viewMode === 'orbit' ? 'auto' : 'none'
            }}
            onClick={() => {
              onProjectClick(projectSlug);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <img src={project.coverImage || ""} alt="" className="max-w-[160px] md:max-w-[320px] max-h-[240px] md:max-h-[380px] w-auto h-auto block" />
            {viewMode === "orbit" && (
              <div className={`absolute inset-0 bg-black/40 flex flex-col justify-end p-6 transition-opacity duration-300 ${hoveredIndex === i ? "opacity-100" : "opacity-0"}`}>
                <div className="flex items-center justify-between text-white">
                  <span className="text-xl tracking-tight uppercase font-medium">{project.title}</span>
                </div>
              </div>
            )}
          </div>
        );
        })}

        {viewMode === "grid" && selectedProject && (
          <div className="w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-20 py-32 md:py-48 flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col mb-10 md:mb-16 w-full max-w-3xl"
            >
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-6 font-bold">Project Case Study</span>
                <h3 className="text-5xl md:text-9xl tracking-tighter leading-[0.85] uppercase font-medium mb-12">{selectedProject.title}</h3>
                {selectedProject.tags && (
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.tags.map(tag => (
                      <span key={tag} className="px-4 py-1.5 bg-black/5 text-[10px] uppercase tracking-widest font-bold text-black/40 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-3xl"
            >
              <div className="prose-lg font-medium max-w-none">
                <ReactMarkdown
                  remarkPlugins={markdownPlugins}
                  components={markdownComponents}
                >
                  {selectedProject.content || `### The Concept\n${selectedProject.summary || "Experimental design exploration bridging the gap between digital and physical forms."}\n\n### The Result\nA cohesive brand experience that translates seamlessly across tactile and digital mediums, focusing on modularity and timeless aesthetics.`}
                </ReactMarkdown>
              </div>
            </motion.div>

            <Footer onPageChange={onPageChange} />
          </div>
        )}
      </div>
    </div>
  );
}
