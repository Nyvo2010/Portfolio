import { motion, useMotionValue, useTransform } from "motion/react";
import { useRef, useMemo, useState, useEffect } from "react";

const rawImages = (import.meta as any).glob("/src/assets/projects/*.{jpg,jpeg,png,webp,gif}", { query: "?url", eager: true });
const LOCAL_IMAGES = Object.values(rawImages).map((mod: any) => mod.default || mod);

const LAB_IMAGES = LOCAL_IMAGES.length > 0 ? LOCAL_IMAGES : [
  "https://assets.codepen.io/7558/bw-portrait-001.jpg",
  "https://assets.codepen.io/7558/bw-portrait-002.jpg",
  "https://assets.codepen.io/7558/bw-portrait-003.jpg",
  "https://assets.codepen.io/7558/bw-portrait-004.jpg",
  "https://assets.codepen.io/7558/bw-portrait-005.jpg",
  "https://assets.codepen.io/7558/bw-portrait-006.jpg",
  "https://assets.codepen.io/7558/bw-portrait-007.jpg",
  "https://assets.codepen.io/7558/bw-portrait-008.jpg",
  "https://assets.codepen.io/7558/bw-portrait-009.jpg",
  "https://assets.codepen.io/7558/bw-portrait-010.jpg",
  "https://assets.codepen.io/7558/bw-portrait-011.jpg",
  "https://assets.codepen.io/7558/bw-portrait-012.jpg"
];

const GRID_SIZE = 400; 

const COLS = 6; 
const ROWS = 4;
const PLANE_WIDTH = COLS * GRID_SIZE; 
const PLANE_HEIGHT = ROWS * GRID_SIZE; 

export default function Lab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState(400);

  useEffect(() => {
    const updateGridSize = () => {
      setGridSize(window.innerWidth < 768 ? 300 : 400);
    };
    updateGridSize();
    window.addEventListener('resize', updateGridSize);
    return () => window.removeEventListener('resize', updateGridSize);
  }, []);

  const cols = 6;
  const rows = 4;
  const planeWidth = cols * gridSize;
  const planeHeight = rows * gridSize;

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const wrap = (val: number, max: number) => ((val % max) + max) % max;
  
  const visualX = useTransform(x, (v) => wrap(v, planeWidth) - planeWidth);
  const visualY = useTransform(y, (v) => wrap(v, planeHeight) - planeHeight);

  const counterX = useTransform(x, (v) => -v);
  const counterY = useTransform(y, (v) => -v);

  const items = useMemo(() => {
    const grid: string[][] = Array(rows).fill(null).map(() => Array(cols).fill(""));
    const flatItems = [];
    let id = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let src;
        do {
          src = LAB_IMAGES[Math.floor(Math.random() * LAB_IMAGES.length)];
        } while (
          LAB_IMAGES.length > 4 &&
          (
            (c > 0 && src === grid[r][c-1]) ||
            (r > 0 && src === grid[r-1][c]) ||
            (c === cols - 1 && src === grid[r][0]) ||
            (r === rows - 1 && src === grid[0][c])
          )
        );
        grid[r][c] = src;
        flatItems.push({ src, id: id++ });
      }
    }
    return flatItems;
  }, []); // Only compute once

  const offsets = [-1, 0, 1];

  return (
    <div className="fixed inset-0 z-10 bg-[#f2f2f0] overflow-hidden" ref={containerRef}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <motion.h1 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          className="text-[14vw] font-bold tracking-tighter text-[#dadad7] uppercase select-none leading-none mt-12"
        >
          The lab
        </motion.h1>
      </div>

      <motion.div
        drag
        style={{ x, y }}
        dragElastic={0}
        dragMomentum={true}
        className="absolute w-[100000px] h-[100000px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-20 flex items-center justify-center"
      >
        <motion.div 
          style={{ x: counterX, y: counterY }} 
          className="relative w-full h-full flex items-center justify-center pointer-events-none will-change-transform"
        >
          <motion.div 
            style={{ x: visualX, y: visualY }} 
            className="relative will-change-transform"
          >
            {offsets.map(dx => (
              offsets.map(dy => (
                <div 
                  key={`${dx}-${dy}`} 
                  className="absolute left-0 top-0 grid transform-gpu"
                  style={{ 
                    transform: `translate3d(${dx * planeWidth}px, ${dy * planeHeight}px, 0)`,
                    gridTemplateColumns: `repeat(${cols}, ${gridSize}px)`, 
                    gridTemplateRows: `repeat(${rows}, ${gridSize}px)`, 
                  }}
                >
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-center pointer-events-auto p-12 w-full h-full">
                      <div className="relative rounded-lg overflow-hidden flex">
                        <img
                          src={item.src}
                          alt=""
                          className="max-w-full max-h-full opacity-100 block"
                          referrerPolicy="no-referrer"
                          draggable={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
      
      <div className="absolute bottom-8 right-8 pointer-events-none z-30">
        <span className="text-[10px] uppercase tracking-[0.2em] opacity-30 font-medium">Exploration Lab</span>
      </div>
    </div>
  );
}
