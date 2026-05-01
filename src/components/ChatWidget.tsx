import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useClickOutside } from "../hooks/useClickOutside";

type Message = {
  id: string;
  sender: "user" | "nyv";
  text: string;
  timestamp: Date;
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface ChatWidgetProps {
  onPageChange?: (page: string) => void;
}


export default function ChatWidget({ onPageChange }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const domNode = useClickOutside(() => setIsOpen(false));
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollToBottom("auto"), 50);
      setTimeout(() => scrollToBottom("auto"), 150);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue("");
    
    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const systemPrompt = `You are Nyv, the AI assistant for Niek (a digital product designer and front-end developer). Niek's nickname is Nyvo.
Core rules:
1. Be concise, friendly, and helpful.
2. NEVER use emojis.
3. NEVER make up pages, links, or facts. If you aren't sure, say you don't know.
4. ONLY provide links to these exact pages: 
    - Home: /
    - Lab: /lab (experimental interactions and coding playgrounds)
    - Blog: /blog (articles about design and engineering)
5. Format links like this: [lab](/lab).
6. Format lists using standard markdown asterisks or dashes.
7. ALWAYS respond in full, complete sentences.

Niek specializes in digital product design, brand identity, and creating polished, minimal, and intentional digital experiences. Help visitors learn about Niek's work.`;
      
      const promptQuery = systemPrompt + "\n\n" + messages.map(m => (m.sender === 'user' ? 'User: ' : 'Nyv: ') + m.text).join('\n') + "\nUser: " + userText;
      
      const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(promptQuery)}?stream=true`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch response: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let currentText = "";
      const newAiMsgId = (Date.now() + 1).toString();
      setIsLoading(false);

      setMessages(prev => [...prev, {
        id: newAiMsgId,
        sender: "nyv",
        text: "",
        timestamp: new Date()
      }]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              const delta = data.choices?.[0]?.delta?.content || "";
              if (delta) {
                currentText += delta;
                setMessages(prev => prev.map(msg => 
                  msg.id === newAiMsgId ? { ...msg, text: currentText } : msg
                ));
              }
            } catch (e) {
              // Ignore parse errors on incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "nyv",
        text: "Sorry, I had trouble connecting. Please try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href?.startsWith('#') && onPageChange) {
        e.preventDefault();
        onPageChange(href.substring(1));
      } else if (href?.startsWith('/')) {
        e.preventDefault();
        const page = href === '/' ? 'home' : href.substring(1);
        onPageChange?.(page);
      }
    }
  };

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
    <div className={`fixed bottom-4 right-4 md:bottom-8 md:right-8 flex items-end justify-end pointer-events-auto ${isOpen ? 'z-[1001]' : 'z-[1000]'}`} ref={domNode}>
      <motion.div
        animate={{
          width: isOpen ? (isMobile ? window.innerWidth - 32 : 340) : 64,
          height: isOpen ? (isMobile ? window.innerHeight - 100 : 560) : 64,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-black text-white rounded-[8px] overflow-hidden flex flex-col relative"
      >
        <AnimatePresence>
          {!isOpen ? (
            <motion.button
              key="closed-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.1 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              onClick={() => setIsOpen(true)}
              className="absolute inset-0 w-full h-full flex items-center justify-center text-white outline-none cursor-pointer"
            >
              <motion.div layoutId="chat-icon" className="grid grid-cols-3 gap-[3px] w-[18px]">
                {[...Array(9)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    animate={isLoading ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                    transition={{ duration: 1.5, repeat: isLoading ? Infinity : 0, delay: i * 0.1 }}
                    className={`w-[4px] h-[4px] rounded-full ${i === 4 ? 'bg-transparent' : 'bg-current'}`} 
                  />
                ))}
              </motion.div>
            </motion.button>
          ) : (
            <motion.div
              key="open-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.1 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className="flex flex-col w-full h-full relative"
            >
              {/* Header */}
              <div className="absolute top-4 left-5 right-4 flex items-center justify-between z-10 pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium uppercase tracking-widest text-[#f2f2f0]">Nyv</span>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close chat"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Messages Area */}
              <div 
                className="flex-1 overflow-y-auto px-5 py-6 pt-20 flex flex-col gap-8 custom-scrollbar bg-black overscroll-contain"
                onClick={handleMessageClick}
              >
                {messages.length === 0 && (
                  <div className="mt-auto mb-auto flex flex-col gap-6">
                    <h3 className="text-[#f2f2f0] text-lg font-medium tracking-tight">
                      How can I help you today?
                    </h3>
                    <p className="text-[#f2f2f0] text-[15px] leading-relaxed text-white/50">
                      Hi, I'm Nyv. Ask me anything about our approach, projects, or how to get in touch.
                    </p>
                  </div>
                )}
                
                {messages.map((msg) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, type: "spring", bounce: 0 }}
                    key={msg.id} 
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-3 text-[13px]">
                      <span className="font-medium text-[#f2f2f0]">
                        {msg.sender === "user" ? "You" : "Nyv"}
                      </span>
                      <span className="text-white/30">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className={`text-[15px] leading-relaxed ${msg.sender === 'user' ? 'text-white/50' : 'text-[#f2f2f0]'}`}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({node, ...props}) => <a {...props} className="underline decoration-white/30 text-white hover:decoration-white/80 transition-colors cursor-pointer" />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 last:mb-0" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 last:mb-0" {...props} />,
                          li: ({node, ...props}) => <li className="mb-1" {...props} />
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, type: "spring", bounce: 0 }}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-3 text-[13px]">
                      <span className="font-medium text-[#f2f2f0]">Nyv</span>
                      <span className="text-white/30">{formatTime(new Date())}</span>
                    </div>
                    <div className="text-[15px] leading-relaxed text-[#f2f2f0]">
                      <motion.span 
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="opacity-50"
                      >
                        Thinking
                      </motion.span>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="px-5 py-4 bg-black relative shrink-0">
                <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
                  <div className="flex-shrink-0 text-[white] flex items-center justify-center opacity-80">
                    <motion.div layoutId="chat-icon" className="grid grid-cols-3 gap-[3px] w-[18px]">
                      {[...Array(9)].map((_, i) => (
                        <motion.div 
                          key={i} 
                          animate={isLoading ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                          transition={{ duration: 1.5, repeat: isLoading ? Infinity : 0, delay: i * 0.1 }}
                          className={`w-[4px] h-[4px] rounded-full ${i === 4 ? 'bg-transparent' : 'bg-current'}`} 
                        />
                      ))}
                    </motion.div>
                  </div>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything..."
                    className="w-full bg-transparent text-[#f2f2f0] placeholder:text-white/30 border-none outline-none text-[15px] py-2"
                    dir="auto"
                  />
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <style dangerouslySetInnerHTML={{__html:`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        `}} />
      </motion.div>
    </div>
  );
}
