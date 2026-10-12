import React from 'react';
import ReactDOM from 'react-dom/client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import App from './App';
import './index.css';
import { setLenis } from './utils/smooth';

gsap.registerPlugin(ScrollTrigger);

// A tiny bit of wheel smoothing on desktop — Lenis drives native scroll
// and notifies ScrollTrigger, so the scrubbed Works act and the blob
// exit stay perfectly in sync. Reduced-motion and touch keep native.
if (
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  const lenis = new Lenis({ lerp: 0.12 });
  setLenis(lenis);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
