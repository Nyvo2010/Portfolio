import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useClickOutside } from "../hooks/useClickOutside";

type Message = {
  id: string;
  sender: "user" | "nyv";
  text: string;
  navs?: string[];
  timestamp: Date;
  loading?: boolean; // indicates a placeholder 'Thinking' state before streaming
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
      setTimeout(() => scrollToBottom("auto"), 100);
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

    // Create and show the placeholder AI message immediately so the Nyv header appears
    const newAiMsgId = (Date.now() + 1).toString();
    // Add placeholder AI message marked as loading so the UI can render a Thinking shimmer
    setMessages(prev => [...prev, { id: newAiMsgId, sender: 'nyv', text: '', navs: [], timestamp: new Date(), loading: true }]);

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const res = await fetch('https://portfolio-groq-proxy.niekyuwen.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errText = errJson.message || 'Sorry, I had trouble connecting. Please try again later.';
        const errorMsg: Message = { id: newAiMsgId, sender: 'nyv', text: errText, timestamp: new Date() };
        // replace placeholder with error message
        setMessages(prev => prev.map(m => m.id === newAiMsgId ? errorMsg : m));
        return;
      }

      reader = res.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentText = '';
      const navs: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine === 'data: [DONE]') continue;
          if (!trimmedLine.startsWith('data: ')) continue; // ignore non-data lines

          const payload = trimmedLine.slice(6).trim();
          let appended = '';
            try {
              const data = JSON.parse(payload);
              // Prefer content only. Ignore any delta.reasoning to avoid duplicated/verbose output.
              appended = data.choices?.[0]?.delta?.content || data.choices?.[0]?.text || '';
            } catch (e) {
              appended = payload;
            }

          if (!appended) continue;

          // Sanitize join rules
          const lastChar = currentText.slice(-1);
          if (/\s/.test(lastChar) && /^[,.!?;:]/.test(appended)) {
            appended = appended.replace(/^\s+/, '');
          }
          if (/\b[A-Za-z]\s$/.test(currentText) && /^[A-Za-z]/.test(appended)) {
            currentText = currentText.replace(/\s+$/, '');
          }
          appended = appended.replace(/\s+([,.!?;:])/g, '$1').replace(/\s{2,}/g, ' ');

          currentText += appended;

          // Extract NAVs and remove them from displayed text
          const navRegex = /^NAV:\s*(\/\S+)/gmi;
          let cleanedText = currentText.replace(navRegex, (m, p1) => {
            if (p1 && !navs.includes(p1)) navs.push(p1);
            return '';
          });
          cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trimStart();

          setMessages(prev => prev.map(msg => msg.id === newAiMsgId ? { ...msg, text: cleanedText, navs: [...navs], loading: false } : msg));
        }
      }
    } catch (err) {
      const errorMsg: Message = { id: newAiMsgId, sender: 'nyv', text: 'Sorry, I had trouble connecting. Please try again later.', timestamp: new Date() };
      setMessages(prev => prev.map(m => m.id === newAiMsgId ? errorMsg : m));
    } finally {
      try { await reader?.cancel(); } catch {};
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
        const path = href;
        
        if (path === '/') {
          onPageChange?.('home');
        } else if (path.startsWith('/projects/') || path.startsWith('/project/')) {
          const slug = path.split('/').pop();
          if (slug) {
            window.history.pushState({}, "", `/projects/${slug}`);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
        } else if (path.startsWith('/blog/')) {
          const slug = path.split('/').pop();
          if (slug) {
            window.history.pushState({}, "", `/blog/${slug}`);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
        } else {
          const page = path.substring(1);
          onPageChange?.(page);
        }
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
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.button
              key="closed-state"
              onClick={() => setIsOpen(true)}
              className="absolute inset-0 w-full h-full flex items-center justify-center text-white outline-none cursor-pointer"
            >
              <div className="grid grid-cols-3 gap-[3px] w-[18px]">
                {[...Array(9)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-[4px] h-[4px] rounded-full ${i === 4 ? 'bg-transparent' : 'bg-current'} ${isLoading ? 'animate-pulse' : ''}`}
                  />
                ))}
              </div>
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
                      {/* Links are rendered inline via markdown in msg.text */}
                      {msg.loading ? (
                        <div className="flex items-center gap-3">
                          <span className="text-white/60 italic">Thinking...</span>
                          <div className="w-16 h-3 bg-white/6 rounded animate-pulse" />
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Loading indicator is handled by the message stream itself; no duplicate header here */}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="px-5 py-4 bg-black relative shrink-0">
                <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
                  <div className="flex-shrink-0 text-[white] flex items-center justify-center opacity-80">
                    <div className="grid grid-cols-3 gap-[3px] w-[18px]">
                      {[...Array(9)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-[4px] h-[4px] rounded-full ${i === 4 ? 'bg-transparent' : 'bg-current'} ${isLoading ? 'animate-pulse' : ''}`}
                        />
                      ))}
                    </div>
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
