import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DUR, EASE } from '../lib/motion.js';
import { prefersReducedMotion } from '../lib/env.js';

/** Header travels with the page, then leaves when the footer arrives. */
export function initHeader() {
  const header = document.querySelector('[data-header]');
  const footer = document.querySelector('[data-footer]');
  if (!header || !footer || prefersReducedMotion()) return;

  const offset = () => header.offsetHeight + 8;

  ScrollTrigger.create({
    trigger: footer,
    start: () => `top ${offset()}px`,
    // one duration and one curve in both directions, so the return is the exact
    // reverse of the departure
    onEnter: () =>
      gsap.to(header, {
        yPercent: -115,
        duration: DUR.slow,
        ease: EASE.inOut,
        overwrite: true,
      }),
    onLeaveBack: () =>
      gsap.to(header, {
        yPercent: 0,
        duration: DUR.slow,
        ease: EASE.inOut,
        overwrite: true,
      }),
  });
}
