import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Header travels with the page, then leaves when the footer arrives. */
export function initHeader() {
  const header = document.querySelector('[data-header]');
  const footer = document.querySelector('[data-footer]');
  if (!header || !footer) return;

  const offset = () => header.offsetHeight + 8;

  gsap.set(header, { yPercent: 0 });

  ScrollTrigger.create({
    trigger: footer,
    start: () => `top ${offset()}px`,
    onEnter: () => {
      gsap.to(header, { yPercent: -115, duration: 0.5, ease: 'power2.out', overwrite: true });
    },
    onLeaveBack: () => {
      gsap.to(header, { yPercent: 0, duration: 0.6, ease: 'power2.out', overwrite: true });
    },
  });
}
