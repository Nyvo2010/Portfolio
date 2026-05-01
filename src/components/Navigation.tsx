import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Github, Linkedin, Mail } from "lucide-react";
import { useClickOutside } from "../hooks/useClickOutside";
import profilePic from "../assets/profile.png";

interface NavigationProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

export default function Navigation({ activePage, onPageChange }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const domNode = useClickOutside(() => setIsOpen(false));

  const menuItems = [
    { id: "home", label: "Home" },
    { id: "lab", label: "Lab" },
    { id: "blog", label: "Blog" },
  ];

  const socialLinks = [
    { href: "https://github.com/Nyvo2010", label: "GitHub" },
    { href: "https://www.linkedin.com/in/niek-vogelaar-271222392/", label: "LinkedIn" },
    { href: "mailto:niekyuwen@gmail.com", label: "Email" },
  ];

  useEffect(() => {
    const node = domNode.current;
    if (!node) return;
    
    const preventScroll = (e: WheelEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      const isScrollable = target.closest('.overflow-y-auto');
      if (!isScrollable && e.cancelable) {
        e.preventDefault();
      }
    };

    node.addEventListener('wheel', preventScroll, { passive: false });
    node.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      node.removeEventListener('wheel', preventScroll);
      node.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  return (
    <div className={`fixed bottom-4 left-4 md:bottom-8 md:left-8 pointer-events-auto ${isOpen ? 'z-[1001]' : 'z-[1000]'}`} ref={domNode}>
      <motion.div
        animate={{ height: isOpen ? 'min(560px, calc(100vh - 100px))' : 64 }}
        transition={{
          height: { type: "spring", stiffness: 300, damping: 30 }
        }}
        className="bg-black text-white rounded-[8px] flex flex-col p-4 w-[calc(100vw-100px)] md:w-[340px]"
      >
        {/* Header / Expanded State Top */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between h-8 shrink-0">
            <button 
              onClick={() => {
                onPageChange("home");
                setIsOpen(false);
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left cursor-pointer appearance-none bg-transparent border-none p-0 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0">
                <img src={profilePic} alt="Profile" className="w-6 h-6 object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wider">NYVØ</span>
                {!isOpen && (
                  <span className="text-[10px] opacity-40 uppercase truncate max-w-[150px]">
                     Designer & Developer
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              {isOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* Socials at top left when open */}
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col gap-1 items-start"
              >
                {socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xl tracking-tighter opacity-40 hover:opacity-100 hover:translate-x-2 transition-all duration-300 flex items-center py-1 cursor-pointer"
                  >
                    {link.label}
                  </a>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Expanded Items */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex-1 flex flex-col justify-end mt-8 overflow-y-auto overscroll-contain"
            >
              <div className="flex flex-col gap-2 mb-4 items-start">
                {menuItems.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => {
                      onPageChange(item.id);
                      setIsOpen(false);
                    }}
                    className={`text-6xl text-left tracking-tighter hover:translate-x-4 transition-all duration-300 cursor-pointer ${
                      activePage === item.id ? "opacity-100" : "opacity-40 hover:opacity-100"
                    }`}
                  >
                    {item.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
