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

export const getItemClass = (totalAmount: number, index: number) => {
  const layouts: Record<number, string[]> = {
    1: ["col-span-12 aspect-[21/9]"],
    2: ["col-span-6 aspect-square", "col-span-6 aspect-square"],
    3: ["col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square"],
    4: ["col-span-6 aspect-video", "col-span-6 aspect-video", "col-span-6 aspect-video", "col-span-6 aspect-video"],
    5: ["col-span-6 aspect-[3/2]", "col-span-6 aspect-[3/2]", "col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square"],
    6: ["col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square", "col-span-4 aspect-square"]
  };

  const count = Math.min(totalAmount, 6);
  const layout = layouts[count] || layouts[6];
  return layout[index % layout.length] || "col-span-4 aspect-square";
};

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import Footer from "./Footer";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
              className="flex flex-col mb-24 w-full max-w-3xl"
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
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({node, ...props}) => (
                      <a 
                        href={props.href} 
                        className="text-black underline decoration-black/20 hover:decoration-black transition-all duration-300"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      />
                    ),
                    h3: ({node, ...props}) => <h3 className="text-3xl mt-20 mb-8 tracking-tighter font-medium uppercase leading-none" {...props} />,
                    h4: ({node, ...props}) => <h4 className="text-2xl mt-12 mb-6 tracking-tight uppercase font-medium" {...props} />,
                    p: ({node, children, ...props}) => {
                      // Filter out string children that are just whitespace
                      const realChildren = (Array.isArray(children) ? children : [children]).filter(child => 
                        !(typeof child === 'string' && child.trim() === '')
                      );

                      const isImagesOnly = realChildren.every(child => 
                        (typeof child === 'object' && child !== null && 'type' in (child as any) && (child as any).type === 'img')
                      );

                      if (isImagesOnly) {
                        const images = realChildren.filter(child => typeof child === 'object' && child !== null && 'type' in child && (child as any).type === 'img');
                        const total = images.length;
                        
                        if (total === 1) {
                          return (
                            <div className="my-12 bg-neutral-900 border-[6px] border-neutral-900 overflow-hidden rounded-md">
                              <img 
                                src={images[0].props.src} 
                                alt={images[0].props.alt} 
                                className="w-full h-auto block" 
                              />
                            </div>
                          );
                        }
                        
                        return (
                          <div className="grid grid-cols-12 gap-[6px] my-12 bg-neutral-900 border-[6px] border-neutral-900 overflow-hidden rounded-md p-0">
                            {images.map((img: any, idx: number) => (
                              <div key={idx} className={`${getItemClass(total, idx)} overflow-hidden bg-neutral-800`}>
                                <img 
                                  src={img.props.src} 
                                  alt={img.props.alt} 
                                  className="w-full h-full object-cover transition-all duration-1000" 
                                />
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return <p className="mb-8 last:mb-0 text-xl leading-[1.6] opacity-60" {...props}>{children}</p>;
                    },
                    ul: ({node, ...props}) => <ul className="list-none pl-0 mb-10 space-y-4" {...props} />,
                    li: ({node, children, ...props}) => (
                      <li className="flex items-start gap-4 text-xl opacity-60" {...props}>
                        <span className="w-1.5 h-1.5 rounded-full bg-black/20 mt-3 shrink-0" />
                        {children}
                      </li>
                    ),
                    hr: ({node, ...props}) => <hr className="my-16 border-black/5" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-[1px] border-black/20 pl-10 italic mb-10 text-3xl tracking-tight opacity-80 py-4" {...props} />,
                  }}
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
