import { initScale } from './lib/scale.js';
import { initLayout } from './lib/layout.js';
import { initLinks } from './components/links.js';
import { initClock } from './components/clock.js';
import { initPageTransition } from './components/page-transition.js';
import { initGrainText, renderGrainText } from './lib/grain-text.js';

const applyScale = initScale();
initLayout(() => {
  applyScale();
  renderGrainText();
});
initLinks();
initClock();
initPageTransition();

// The heading gets the same grain treatment as the homepage display type.
const paint = () =>
  initGrainText().catch((error) => {
    console.error('[portfolio] grain', error);
  });

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(paint).catch(paint);
} else {
  paint();
}
