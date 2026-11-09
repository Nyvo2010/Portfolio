import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../lib/env.js';

/** The hint is only useful at the top; fading it keeps it out of the header. */
export function initHero() {
  const hero = document.querySelector('.hero');
  const foot = document.querySelector('.hero__foot');
  if (!hero || !foot || prefersReducedMotion()) return;

  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: '+=260',
    onUpdate: (self) => {
      gsap.set(foot, { autoAlpha: 1 - Math.min(1, self.progress * 1.5) });
    },
  });
}
