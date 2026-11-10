import '@fontsource-variable/inter';

import './styles/index.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { initLoader } from './components/loader.js';
import { initClock } from './components/clock.js';
import { initLinks } from './components/links.js';
import { mountLists } from './components/rows.js';
import { initLabHint } from './components/lab-hint.js';
import { initPageTransition } from './components/page-transition.js';
import { initHeader } from './components/header.js';
import { initHero } from './components/hero.js';
import { initMenu } from './components/menu.js';
import { fitText } from './lib/fit.js';
import { initScale } from './lib/scale.js';
import { lineReveals, softReveals, heroIntro } from './lib/reveal.js';
import { initLayout, onLayout } from './lib/layout.js';
import { initScrollBlur } from './lib/blur.js';
import { splitLines, unsplit } from './lib/split.js';
import { initGrainText, renderGrainText } from './lib/grain-text.js';
import { initGrainImages } from './lib/grain-image.js';
import { nextFrame } from './lib/env.js';

gsap.registerPlugin(ScrollTrigger);

// iOS/Android report a resize every time the URL bar slides away. Recomputing
// the whole type system and every grain canvas mid-scroll was the single
// biggest source of mobile jank.
ScrollTrigger.config({ ignoreMobileResize: true });

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

const mobile = window.matchMedia('(max-width: 860px)');

function splitAll() {
  document.querySelectorAll(SPLIT).forEach((el) => {
    // a phone has no width for one element per rendered line: the type wraps to
    // a word or two, and justifying those lines opens gaps wide enough to read
    // as broken. There the browser owns the line breaks, and the grain effect
    // (which paints one canvas per line) sits out.
    if (mobile.matches) unsplit(el);
    else splitLines(el);
  });
}

/**
 * The type is always rebuilt in one order: back to plain text, fit to the stage,
 * then split. Fitting a block that is already split measures the line breaks of
 * the previous width, so the fitted size can force an extra wrap. Every path
 * that changes the width goes through here, so boot, resize and a late font all
 * land on the same layout.
 */
function relayoutType() {
  document.querySelectorAll(SPLIT).forEach((el) => unsplit(el));
  fitDisplays();
  splitAll();
}

/** One failing effect must never stop the rest of the page from booting. */
function safe(label, fn) {
  try {
    return fn();
  } catch (error) {
    console.error(`[portfolio] ${label}`, error);
    return undefined;
  }
}

/**
 * The fallback face is visible until the variable font arrives. Waiting
 * forever was another way the curtain could stall, so the wait is capped; if
 * the font lands late the layout is rebuilt once instead of being left wrong.
 */
async function readyFonts() {
  if (!document.fonts || !document.fonts.ready) return false;
  let timedOut = false;
  const timeout = new Promise((resolve) => {
    setTimeout(() => {
      timedOut = true;
      resolve();
    }, 3000);
  });
  await Promise.race([document.fonts.ready, timeout]);
  return timedOut;
}

/** Last-resort paint: remove every hidden state if boot fails part-way. */
function revealFallback() {
  safe('fallback', () => {
    document.querySelectorAll('.is-grain').forEach((el) => {
      el.classList.remove('is-grain', 'is-grain--block');
      el.querySelectorAll('.grain__c').forEach((canvas) => canvas.remove());
    });
    gsap.set(`${SPLIT} .ln__i`, { yPercent: 0, opacity: 1 });
    gsap.set('[data-rise], [data-rows] .row, .header__inner', {
      opacity: 1,
      y: 0,
      clearProps: 'transform',
    });
  });
}

async function boot() {
  safe('links', initLinks);
  safe('page transition', initPageTransition);
  safe('lists', mountLists);
  safe('lab hint', initLabHint);
  safe('clock', initClock);
  safe('menu', initMenu);

  // One ordered pass for every viewport change, installed before the first
  // paint so a resize during boot and one after it take the same path.
  // Components registered their own work on top of it (grain images, row
  // geometry, the lab cluster); the forced variant serves late fonts.
  const relayoutNow = initLayout(() => {
    applyScale();
    relayoutType();
    lineReveals();
    renderGrainText();
  });

  // sizing the display type has to happen against the real face, not the fallback
  const fontTimedOut = await readyFonts();

  safe('scale', applyScale);
  safe('type', relayoutType);

  // the hidden states have to exist while the curtain still covers the page,
  // otherwise the first thing the page does is show its finished layout and
  // then animate into it
  safe('line reveals', lineReveals);
  safe('soft reveals', softReveals);

  // let the loader's counter paint before the canvas work starts
  await nextFrame();

  // the hero grain is part of the first frame, so it is painted before the
  // curtain lifts; every other block waits until it is near the viewport
  try {
    await initGrainText();
  } catch (error) {
    console.error('[portfolio] grain', error);
  }

  safe('grain image', initGrainImages);

  // the hero plays as the curtain lifts, not after it has gone
  await initLoader(heroIntro);

  safe('header', initHeader);
  safe('hero', initHero);
  safe('scroll blur', initScrollBlur);

  ScrollTrigger.refresh();
  // last on every resize: every trigger measures the finished layout
  onLayout(() => ScrollTrigger.refresh());

  if (fontTimedOut && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => safe('late fonts', relayoutNow));
  }
}

// If a runtime error happens before the curtain is lifted, take the curtain
// down and show the content instead of leaving a dead loading screen.
window.addEventListener('error', () => {
  if (!document.querySelector('[data-loader]')) return;
  if (typeof window.__loaderDismiss === 'function') window.__loaderDismiss();
  revealFallback();
});

window.addEventListener('unhandledrejection', () => {
  if (!document.querySelector('[data-loader]')) return;
  if (typeof window.__loaderDismiss === 'function') window.__loaderDismiss();
  revealFallback();
});

boot().catch((error) => {
  console.error('[portfolio] boot', error);
  if (typeof window.__loaderDismiss === 'function') window.__loaderDismiss();
  revealFallback();
});
