import { gsap } from 'gsap';
import { DUR, EASE, STAGGER } from '../lib/motion.js';
import { prefersReducedMotion } from '../lib/env.js';

/**
 * Infinite canvas.
 *
 * The pieces sit on a regular lattice: one cell per image, a single fixed gap
 * between every pair of centres. Movement is a camera in world space; each
 * plate is placed with its wrapped offset from that camera, so the lattice
 * repeats for ever without a huge scrolling layer. Wrapping only moves a plate
 * while it is well outside the viewport, and only transform is written per
 * frame, which keeps a drag on the compositor.
 */

/* A throw is measured over a fixed recent window, so a slow trackpad and a
   fast mouse produce the same momentum for the same gesture. */
const THROW_WINDOW = 120;
const MAX_THROW = 1300;
const MIN_THROW = 170;
const THROW_DECAY = 6;
const STOP_SPEED = 45;

/** Wrapped offset in (-period / 2, period / 2]; 0 stays 0. */
const wrap = (value, period) => {
  const half = period / 2;
  const wrapped = ((value % period) + period) % period;
  return wrapped > half ? wrapped - period : wrapped;
};

function cellSize(vw, vh) {
  return Math.round(Math.max(240, Math.min(560, Math.min(vw, vh * 1.25) * 0.36)));
}

/**
 * Rows and columns for however many pieces the folder holds. Pairs that fill
 * every cell win, so the repeating lattice never shows an empty slot; if the
 * count has no such pair, the short last row is spread across the full width
 * instead of leaving a gap at its end.
 */
function gridFor(count) {
  let best = null;

  for (let cols = 1; cols <= count; cols += 1) {
    const rows = Math.ceil(count / cols);
    const ratio = cols / rows;
    // A single row of every image is not a grid; keep the tile roughly
    // landscape so the canvas reads as a field rather than a strip.
    if (ratio < 0.6 || ratio > 2.2) continue;

    const holes = cols * rows - count;
    const skew = Math.abs(ratio - 1.5);
    if (
      !best ||
      holes < best.holes ||
      (holes === best.holes && skew < best.skew)
    ) {
      best = { cols, rows, holes, skew };
    }
  }

  return best || { cols: count, rows: 1 };
}

/** Longer pieces get a little more room; portrait pieces stay slim. */
function widthFor(item, cell) {
  const ratio = item.w / item.h;
  const shrink = 0.9;
  if (ratio >= 1.6) return cell * 0.74 * shrink;
  if (ratio >= 1.2) return cell * 0.66 * shrink;
  if (ratio >= 0.9) return cell * 0.56 * shrink;
  if (ratio >= 0.68) return cell * 0.46 * shrink;
  return cell * 0.38 * shrink;
}

