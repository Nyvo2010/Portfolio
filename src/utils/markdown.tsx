import React from "react";
import remarkGfm from "remark-gfm";
import { getItemClass } from "./grid";

const markdownComponents = {
  a: ({node, ...props}: any) => (
    <a 
      href={props.href} 
      className="text-black underline decoration-black/20 hover:decoration-black transition-all duration-300"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  h3: ({node, ...props}: any) => <h3 className="text-3xl mt-20 mb-8 tracking-tighter font-medium uppercase leading-none" {...props} />,
  h4: ({node, ...props}: any) => <h4 className="text-2xl mt-12 mb-6 tracking-tight uppercase font-medium" {...props} />,
  p: ({node, children, ...props}: any) => {
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
  ul: ({node, ...props}: any) => <ul className="list-none pl-0 mb-10 space-y-4" {...props} />,
  li: ({node, children, ...props}: any) => (
    <li className="flex items-start gap-4 text-xl opacity-60" {...props}>
      <span className="w-1.5 h-1.5 rounded-full bg-black/20 mt-3 shrink-0" />
      {children}
    </li>
  ),
  hr: ({node, ...props}: any) => <hr className="my-16 border-black/5" {...props} />,
  blockquote: ({node, ...props}: any) => <blockquote className="border-l-[1px] border-black/20 pl-10 italic mb-10 text-3xl tracking-tight opacity-80 py-4" {...props} />,
};

export const markdownPlugins = [remarkGfm];
export { markdownComponents };