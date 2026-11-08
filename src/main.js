import '@fontsource-variable/inter';

import './styles/index.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { initLoader } from './components/loader.js';
import { initClock } from './components/clock.js';
import { initLinks } from './components/links.js';
import { mountLists } from './components/rows.js';
import { initHeader } from './components/header.js';
import { initHero } from './components/hero.js';
import { initMenu } from './components/menu.js';
import { fitText } from './lib/fit.js';
import { initScale } from './lib/scale.js';
import { lineReveals, softReveals, heroIntro, reduced } from './lib/reveal.js';
import { initScrollBlur } from './lib/blur.js';
import { initSmoothScroll } from './lib/scroll.js';
import { splitLines } from './lib/split.js';
import { initGrainText, renderGrainText } from './lib/grain-text.js';

gsap.registerPlugin(ScrollTrigger);

const applyScale = initScale();

const SPLIT = '[data-split]';

function fitDisplays() {
  const heroTitle = document.querySelector('.hero__stage .display');
  const heroStage = document.querySelector('.hero__stage');
  if (heroTitle && heroStage) fitText(heroTitle, { limit: heroStage, min: 18 });

  const cta = document.querySelector('.footer__stage .display');
  const footerStage = document.querySelector('.footer__stage');
  if (cta && footerStage) fitText(cta, { limit: footerStage, min: 18 });
}

function splitAll() {
  document.querySelectorAll(SPLIT).forEach((el) => splitLines(el));
}

async function boot() {
  initLinks();
  mountLists();
  initClock();
  initMenu();

  // sizing the display type has to happen against the real face, not the fallback
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  applyScale();
  fitDisplays();
  splitAll();
  initGrainText();

  // the hidden states have to exist while the curtain still covers the page,
  // otherwise the first thing the page does is show its finished layout and
  // then animate into it
  lineReveals();
  softReveals();

  // the hero plays as the curtain lifts, not after it has gone
  await initLoader(heroIntro);

  initHeader();
  initHero();
  initScrollBlur();
  initSmoothScroll();

  ScrollTrigger.refresh();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      applyScale();
      fitDisplays();
      splitAll();
      renderGrainText();
      if (!reduced()) gsap.set(`${SPLIT} .ln__i`, { yPercent: 0 });
      ScrollTrigger.refresh();
    }, 180);
  });
}

boot();
