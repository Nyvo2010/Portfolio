import { useState, useEffect, useRef } from "react";
import yaml from "js-yaml";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getItemClass } from "./Gallery";

import Footer from "./Footer";

interface Post {
  title: string;
  date: string;
  summary: string;
  content: string;
  id: string;
  tags?: string[];
}

interface BlogProps {
  onPageChange: (page: string) => void;
  activePage: string;
}

export default function Blog({ onPageChange, activePage }: BlogProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activePage === "blog") {
      setSelectedPost(null);
    }
  }, [activePage]);

  useEffect(() => {
    // Load all YAML files from the content directory
    const rawPosts = (import.meta as any).glob("/src/content/blog/*.yaml", { query: "?raw", eager: true });
    
    const parsedPosts = Object.entries(rawPosts).map(([path, module]: [string, any]) => {
      const content = module && typeof module === 'object' && 'default' in module ? module.default : module;
      if (typeof content !== 'string') {
        console.error(`Expected string content for ${path}, got ${typeof content}`);
        return null;
      }
      try {
        const data = yaml.load(content) as any;
        const id = path.split("/").pop()?.replace(".yaml", "") || Math.random().toString();
        return { ...data, id };
      } catch (e) {
        console.error(`Error parsing YAML for ${path}:`, e);
        return null;
      }
    }).filter((post): post is Post => post !== null);

    const sorted = [...parsedPosts].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return (timeB || 0) - (timeA || 0);
    });
    setPosts(sorted);
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-[60] bg-[#f7f7f5] flex flex-col items-center overflow-y-auto scroll-smooth">
      <div className="w-full max-w-6xl mx-auto px-6 md:px-12 lg:px-20 py-32 md:py-48 flex flex-col items-center">
        {!selectedPost && (
          <div className="w-full max-w-3xl flex flex-col items-start w-full">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              className="text-7xl md:text-9xl tracking-tighter mb-24 uppercase font-medium"
            >
              Blog
            </motion.h2>
          </div>
        )}

        {!selectedPost ? (
          <div className="flex flex-col border-y border-black/5 w-full max-w-3xl">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: [0.23, 1, 0.32, 1] }}
                onClick={() => {
                  setSelectedPost(post);
                  onPageChange("blog_post");
                  containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group cursor-pointer border-t first:border-t-0 border-black/5 py-16"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                  <div className="flex-1">
                    <div className="mb-6">
                      <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">{post.date}</span>
                    </div>
                    <h3 className="text-4xl md:text-6xl tracking-tighter mb-6 group-hover:pl-6 transition-all duration-500 uppercase font-medium leading-[0.9]">
                      {post.title}
                    </h3>
                    <p className="text-lg opacity-40 max-w-xl font-medium">{post.summary}</p>
                    {post.tags && (
                      <div className="flex flex-wrap gap-2 mt-8">
                        {post.tags.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-black/5 text-[10px] uppercase tracking-widest font-bold text-black/40 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col items-center w-full"
          >
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col mb-24 w-full max-w-3xl"
            >
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-6 font-bold">Blog Post</span>
                <h3 className="text-5xl md:text-9xl tracking-tighter leading-[0.85] uppercase font-medium mb-4">{selectedPost.title}</h3>
                <div className="flex flex-col gap-4 mb-12">
                  <span className="text-xs uppercase tracking-widest opacity-40 font-bold">{selectedPost.date}</span>
                  {selectedPost.tags && (
                    <div className="flex flex-wrap gap-2">
                      {selectedPost.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-black/5 text-[10px] uppercase tracking-widest font-bold text-black/20 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
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
                                  className="w-full h-full object-cover transition-all duration-1000 ease-out" 
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
                  {selectedPost.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          </motion.div>
        )}

        <Footer onPageChange={onPageChange} />
      </div>
    </div>
  );
}
