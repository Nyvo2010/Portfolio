import { useEffect, useRef } from 'react';

export function useClickOutside(handler: () => void) {
  const domNode = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const maybeHandler = (event: MouseEvent | TouchEvent) => {
      if (domNode.current && !domNode.current.contains(event.target as Node)) {
        handler();
      }
    };

    const scrollHandler = (event: Event) => {
      if (domNode.current) {
        // If the scroll happened inside the bounds of the node, ignore it.
        if (domNode.current.contains(event.target as Node)) {
          return;
        }
        
        // Use matches(':hover') as a fallback for desktop, but primarily we just close on external scroll
        // However matches(':hover') might not work on touch devices, so just closing on any external scroll is safest.
        if (!domNode.current.matches(':hover')) {
          handler();
        }
      }
    };

    document.addEventListener('mousedown', maybeHandler);
    document.addEventListener('touchstart', maybeHandler);
    document.addEventListener('scroll', scrollHandler, { capture: true, passive: true });

    return () => {
      document.removeEventListener('mousedown', maybeHandler);
      document.removeEventListener('touchstart', maybeHandler);
      document.removeEventListener('scroll', scrollHandler, { capture: true });
    };
  }, [handler]);

  return domNode;
}
