import { gsap } from 'gsap';
import {
  siFigma,
  siGithub,
  siJavascript,
  siOpencode,
  siPython,
  siReact,
  siTypescript,
} from 'simple-icons';
import { vsCodePath } from '../lib/icons.js';
import { DUR, EASE } from '../lib/motion.js';
import { env, whenIdle } from '../lib/env.js';
import { projects, stack } from '../data.js';

const ICONS = {
  vscode: { path: vsCodePath },
  figma: siFigma,
  github: siGithub,
  javascript: siJavascript,
  opencode: siOpencode,
  python: siPython,
  react: siReact,
  typescript: siTypescript,
};

const CODE_GLYPH =
  'M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6zM14.6 16.6 19.2 12l-4.6-4.6L16 6l6 6-6 6z';

function iconMark(key) {
  const icon = ICONS[key];
  const path = icon ? icon.path : CODE_GLYPH;
  return `<span class="plate__mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg></span>`;
}

function mediaFor(item, kind) {
  if (kind === 'stack') {
    return `<div class="plate plate--logo">${iconMark(item.icon)}</div>`;
  }

  return `<div class="plate plate--photo">
    <img src="${item.image}" alt="${item.name} mockup" loading="eager" decoding="async" />
  </div>`;
}

function build(root, items, kind) {
  root.innerHTML = items
    .map(
      (item, index) => `<div class="row" tabindex="0" data-index="${index}" aria-label="${item.name}">
        <span class="row__name">${item.name}</span>
        <span class="row__desc">${item.desc}</span>
        ${kind === 'projects' ? `<span class="row__date">${item.date}</span>` : ''}
      </div>`,
    )
    .join('');

  const hint = document.createElement('span');
  hint.className = 'rows__hint';
  hint.textContent = '(Hover)';
  hint.setAttribute('aria-hidden', 'true');

  const box = document.createElement('div');
  box.className = 'rows__box';

  const media = document.createElement('div');
  media.className = 'rows__media';

  root.append(hint, box, media);
  return { box, media };
}

