import '@fontsource-variable/inter';

import './styles/index.css';

import { initLinks } from './components/links.js';
import { initClock } from './components/clock.js';
import { initMenu } from './components/menu.js';
import { initLabCanvas } from './components/lab-canvas.js';
import { initLabLoader } from './components/lab-loader.js';
import { initPageTransition } from './components/page-transition.js';
import { getLabPieces } from './lib/lab-pieces.js';
import { initScale } from './lib/scale.js';
import { initGrainText } from './lib/grain-text.js';
import { introHeader } from './lib/reveal.js';
import { wait } from './lib/env.js';

function safe(label, fn) {
  try {
    return fn();
  } catch (error) {
    console.error(`[lab] ${label}`, error);
    return undefined;
  }
}

// Tells the inline failsafe in labs/index.html that this module owns the
// curtain: a slow folder probe must not look like a dead module.
document.documentElement.setAttribute('data-lab-booting', '1');

safe('scale', initScale);
safe('links', initLinks);
safe('page transition', initPageTransition);
safe('clock', initClock);
safe('menu', initMenu);

async function boot() {
  // Every file in public/assets/lab is a piece, so the folder can be edited
  // freely. Dimensions and cut-out state arrive from the images themselves.
  // This is the slowest part of the boot, so it runs alongside the loader's
  // count and the curtain waits for it before lifting: number first, then
  // canvas, never an empty field behind a cleared curtain.
  const built = getLabPieces()
    .then((pieces) =>
      pieces.length ? safe('canvas', () => initLabCanvas(pieces)) : undefined,
    )
    .catch((error) => {
      console.error('[lab] pieces', error);
      return undefined;
    });

  // Runs with the curtain still up and the count already settled. The wordmark
  // is measured against the real face and painted before anyone sees it, so
  // plain text never switches to grain in front of the visitor. The plates
  // arrive during the same beat, so the stagger reads as the page arriving,
  // and the header rides the same intro as the homepage.
  const reveal = async () => {
    const canvas = await built;
    if (document.fonts && document.fonts.ready) {
      await Promise.race([document.fonts.ready, wait(1200)]);
    }
    try {
      await initGrainText('[data-grain]');
    } catch (error) {
      console.error('[lab] grain', error);
    }
    if (canvas && canvas.reveal) canvas.reveal();
    safe('header', introHeader);
  };

  safe('loader', () => {
    initLabLoader(reveal, built).catch((error) => {
      console.error('[lab] loader', error);
      const el = document.querySelector('[data-lab-loader]');
      if (el) el.remove();
      reveal();
    });
  });
}

boot();