export function initLabCanvas(pieces = []) {
  const root = document.querySelector('[data-lab]');
  const field = document.querySelector('[data-lab-field]');
  if (!root || !field || !pieces.length) return;

  const reduced = prefersReducedMotion();
  const count = pieces.length;
  // The grid comes from the folder, not from a fixed shape: 24 images become
  // 6×4, 25 become 5×5, and a count without a clean factor keeps every slot
  // occupied anyway.
  const { cols, rows } = gridFor(count);

  let cell = 0;
  let periodX = 1;
  let periodY = 1;
  let vw = 0;
  let vh = 0;
  let signature = '';
  let instances = [];
  let revealed = false;
  let motion = 0;
  let warpX = 0;
  let warpY = 0;

  const cam = { x: 0, y: 0 };
  const lastCam = { x: 0, y: 0 };

  let raf = 0;
  let lastTime = 0;
  let dragging = false;
  let inertia = false;
  let follow = false;
  let vx = 0;
  let vy = 0;
  let targetX = 0;
  let targetY = 0;
  let pointerId = null;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lastPointerTime = 0;
  let travelled = 0;
  let pressed = null;
  let centerTween = null;
  const samples = [];

  // Rows are balanced (differ by at most one) instead of leaving a nearly
  // empty last row. A shorter row spreads its pieces over the same width, so
  // wrapping never opens a hole.
  const rowBase = Math.floor(count / rows);
  const wideRows = count % rows;
  const wideLength = rowBase + 1;
  const wideTotal = wideRows * wideLength;

  const slotFor = (index) => {
    if (index < wideTotal) {
      return { row: Math.floor(index / wideLength), col: index % wideLength, length: wideLength };
    }
    const rest = index - wideTotal;
    return { row: wideRows + Math.floor(rest / rowBase), col: rest % rowBase, length: rowBase };
  };

  const baseX = (index) => {
    const { row, col, length } = slotFor(index);
    // Each row is shifted by a different fraction of a cell, so the pieces
    // read as a scattered field rather than columns stacked in perfect lines.
    const shift = ((row * 0.37) % 1) * cell;
    return ((col + 0.5) / length - 0.5) * cols * cell + shift;
  };
  const baseY = (index) => (slotFor(index).row - (rows - 1) / 2) * cell;

  function copyOffsets(extent, maxSize, period) {
    const reach = extent / 2 + maxSize / 2 + 24;
    const extra = Math.max(0, Math.ceil((reach - period / 2) / period));
    const offsets = [0];
    for (let k = 1; k <= extra; k += 1) offsets.push(k * period, -k * period);
    return offsets;
  }

  function rebuild(offsetsX, offsetsY) {
    field.textContent = '';
    instances = [];

    pieces.forEach((item, index) => {
      const width = Math.round(widthFor(item, cell));
      offsetsX.forEach((offsetX) => {
        offsetsY.forEach((offsetY) => {
          const el = document.createElement('figure');
          el.className = 'lab-item';
          el.dataset.slug = item.slug;
          el.style.width = `${width}px`;
          el.style.aspectRatio = `${item.w} / ${item.h}`;
          // every plate answers the drag at a slightly different rate, so a
          // fast pan ripples through the lattice instead of shifting as a slab
          el.style.setProperty('--warp', (0.9 + (index % 4) * 0.07).toFixed(2));
          el.tabIndex = offsetX === 0 && offsetY === 0 ? 0 : -1;
          el.setAttribute('role', 'button');
          el.setAttribute('aria-label', `${item.alt} — centre this piece`);

          const inner = document.createElement('div');
          inner.className = 'lab-item__inner';

          if (item.transparent) el.classList.add('is-transparent');

          const image = document.createElement('img');
          image.src = item.src;
          image.alt = '';
          image.width = item.w;
          image.height = item.h;
          image.loading = 'eager';
          image.decoding = 'async';
          image.draggable = false;
          image.addEventListener('load', () => el.classList.add('is-loaded'), { once: true });

          inner.append(image);
          el.append(inner);

          if (image.complete) el.classList.add('is-loaded');

          field.append(el);
          instances.push({
            el,
            x: baseX(index) + offsetX,
            y: baseY(index) + offsetY,
            blur: -1,
          });
        });
      });
    });
  }

  function layout() {
    vw = document.documentElement.clientWidth;
    vh = window.innerHeight;
    cell = cellSize(vw, vh);
    periodX = cols * cell;
    periodY = rows * cell;

    const widths = pieces.map((item) => widthFor(item, cell));
    const maxW = Math.max(...widths);
    const maxH = Math.max(...pieces.map((item, index) => (widths[index] * item.h) / item.w));

    const offsetsX = copyOffsets(vw, maxW, periodX);
    const offsetsY = copyOffsets(vh, maxH, periodY);
    const next = `${cell}|${offsetsX.join(',')}|${offsetsY.join(',')}`;

    if (next !== signature) {
      signature = next;
      rebuild(offsetsX, offsetsY);
    }

    apply();
  }

  function apply() {
    const halfW = vw / 2;
    const halfH = vh / 2;

    for (let i = 0; i < instances.length; i += 1) {
      const instance = instances[i];
      const x = halfW + wrap(instance.x - cam.x, periodX);
      const y = halfH + wrap(instance.y - cam.y, periodY);
      instance.el.style.transform = `translate3d(${Math.round(x * 100) / 100}px, ${
        Math.round(y * 100) / 100
      }px, 0) translate(-50%, -50%)`;

      // depth of field: the centre of the canvas stays sharp and the pieces
      // towards the edges soften. Only the class write happens per threshold,
      // not a new blur radius every frame.
      const distance = Math.hypot((x - halfW) / halfW, (y - halfH) / halfH);
      const level = distance > 1.25 ? 2 : distance > 0.8 ? 1 : 0;
      if (level !== instance.blur) {
        instance.blur = level;
        instance.el.classList.toggle('is-far', level === 1);
        instance.el.classList.toggle('is-farther', level === 2);
      }
    }
  }

  function setMotion(value) {
    if (Math.abs(value - motion) < 0.04) return;
    motion = value;
    root.style.setProperty('--motion', value.toFixed(2));
  }

  // A tiny elastic give: the plates lean into the direction of travel and
  // stretch by a hair, then settle back to their exact shape when the camera
  // stops. Driven by velocity rather than per-frame displacement, so a drag
  // that delivers pointer samples unevenly still holds a steady lean instead
  // of flickering back to square between events. Deliberately small, so still
  // pieces are never deformed.
  function setWarp(velocityX, velocityY, dt) {
    const limit = (value) => Math.max(-2.4, Math.min(2.4, value));
    const targetX = limit(-velocityX * 0.0024);
    const targetY = limit(velocityY * 0.0024);
    const ease = 1 - Math.exp(-14 * dt);

    warpX += (targetX - warpX) * ease;
    warpY += (targetY - warpY) * ease;

    const stretch = Math.min(0.014, Math.hypot(warpX, warpY) * 0.005);
    root.style.setProperty('--drag-x', `${warpX.toFixed(2)}deg`);
    root.style.setProperty('--drag-y', `${warpY.toFixed(2)}deg`);
    root.style.setProperty('--drag-stretch', stretch.toFixed(3));
  }

  function resetWarp() {
    if (!warpX && !warpY) return;
    warpX = 0;
    warpY = 0;
    root.style.setProperty('--drag-x', '0deg');
    root.style.setProperty('--drag-y', '0deg');
    root.style.setProperty('--drag-stretch', '0');
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    if (reduced) return;
    gsap.from(field.querySelectorAll('.lab-item__inner'), {
      opacity: 0,
      duration: DUR.large,
      stagger: { each: STAGGER.card, from: 'center' },
      ease: EASE.out,
      clearProps: 'opacity',
    });
  }

  function start() {
    if (raf) return;
    lastTime = performance.now();
    lastCam.x = cam.x;
    lastCam.y = cam.y;
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    const fromX = lastCam.x;
    const fromY = lastCam.y;
    let active = false;

    if (dragging) {
      active = true;
    } else if (inertia) {
      cam.x += vx * dt;
      cam.y += vy * dt;
      const decay = Math.exp(-THROW_DECAY * dt);
      vx *= decay;
      vy *= decay;
      if (Math.hypot(vx, vy) < STOP_SPEED) {
        inertia = false;
        vx = 0;
        vy = 0;
      } else {
        active = true;
      }
    }

    if (follow && !dragging) {
      // a gentler follow than a drag: the wheel glides to its target instead of
      // snapping there, which keeps trackpad scrolling from feeling twitchy
      const ease = 1 - Math.exp(-9 * dt);
      const dx = targetX - cam.x;
      const dy = targetY - cam.y;
      cam.x += dx * ease;
      cam.y += dy * ease;
      if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) {
        cam.x = targetX;
        cam.y = targetY;
        follow = false;
      } else {
        active = true;
      }
    }

    apply();

    if (active || dragging) {
      root.classList.add('is-moving');

      if (!reduced) {
        // A drag's pointer velocity is fresh only while events keep arriving;
        // hold still and the plates settle even though the pointer is down.
        let velocityX = (cam.x - fromX) / dt;
        let velocityY = (cam.y - fromY) / dt;
        if (dragging || inertia) {
          const fresh = dragging && performance.now() - lastPointerTime < 90;
          velocityX = fresh || inertia ? vx : 0;
          velocityY = fresh || inertia ? vy : 0;
        }
        setWarp(velocityX, velocityY, dt);
      }
    } else {
      root.classList.remove('is-moving');
      if (!reduced) resetWarp();
    }

    // Motion blur is a single backdrop layer whose strength follows the speed
    // of the camera, so it costs one composited layer instead of re-blurring
    // every plate each frame. Reduced motion keeps direct manipulation but
    // drops the decorative blur and lean.
    const speed = Math.hypot(cam.x - fromX, cam.y - fromY) / dt;
    lastCam.x = cam.x;
    lastCam.y = cam.y;
    if (reduced) {
      setMotion(0);
    } else if (!active && !dragging) {
      setMotion(0);
    } else {
      // Hold the blur briefly between pointer samples: events can arrive less
      // often than frames, and a blur that blinks off between them reads as a
      // stutter rather than speed.
      const decayed = motion * Math.exp(-dt * 10);
      setMotion(Math.max(Math.min(1, speed / 2200), decayed));
    }

    if (active || dragging) raf = requestAnimationFrame(frame);
  }

  function focus(instance) {
    if (!instance) return;
    if (centerTween) centerTween.kill();
    inertia = false;
    follow = false;
    setMotion(0);
    resetWarp();
    root.classList.remove('is-moving');

    const toX = cam.x + wrap(instance.x - cam.x, periodX);
    const toY = cam.y + wrap(instance.y - cam.y, periodY);
    targetX = toX;
    targetY = toY;

    if (reduced) {
      cam.x = toX;
      cam.y = toY;
      apply();
      return;
    }

    centerTween = gsap.to(cam, {
      x: toX,
      y: toY,
      duration: DUR.travel,
      ease: EASE.inOut,
      onUpdate: apply,
      onComplete: () => {
        centerTween = null;
      },
    });
  }

  root.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (centerTween) {
      centerTween.kill();
      centerTween = null;
    }

    dragging = true;
    inertia = false;
    follow = false;
    targetX = cam.x;
    targetY = cam.y;
    pointerId = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerTime = performance.now();
    travelled = 0;
    vx = 0;
    vy = 0;
    samples.length = 0;
    samples.push({ x: event.clientX, y: event.clientY, t: lastPointerTime });
    pressed = event.target instanceof Element ? event.target.closest('.lab-item') : null;

    root.classList.add('is-dragging');
    try {
      root.setPointerCapture(event.pointerId);
    } catch {
      /* older browsers and some webviews */
    }
    start();
  });

  root.addEventListener(
    'pointermove',
    (event) => {
      if (!dragging || event.pointerId !== pointerId) return;

      const now = performance.now();
      const dx = event.clientX - lastPointerX;
      const dy = event.clientY - lastPointerY;
      if (!dx && !dy) return;

      cam.x -= dx;
      cam.y -= dy;
      targetX = cam.x;
      targetY = cam.y;
      travelled += Math.abs(dx) + Math.abs(dy);

      const dt = Math.max(1, now - lastPointerTime);
      // Smoothed velocity: one jittery sample should not decide the throw.
      vx = vx * 0.65 + (-dx / dt) * 1000 * 0.35;
      vy = vy * 0.65 + (-dy / dt) * 1000 * 0.35;

      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      lastPointerTime = now;
      samples.push({ x: event.clientX, y: event.clientY, t: now });
      while (samples.length > 2 && now - samples[0].t > 180) samples.shift();
    },
    { passive: true },
  );

  function endDrag(event, cancelled) {
    if (!dragging) return;
    if (event.pointerId !== pointerId) return;

    dragging = false;
    root.classList.remove('is-dragging');
    try {
      root.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }

    const clicked = !cancelled && travelled <= 8 && pressed;
    if (clicked) {
      focus(instances.find((instance) => instance.el === pressed));
    }

    // Momentum comes from the last 120ms of actual movement, not from the
    // decaying per-event estimate: holding still before letting go now yields
    // no throw, and the same gesture always throws the same distance.
    let throwX = 0;
    let throwY = 0;
    const releasedAt = performance.now();
    const lastSample = samples[samples.length - 1];
    // If the pointer rested before letting go, there is no flick to carry.
    if (lastSample && releasedAt - lastSample.t <= THROW_WINDOW && samples.length > 1) {
      const last = lastSample;
      let first = samples[0];
      for (let i = samples.length - 1; i >= 0; i -= 1) {
        if (last.t - samples[i].t <= THROW_WINDOW) first = samples[i];
        else break;
      }
      const span = (last.t - first.t) / 1000;
      if (span > 0.02) {
        throwX = -(last.x - first.x) / span;
        throwY = -(last.y - first.y) / span;
      }
    }

    const rawSpeed = Math.hypot(throwX, throwY);
    if (rawSpeed > MAX_THROW) {
      const scale = MAX_THROW / rawSpeed;
      throwX *= scale;
      throwY *= scale;
    }

    if (!clicked && !reduced && Math.min(rawSpeed, MAX_THROW) > MIN_THROW) {
      vx = throwX;
      vy = throwY;
      inertia = true;
    } else {
      vx = 0;
      vy = 0;
    }
    samples.length = 0;

    pointerId = null;
    pressed = null;
    start();
  }

  root.addEventListener('pointerup', (event) => endDrag(event, false));
  root.addEventListener('pointercancel', (event) => endDrag(event, true));

  root.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) return;
      event.preventDefault();

      if (centerTween) {
        centerTween.kill();
        centerTween = null;
      }
      if (!follow) {
        targetX = cam.x;
        targetY = cam.y;
      }

      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? vh : 1;
      // Trackpads send many small deltas; at 1:1 the canvas races away. A
      // damped target plus the eased follow keeps it calm but still direct.
      const sensitivity = 0.55;
      targetX += event.deltaX * unit * sensitivity;
      targetY += event.deltaY * unit * sensitivity;
      inertia = false;

      if (reduced) {
        // no glide: the wheel moves the canvas directly
        cam.x = targetX;
        cam.y = targetY;
        follow = false;
        apply();
      } else {
        follow = true;
        start();
      }
    },
    { passive: false },
  );

  field.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const el = event.target instanceof Element ? event.target.closest('.lab-item') : null;
    if (!el) return;
    event.preventDefault();
    focus(instances.find((instance) => instance.el === el));
  });

  let lastWidth = document.documentElement.clientWidth;
  let resizeTimer = 0;

  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const width = document.documentElement.clientWidth;
        // a phone hiding its URL bar reports a resize without changing width
        if (width === lastWidth) return;
        lastWidth = width;
        layout();
      }, 150);
    },
    { passive: true },
  );

  window.addEventListener('orientationchange', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      lastWidth = document.documentElement.clientWidth;
      layout();
    }, 220);
  });

  layout();
  root.style.setProperty('--motion', '0');

  // The lab opens on the avatar. A ?item= link (the homepage plates) still
  // wins, so every teaser lands on the piece it showed.
  const slug = new URLSearchParams(window.location.search).get('item') || 'avatar-3d';
  const startIndex = pieces.findIndex((item) => item.slug === slug);
  if (startIndex >= 0) {
    cam.x = baseX(startIndex);
    cam.y = baseY(startIndex);
    apply();
  }

  return { reveal };
}