function interact(root, items, kind, box, media) {
  const rows = [...root.querySelectorAll('.row')];
  const coarse = window.matchMedia('(hover: none)').matches;
  // everything has a plate but only projects with a mockup have a photo in it
  const hasMedia = (index) => kind === 'stack' || Boolean(items[index]?.image);
  let current = -1;
  let open = false;

  gsap.set(media, { xPercent: -50, yPercent: -50, opacity: 0, scale: 0.94 });
  gsap.set(box, { y: 0 });

  const magnetX = gsap.quickTo(media, 'x', { duration: DUR.large, ease: EASE.out });
  const magnetY = gsap.quickTo(media, 'y', { duration: DUR.large, ease: EASE.out });
  // quickTo retargets the same tween, so the highlight glides through a fast
  // pass down the list instead of restarting its ease on every row
  const boxY = gsap.quickTo(box, 'y', { duration: DUR.slow, ease: EASE.out });
  const boxH = gsap.quickTo(box, 'height', { duration: DUR.slow, ease: EASE.out });

  const hide = () => {
    if (!open) return;
    open = false;
    current = -1;
    gsap.to(box, { opacity: 0, duration: DUR.fast, ease: EASE.in, overwrite: 'auto' });
    gsap.to(media, { opacity: 0, duration: DUR.fast, ease: EASE.in, overwrite: 'auto' });
  };

  // stack marks swap in one step, the way this list behaved originally: the old
  // vector is replaced outright, so two logos are never on screen at once, then
  // the new one fades in from a touch larger
  const swapLogo = (index) => {
    media.innerHTML = mediaFor(items[index], 'stack');
    const plate = media.firstElementChild;
    if (!plate) return;
    gsap.fromTo(
      plate,
      { scale: 1.04, opacity: 0 },
      { scale: 1, opacity: 1, duration: DUR.slow, ease: EASE.out },
    );
  };

  // the incoming shot wipes up over the one on screen, which holds still as the
  // backdrop until the reveal finishes: a new row reads as a sheet arriving,
  // not a dissolve. At most two plates exist, so fast passes cannot pile up.
  const swapMedia = (index) => {
    const showing = media.lastElementChild;
    [...media.children].forEach((plate) => {
      if (plate !== showing) plate.remove();
    });

    if (!hasMedia(index)) {
      if (!showing) return;
      gsap.to(showing, {
        opacity: 0,
        duration: DUR.fast,
        ease: EASE.in,
        onComplete: () => showing.remove(),
      });
      return;
    }

    if (kind === 'stack') {
      swapLogo(index);
      return;
    }

    const holder = document.createElement('div');
    holder.innerHTML = mediaFor(items[index], kind);
    const plate = holder.firstElementChild;
    if (!plate) return;

    if (showing) {
      // a wipe that was still running is snapped to fully showing, so it can
      // cover the previous frame while the new one travels over it
      gsap.killTweensOf(showing);
      gsap.set(showing, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 });
    }

    const inner = plate.querySelector('img') || plate;

    media.append(plate);
    gsap.fromTo(
      plate,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: DUR.large,
        ease: EASE.out,
        onComplete: () => {
          if (showing) showing.remove();
        },
      },
    );
    // the shot settles inside the wipe, so the reveal has depth rather than
    // just a moving edge
    gsap.fromTo(inner, { scale: 1.1 }, { scale: 1, duration: DUR.large, ease: EASE.out });
  };

  const magnet = (event) => {
    const rect = root.getBoundingClientRect();
    magnetX((event.clientX - (rect.left + rect.width / 2)) * 0.07);
    magnetY((event.clientY - (rect.top + rect.height / 2)) * 0.07);
  };

  const select = (index, event) => {
    const row = rows[index];
    if (!row) return;

    const changed = index !== current;

    if (changed) {
      current = index;
      const rowRect = row.getBoundingClientRect();
      const listRect = root.getBoundingClientRect();

      boxY(rowRect.top - listRect.top);
      boxH(rowRect.height);
      swapMedia(index);
    }

    // one fade per entry, not one per pointermove: re-tweening the same values
    // while the cursor travels inside a row only fights the running tween
    if (changed || !open) {
      open = true;
      gsap.to(box, { opacity: 1, duration: DUR.base, ease: EASE.out, overwrite: 'auto' });
      gsap.to(media, {
        opacity: hasMedia(index) ? 1 : 0,
        scale: 1,
        duration: DUR.slow,
        ease: EASE.out,
        overwrite: 'auto',
      });
    }

    if (event) magnet(event);
  };

  if (!coarse) {
    root.addEventListener('pointermove', (event) => {
      const row = event.target.closest('.row');
      if (!row) {
        hide();
        return;
      }
      select(rows.indexOf(row), event);
    }, { passive: true });
    root.addEventListener('pointerleave', hide);
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('blur', hide);
  } else {
    root.addEventListener('click', (event) => {
      const row = event.target.closest('.row');
      if (!row) return;
      const index = rows.indexOf(row);
      if (open && current === index) hide();
      else select(index);
    });
  }

  window.addEventListener('resize', () => {
    if (!open || current < 0) return;
    const rowRect = rows[current].getBoundingClientRect();
    const listRect = root.getBoundingClientRect();
    gsap.set(box, { y: rowRect.top - listRect.top, height: rowRect.height });
  });
}

export function mountLists() {
  // Preload the hover shots once the page is idle, not during boot: on a slow
  // connection they used to compete with the font and the portrait, and the
  // loader waited for all of them. Metered connections load on demand.
  if (!env().slowNetwork) {
    whenIdle(() => {
      projects.forEach((item) => {
        if (!item.image) return;
        const image = new Image();
        image.decoding = 'async';
        image.src = item.image;
      });
    }, 2500);
  }

  document.querySelectorAll('[data-rows]').forEach((root) => {
    const kind = root.dataset.rows === 'stack' ? 'stack' : 'projects';
    const items = kind === 'stack' ? stack : projects;
    const { box, media } = build(root, items, kind);
    interact(root, items, kind, box, media);
  });
}
