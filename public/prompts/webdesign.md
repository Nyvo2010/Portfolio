# CREATIVE WEB DESIGN GUIDELINES
## The Master Reference for Awwwards-Tier, Apple-Fluid, Anti-Slop Creative Sites

> **Source:** 17 design skills merged, deduplicated, and organized for creative websites (not dashboards/UIs)
> **Purpose:** Paste this gist link → tell any agent "read and follow" → get consistent premium output

---

## CHAPTER 0: META — HOW TO USE THIS DOCUMENT

### 0.1 The Three Dials (set before any work)
Every project starts by setting these global variables. They drive ALL downstream decisions.

| Dial | Range | Default | Meaning |
|------|-------|---------|---------|
| **DESIGN_VARIANCE** | 1–10 | 8 | 1=Perfect Symmetry → 10=Artsy Chaos |
| **MOTION_INTENSITY** | 1–10 | 6 | 1=Static → 10=Cinematic/Magic Physics |
| **VISUAL_DENSITY** | 1–10 | 4 | 1=Art Gallery/Airy → 10=Pilot Cockpit/Packed |

**Override per project.** A portfolio → Variance 9, Motion 8, Density 3. A SaaS landing → Variance 6, Motion 5, Density 5.

### 0.2 The Quality Bar
Your output must belong alongside: **Apple keynote presentations, Linear app, Stripe homepage, Vercel dashboard, Raycast, Awwwards/FWA winners.** If it would look out of place there, it's not good enough.

### 0.3 Core Philosophy (Emil Kowalski)
- **Taste is trained, not innate** — surround yourself with great work, reverse-engineer why it feels good
- **Unseen details compound** — "a thousand barely audible voices all singing in tune" (Paul Graham)
- **Beauty is leverage** — people choose tools by experience, not just function
- **Slop is a choice made by reflex, not for the product** — judge the visible result, not whether AI made it

---

## CHAPTER 1: ANTI-SLOP — WHAT TO NEVER DO

### 1.1 Absolute Zero Banned Patterns (High-End Visual Design)
If your output includes ANY of these, it instantly fails:

| Category | Banned | Use Instead |
|----------|--------|-------------|
| **Fonts** | Inter, Roboto, Arial, Open Sans, Helvetica | Geist, Clash Display, PP Editorial New, Plus Jakarta Sans, Satoshi, Cabinet Grotesk, Outfit |
| **Icons** | Thick Lucide, FontAwesome, Material Icons | Phosphor Light, Remix Line, Solar (via Iconify), Radix |
| **Borders** | Generic 1px solid gray | Hairlines (rgba 255/10), no borders, or subtle material edges |
| **Shadows** | `shadow-md`, `rgba(0,0,0,0.3)`, harsh drops | Ultra-soft ambient shadows, diffused glow, layered depth |
| **Layouts** | Edge-to-edge sticky navbars, symmetrical 3-col Bootstrap grids | Asymmetrical bento, editorial whitespace, floating components |
| **Motion** | `linear`, `ease-in-out`, instant state changes | Spring physics, custom cubic-bezier, scroll-linked choreography |

### 1.2 AI Slop Tells (No-AI-Design-Slop + Unslop)
Treat a choice as suspect when it:
- Could be pasted into an unrelated product unchanged
- Repeats a familiar generated-design pattern
- Conflicts with the local design system or nearby sections
- Communicates no useful information, state, action, hierarchy, or brand meaning
- Competes with content, weakens trust, or makes the interface harder to use

**Specific visual slop to kill:**
- Purple gradients, glows, gradient text
- Emoji labels, "New ✨" badges, glossy blobs
- Uppercase tracked labels (`tracking-widest uppercase`)
- Pulsing elements, uneven spacing
- Meta-labels: "SECTION 01", "QUESTION 05", "FEATURE CARD"
- Invisible button text (contrast failures)
- 6-line wrapped headings in narrow containers
- Ugly empty gaps in bento grids
- Default Left/Right alternating layouts repeated endlessly
- Stock photography, illustrated heads, faceless silhouettes
- Generated people presented as real customers/staff

### 1.3 Typography Slop (Frontend Design + GPT-Taste)
- **NEVER** accent just one word in a headline (italic/bold/different color)
- **NEVER** use all caps for labels
- **NEVER** use Inter (the #1 AI tell)
- **NEVER** let H1 exceed 2–3 lines — use ultra-wide containers (`max-w-5xl`, `max-w-6xl`, `w-full`)
- **NEVER** use emojis in code, markup, text content, or alt text
- Default line length < 80 chars; serif gets slightly more line-height

---

## CHAPTER 2: DESIGN PROCESS — THINK BEFORE CODE

### 2.1 Pre-Flight Checklist (Design with Taste + Design Taste Frontend)
Before writing a single line, commit to a **BOLD aesthetic direction**:

1. **Purpose** — What problem does this solve? Who uses it?
2. **Tone** — Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, dark cinematic, glassmorphic
3. **Constraints** — Framework, performance budget, accessibility, animation library
4. **Differentiation** — What's the ONE visual moment someone will remember?

> **Critical:** Bold maximalism and refined minimalism both work. The key is **intentionality, not intensity**.

### 2.2 Art Direction Workflow (Build Awwwards-Quality Sites)
1. **Inspect references completely** — extract hierarchy, pacing, contrast, image treatment, motion principles
2. **Generate materially new identity** — NEVER reuse, trace, or closely reproduce reference assets, code, copy
3. **Write compact direction** — visual thesis, hero focal asset, type hierarchy, color system, section sequence, motion narrative, smooth-scroll engine, Three.js decision, asset provenance plan
4. **Select compatible skills** — follow smallest relevant set, avoid combining unrelated aesthetic systems

### 2.3 Reference Reading (Awwwards Hero + Awwwards Sections)
When given reference images, extract these signals **before designing**:

| Signal | What to Determine |
|--------|-------------------|
| **Mode** | Light or Dark background |
| **Focal element** | Massive typography, 3D object, full-bleed photography, product mockup, abstract shape, video, scattered floating elements |
| **Typography style** | Serif/sans/mixed, massive/restrained, uppercase/mixed-case, tight-tracked/normal, italic presence |
| **Text-image relationship** | Above (layered)? Beside (split)? Behind (masked)? Inside (clipped)? Intertwined (inline)? |
| **Layout gravity** | Center? Bottom-left? Split across edges? Full-bleed? |
| **Palette** | 1–3 colors max. Note exact relationships. |
| **Motion hints** | Scroll-triggered? Hover? Loop? Entry sequence? Parallax depth? |
| **Density** | Airy/editorial or packed/technical? |
| **Material** | Glass/translucency? Solid cards? Noise/grain? 3D depth? |

**Do not project your aesthetic onto the reference. Read what is actually there.**

---

## CHAPTER 3: TYPOGRAPHY — THE PERSONALITY CARRIER

### 3.1 Font Selection Rules
- **One family or two max** — if two, make them clearly distinct (e.g., Variable Serif display + Grotesk body)
- **Choose deliberately** — not defaults you'd reach for on any project
- **Premium stacks by vibe:**
  - Ethereal Glass (Tech/AI): Wide geometric Grotesk (Geist, Satoshi, Outfit)
  - Editorial Luxury (Lifestyle/Agency): High-contrast Variable Serif (Clash Display, PP Editorial New) + Grotesk
  - Soft Structuralism (Consumer/Portfolio): Massive bold Grotesk (Plus Jakarta Sans, Cabinet Grotesk)
- **Ban Inter, Roboto, Arial, Open Sans, Helvetica** — these are the #1 AI tells

### 3.2 Type Scale & Implementation
- **Fluid typography via `clamp()`** for ALL headings and body text
- **Follow The Elements of Typographic Style** — intentional weights, widths, spacing
- **Type as active design element** — not neutral delivery vehicle for content
- **Line length < 80 chars** (serif can go slightly longer)
- **Serif body text → slightly more line-height than sans-serif**

### 3.3 Hero Typography (GPT-Taste Iron Rule)
- **Container:** Ultra-wide (`max-w-5xl` / `max-w-6xl` / `w-full`) — let words flow horizontally
- **Line limit:** H1 **MUST NEVER exceed 2–3 lines** — 4/5/6 lines = catastrophic failure
- **Fix:** Increase font size, widen container, or edit copy — never let it wrap to 6 lines

---

## CHAPTER 4: COLOR & MATERIAL — QUIET CHROME, ONE BRIGHT ELEMENT

### 4.1 Palette Discipline (Unslop + High-End Visual Design)
- **One bright element per screen** — carries the color and craft (rendered object, painted scene, rich chart)
- **Quiet chrome** — nav, buttons, text use tinted neutrals + ONE accent. Nothing glows, nothing competes.
- **Neutral background + 1–2 strong accents** for high-contrast highlights (Awwwards Design)
- **Dark mode default:** Deepest OLED black `#050505` with radial mesh gradients (subtle purple/emerald orbs)
- **Light mode:** Warm creams `#FDFBF7`, muted sage, deep espresso
- **CSS noise/film grain overlay** `opacity-[0.03]` for physical paper feel (Editorial Luxury)

### 4.2 Material System (Apple Design + High-End Visual Design)
| Archetype | Background | Cards | Typography |
|-----------|------------|-------|------------|
| **Ethereal Glass** | `#050505` + mesh gradients | Vantablack + `backdrop-blur-2xl` + white/10 hairlines | Wide geometric Grotesk |
| **Editorial Luxury** | Warm creams/espresso | Subtle borders, paper texture | Variable Serif display + Grotesk body |
| **Soft Structuralism** | Silver-grey/white | Floating, soft diffused ambient shadows | Massive bold Grotesk |

### 4.3 Depth & Translucency (Apple Design)
- **Translucent materials** create spatial hierarchy — `backdrop-blur` with subtle fills
- **Depth layers:** Background → Base → Elevated → Overlay → Modal
- **Hairline borders** (rgba white/10 or black/10) separate layers without heaviness
- **Shadows are ambient, not drops** — diffused, multi-layered, realistic light falloff

---

## CHAPTER 5: LAYOUT & SPACING — EDITORIAL RHYTHM

### 5.1 Grid Systems
- **12-column asymmetrical grid** with intentional whitespace (Awwwards Design)
- **Asymmetrical Bento** — masonry-like CSS Grid of varying card sizes (High-End Visual Design)
- **Gapless bento grids** — mathematically perfect, no ugly empty gaps (GPT-Taste)
- **Grid over flex-math** — use CSS Grid for complex layouts (Design Taste Frontend)

### 5.2 Spacing Rhythm
- **Massive vertical padding between sections:** `py-32 md:py-48` — sections = distinct cinematic chapters (GPT-Taste)
- **Do not cramp elements together** — whitespace is not empty space, it's structure
- **Viewport stability:** NEVER `h-screen` for heroes — ALWAYS `min-h-[100dvh]` (Design Taste Frontend)
- **Container width:** `max-w-[1400px] mx-auto` or `max-w-7xl`

### 5.3 Layout Archetypes (pick ONE per project)
1. **Asymmetrical Bento** — varying card sizes, masonry CSS Grid
2. **Editorial Split** — large image + generous text column, extreme whitespace
3. **Immersive Full-Bleed** — edge-to-edge media, layered typography
4. **Typographic Hero** — massive type as the visual, minimal imagery
5. **Three.js Canvas** — WebGL background as atmosphere, UI floats above
6. **Scroll-Driven Narrative** — pinned sections, horizontal scroll, scrubbing reveals

---

## CHAPTER 6: MOTION — CHOREOGRAPHY, NOT DECORATION

### 6.1 The Apple Standard (Apple Design + Awwwards Motion)
> **An interface feels alive when motion starts from the current on-screen value, inherits the user's velocity, projects momentum forward, and can be grabbed and reversed at any instant.**

**Springs are the tool** — inherently interruptible and velocity-aware.

#### Core Motion Rules:
- **Respond on pointer-down, not release** — highlight instantly on press (`:active { transform: scale(0.97) }`)
- **Kill every latency** — audit debounces, artificial timers, 300ms tap delay
- **Feedback continuous DURING interaction** — drag/slider/drawer updates 1:1 with pointer, not just at end
- **Spring physics everywhere** — not generic CSS transitions
- **Interruptible & reversible** — user can grab and redirect mid-motion
- **Momentum at boundaries** — resist, don't hard-stop

### 6.2 Motion Pipeline (Awwwards Motion)
```
Phase 1: Motion Audit → Phase 2: Choreography → Phase 3: Build → Phase 4: Motion Diff
(classify, extract       (sequence map,         (layer by layer:     (60fps check,
 motion intent)          timing sheet,          entry → scroll →     feel check,
                         easing palette)        hover → transitions  reduced-motion)
```

### 6.3 Motion Layers (build in order)
1. **Entry** — page load, hero reveal, stagger
2. **Scroll** — GSAP ScrollTrigger: pinning, stacking, scrubbing, parallax
3. **Hover/Interaction** — magnetic buttons, custom cursors, text reveals
4. **Transitions** — page transitions, morphing state changes
5. **Ambient** — subtle loops, floating elements, breathing

### 6.4 Technical Standards
- **60fps mandatory** — `will-change`, `transform`/`opacity` only, GPU acceleration
- **Respect `prefers-reduced-motion`** — disable/flatten all non-essential motion
- **GSAP + ScrollTrigger** for scroll choreography (pinning, stacking, scrubbing)
- **Custom easing palette** — no `ease-in-out`, use spring configs or cubic-bezier
- **Text splitting** for kinetic typography (per-char/per-word stagger)

### 6.5 Emil Kowalski's Animation Rules (Review Format Required)
| Before | After | Why |
|--------|-------|-----|
| `transition: all 300ms` | `transition: transform 200ms ease-out` | Specify exact properties; avoid `all` |
| `transform: scale(0)` | `transform: scale(0.95); opacity: 0` | Nothing in real world appears from nothing |
| `ease-in` on dropdown | `ease-out` with custom curve | `ease-in` feels sluggish; `ease-out` gives instant feedback |
| No `:active` state | `transform: scale(0.97)` on `:active` | Buttons must feel responsive to press |
| `transform-origin: center` on popover | `transform-origin: var(--transform-origin)` | Popovers scale from trigger |

---

## CHAPTER 7: PAGE ARCHITECTURE — AIDA + SECTION SEQUENCING

### 7.1 AIDA Framework (GPT-Taste + Awwwards Sections)
Every page follows this persuasion sequence:

| Phase | Section | Purpose | Visual Treatment |
|-------|---------|---------|------------------|
| **Attention** | Hero | Hook, value prop, focal moment | Cinematic, wide, 2–3 line H1, single focal point |
| **Interest** | Features/Bento | Proof, capability, density | High-density, mathematically perfect grid |
| **Desire** | Scroll/Media | Emotional resonance, story | Pinned sections, horizontal scroll, text reveals |
| **Action** | Footer/Pricing/CTA | Conversion | Massive high-contrast CTA, clean footer |

### 7.2 Section Types & Architectures (Awwwards Sections)
Each section type has named architectures — **pick one, commit, don't mix:**

| Section Type | Architectures (examples) |
|--------------|--------------------------|
| **Feature Showcase** | Interactive Grid, Scrolling Carousel, Typographic Index, 3D Card Stack |
| **Social Proof** | Marquee Logos, Testimonial Slider, Case Study Cards, Metric Strip |
| **Pricing** | Toggle Table, Card Trio, Interactive Calculator |
| **Process/How It Works** | Stepper Timeline, Interactive Flow, Numbered Cards |
| **Case Studies** | Editorial Spread, Masonry Grid, Horizontal Scroll |
| **Stats/Metrics** | Counter Strip, Animated Numbers, Data Visualization |
| **CTA Banners** | Full-Bleed Gradient, Glass Pill, Split Media |
| **FAQs** | Accordion, Side-by-Side, Searchable |
| **Footers** | Minimal Split, Editorial Column, Interactive Map |
| **Visual Breaks** | Divider Shader, Atmospheric Canvas, Typographic Pause |

### 7.3 Page Composition Quality Gates (Awwwards Sections)
After building all sections, verify:
- **Rhythm** — alternating density/breathing, no two similar sections adjacent
- **Variety** — different architectures, no repetitive patterns
- **Conversion flow** — each section moves user toward action
- **Anti-slop audit** — no generic 3-card grids, no icon+heading+paragraph repeats, no stock photography, no AI-purple gradients

---

## CHAPTER 8: HERO SECTION — THE FOCAL MOMENT

### 8.1 Hero Pipeline (Awwwards Hero)
```
BRIEF → Phase 1: Read (extract signals) → Phase 2: Architecture (pick one)
                                    → Phase 3: Build (type, palette, atmosphere, motion, mobile)
                                    → Phase 4: Verify (visual diff against reference)
```

### 8.2 Six Hero Architectures (pick ONE)
1. **Massive Typographic** — H1 dominates viewport, minimal imagery
2. **Split Editorial** — Image left/right, generous text column, extreme whitespace
3. **Full-Bleed Media** — Edge-to-edge photo/video, layered type
4. **3D/Canvas Hero** — Three.js object/shader as focal point, UI floats
5. **Scattered Floating** — Multiple elements with parallax depth, organic arrangement
6. **Product Mockup** — Device frame or product render as hero, contextual UI

### 8.3 Hero Fundamentals (Non-Negotiable)
- **Single focal point** — one thing dominates
- **Extreme whitespace** — breathing room around focal element
- **Tight palette** — 1–3 colors max
- **Viewport-scale typography** — H1 uses full width
- **2–3 line maximum** on H1 (Iron Rule)
- **Atmosphere** — mesh gradients, noise, subtle motion, or clean void

---

## CHAPTER 9: ASSETS & IMAGERY — HONEST, ORIGINAL, NARRATIVE

### 9.1 Asset Principles (Build Awwwards-Quality Sites + Unslop)
- **Generate original hero/project imagery** when it materially improves concept
- **Appropriately licensed media** when stronger — keep provenance in site source
- **NO model-authored SVG/CSS/canvas illustrations** — use transparent PNG cutouts
- **Photographs for EVERY avatar** — never initials, illustrated heads, faceless silhouettes, generated people as real customers
- **Solar icons via Iconify** for interface symbols
- **Iconify SVG Logos** only for legitimate real-company marks in truthful contexts
- **Logo Ipsum** only for explicitly disclosed fictional brands
- **Deliberate aspect ratios, crop behavior, alt text, loading, fallbacks**
- **Avoid:** generic stock, copied mockups, watermarks, decorative media without narrative role

### 9.2 One Bright Element Rule (Unslop)
Each screen has **one polished thing** that carries color and craft:
- A rendered 3D object
- A painted scene/illustration
- A rich data visualization
- A beautiful photograph from the product's world

Everything around it is **quiet chrome** — tinted neutrals + one accent.

---

## CHAPTER 10: INTERACTION & MICRO-DETAILS — THE UNSEEN COMPOUND

### 10.1 Response & Feedback (Apple Design + Emil Kowalski)
- **Instant `:active` state** on every interactive element (`scale(0.97)`)
- **Focus visible** — 3:1 contrast ratio, keyboard accessible
- **Hover states** — meaningful, not decorative (magnetic pull, subtle scale, color shift)
- **Loading states** — skeleton screens, not spinners; `font-display: swap`
- **Drag/slider/drawer** — 1:1 pointer tracking during interaction

### 10.2 Invisible Details That Compound (Emil Kowalski)
- **Popovers scale from trigger** — `transform-origin: var(--transform-origin)`
- **Nothing appears from nothing** — `scale(0.95) + opacity: 0` not `scale(0)`
- **Ease-out for feedback** — instant response, slow settle
- **Custom spring configs** — stiffness/damping tuned per interaction type
- **Stagger with purpose** — not everything at once, not random delays
- **Reduced-motion** — instant state changes, no parallax, no stagger

### 10.3 Cursor & Pointer (Awwwards Motion)
- **Custom cursor** for immersive experiences (hidden on mobile)
- **Magnetic buttons** — attract pointer within radius
- **Trail/follow effects** — subtle, performance-aware
- **Click ripple** — from press point, not center

---

## CHAPTER 11: TECHNICAL STACK & PERFORMANCE

### 11.1 Default Stack (Design Taste Frontend)
- **React/Next.js** — Server Components default, Client Components only for interactivity
- **Tailwind CSS v3/v4** — check `package.json` first, v4 uses `@tailwindcss/postcss`
- **GSAP + ScrollTrigger** — motion choreography
- **Framer Motion** — React-friendly spring animations
- **Three.js / WebGL** — when justified by concept
- **Iconify (Solar, Phosphor, Remix)** — icon system
- **Playwright** — for design extraction/visual diff

### 11.2 Performance Benchmarks (Awwwards Design)
| Metric | Target |
|--------|--------|
| **LCP** | < 1.5s |
| **CLS** | < 0.05 |
| **INP** | < 100ms |

**Optimizations:**
- `loading="lazy"` for below-fold images
- `font-display: swap` for all typography
- `min-h-[100dvh]` not `h-screen` (mobile viewport stability)
- GPU-only animations (`transform`, `opacity`, `filter`)
- `will-change` on animated elements

### 11.3 Accessibility (Non-Negotiable)
- All interactive elements keyboard-accessible
- Focus states 3:1 contrast minimum
- Semantic HTML structure
- `prefers-reduced-motion` respected
- Alt text on all meaningful images
- ARIA labels where needed

---

## CHAPTER 12: EXISTING CODE — SURGICAL VISUAL UPGRADE

### 12.1 The Sacred Rule (Visual Redesign)
> **JavaScript logic is sacred. You do not touch it. Ever.**

| SACRED (never modify) | SLOP (upgrade aggressively) |
|----------------------|----------------------------|
| `useState`/`useReducer` | `className` strings, Tailwind classes |
| `useEffect`/`useCallback`/`useMemo` | Inline styles `style={{...}}` |
| API calls (fetch, axios, SWR, RQ) | CSS/SCSS files |
| Event handler LOGIC | Color values (hex, rgb, hsl) |
| Conditional rendering logic | Font families and sizes |
| Router/navigation logic | Spacing (padding, margin, gap) |
| Form validation logic | Border-radius values |
| Context providers/consumers | Shadow values |
| Custom hook implementations | Transition/animation declarations |
| Data transformations | z-index values |
| Error handling | Layout structure (flex/grid config) |
| Prop drilling/interfaces | Wrapper divs (for layout only) |

### 12.2 Surgical Upgrade Pipeline (Visual Redesign)
```
Audit 7 layers → Classify each element Sacred/Slop → CSS-only surgery layer by layer
   ↓                    ↓                              ↓
Tokens              Never touch JS                1. Tokens (colors, spacing, radii)
Typography          Upgrade visuals only          2. Typography
Spacing             Preserve all logic            3. Spacing
Color               Verify at each step           4. Color
Components          Visual diff at end            5. Components
Atmosphere                                       6. Atmosphere (shadows, blur, noise)
Motion                                            7. Motion
```

---

## CHAPTER 13: DESIGN EXTRACTION — REVERSE-ENGINEERING

### 13.1 Extract Design System Workflow
1. Confirm target URL is public/reachable
2. Run: `npx extract-design-system <url>`
3. Review `.extract-design-system/normalized.json` for:
   - Primary/secondary/accent colors
   - Detected fonts
   - Spacing, radius, shadow scales
4. Generate starter tokens: `design-system/tokens.json`, `tokens.css`
5. **Do not** overwrite existing design system without confirmation
6. **Do not** treat single page as proof of whole product system

### 13.2 Pixel-Perfect Replication (Pixel-Perfect Skill)
When given a screenshot/mockup:
```
IMAGE IN → Phase 1: Intake (classify) → Phase 2: Deep Extraction (7 layers)
                                        → Phase 3: Build (structure-first, exact CSS)
                                        → Phase 4: Visual Diff (verify against reference)
```

**7 Extraction Layers:** Grid, Type, Color, Spacing, Components, Atmosphere, Interaction
**Reference image is the spec. Code is translation, not interpretation.**

---

## CHAPTER 14: CREATIVE VARIANCE ENGINE — NEVER REPEAT

### 14.1 Pre-Code Dice Roll (High-End Visual Design + Design Taste Frontend)
Before coding, silently "roll the dice" and select **ONE combination**:

**Vibe & Texture (pick 1):**
1. **Ethereal Glass** — `#050505`, mesh gradients, glass cards, geometric Grotesk
2. **Editorial Luxury** — warm creams, Variable Serif, noise/grain, paper feel
3. **Soft Structuralism** — silver-grey/white, bold Grotesk, soft ambient shadows

**Layout Archetype (pick 1):**
1. **Asymmetrical Bento** — masonry CSS Grid, varying card sizes
2. **Editorial Split** — generous asymmetry, extreme whitespace
3. **Immersive Canvas** — Three.js background, floating UI
4. **Typographic Hero** — type as visual, minimal chrome
5. **Scroll Narrative** — pinned sections, horizontal scrub

**Motion Intensity (per MOTION_INTENSITY dial):**
- Low (1–3): Subtle entry, basic hover, no scroll choreography
- Medium (4–6): Staggered entry, scroll reveals, magnetic hover
- High (7–10): Full GSAP choreography, pinning, stacking, kinetic type, parallax depth

### 14.2 Python-Driven Randomization (GPT-Taste)
Simulate deterministic randomization in your design plan:
```python
seed = len(user_prompt) % 1000
random.seed(seed)
hero_arch = random.choice(hero_architectures)
type_stack = random.choice([Satoshi, Cabinet Grotesk, Outfit, Geist])  # NEVER Inter
components = random.sample(component_archs, 3)
gsap_paradigms = random.sample(gsap_patterns, 2)
```
**Forbidden from defaulting to the same UI twice.**

---

## CHAPTER 15: QUALITY GATES — THE FINAL VERIFICATION

### 15.1 Visual Diff Checklist
Before delivering any design/code:
- [ ] **No banned fonts** (Inter, Roboto, Arial, Open Sans, Helvetica)
- [ ] **No banned icons** (thick Lucide, FontAwesome, Material)
- [ ] **No generic borders/shadows** (1px gray, harsh drops)
- [ ] **No banned layouts** (sticky edge navbar, symmetrical 3-col)
- [ ] **No banned motion** (linear, ease-in-out, instant changes)
- [ ] **H1 ≤ 3 lines** in ultra-wide container
- [ ] **One bright element per screen** — quiet chrome around it
- [ ] **Massive section spacing** (`py-32 md:py-48`)
- [ ] **Fluid typography** via `clamp()` everywhere
- [ ] **60fps animations** — GPU-only, `will-change` set
- [ ] **Reduced-motion respected** — instant fallbacks
- [ ] **No emojis** anywhere
- [ ] **No meta-labels** ("SECTION 01", "FEATURE CARD")
- [ ] **No 6-line wrapped headings**
- [ ] **No ugly bento gaps**
- [ ] **No default Left/Right alternation**
- [ ] **Photos for avatars** — no initials/silhouettes
- [ ] **Original or licensed imagery** — no stock filler

### 15.2 Anti-Slop Audit (No-AI-Design-Slop)
For every section/component:
1. Could this be pasted into an unrelated product unchanged?
2. Does it repeat a familiar generated pattern?
3. Does it conflict with local design system?
4. Does it communicate useful info/state/action/hierarchy/brand?
5. Does it compete with content or weaken trust?

**Fix the highest-impact problem. Don't widen narrow edits into site audits.**

### 15.3 Motion Diff (Awwwards Motion)
- [ ] 60fps sustained
- [ ] Feel check — does it feel alive/premium?
- [ ] Reduced-motion audit — all non-essential motion disabled
- [ ] Springs used for interruptible interactions
- [ ] Stagger has purpose, not decoration
- [ ] Entry → Scroll → Hover → Transitions → Ambient layering works

---

## APPENDIX A: QUICK REFERENCE — COMMON CSS PATTERNS

```css
/* Fluid type scale */
--fs-h1: clamp(3rem, 8vw, 8rem);
--fs-h2: clamp(2rem, 5vw, 4rem);
--fs-h3: clamp(1.5rem, 3vw, 2.5rem);
--fs-body: clamp(1rem, 1.5vw, 1.125rem);

/* Spring configs (Framer Motion / Motion One) */
const spring = { type: "spring", stiffness: 300, damping: 30 };
const springGentle = { type: "spring", stiffness: 200, damping: 25 };
const springSnappy = { type: "spring", stiffness: 500, damping: 35 };

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Viewport-stable hero */
.hero { min-height: 100dvh; }

/* Hairline border */
.hairline { border: 1px solid rgba(255,255,255,0.1); }

/* Soft ambient shadow */
.shadow-ambient { box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.06); }

/* Noise overlay */
.noise::before {
  content: "";
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,...");
  opacity: 0.03;
  pointer-events: none;
}
```

---

## APPENDIX B: SKILL SOURCE MAP

| Chapter | Primary Source Skills |
|---------|----------------------|
| 0 Meta | design-taste-frontend, design-with-taste, emil-design-eng |
| 1 Anti-Slop | high-end-visual-design, no-ai-design-slop, unslop, gpt-taste, frontend-design |
| 2 Process | build-awwwards-quality-sites, awwwards-hero, awwwards-sections, design-with-taste |
| 3 Typography | frontend-design, gpt-taste, high-end-visual-design, awwwards-design |
| 4 Color/Material | unslop, high-end-visual-design, apple-design, awwwards-hero |
| 5 Layout/Spacing | gpt-taste, awwwards-design, high-end-visual-design, design-taste-frontend |
| 6 Motion | apple-design, awwwards-motion, emil-design-eng, design-with-taste |
| 7 Page Architecture | awwwards-sections, gpt-taste, awwwards-design, build-awwwards-quality-sites |
| 8 Hero | awwwards-hero, gpt-taste, high-end-visual-design |
| 9 Assets | build-awwwards-quality-sites, unslop, awwwards-design |
| 10 Interaction | apple-design, emil-design-eng, awwwards-motion, awwwards-design |
| 11 Technical | design-taste-frontend, awwwards-design, build-awwwards-quality-sites |
| 12 Existing Code | visual-redesign |
| 13 Extraction | extract-design-system, pixel-perfect-replication |
| 14 Variance | high-end-visual-design, design-taste-frontend, gpt-taste, design-with-taste |
| 15 Quality Gates | no-ai-design-slop, awwwards-motion, awwwards-sections, gpt-taste |

---

## APPENDIX C: LICENSES & CREDITS

- **unslop** — Damir Sokolovsky (@heydamir), CC BY 4.0 — https://heydamir.design/unslop
- **apple-design** — Apple WWDC talks translated for web
- **awwwards-* skills** — Awwwards/FWA evaluation criteria adapted
- **emil-design-eng** — Emil Kowalski's design engineering philosophy
- **high-end-visual-design** — Agency-tier design system
- **gpt-taste** — Elite UX/UI & GSAP motion engineering
- **visual-redesign** — Surgical aesthetic upgrade pipeline
- **pixel-perfect-replication** — Image-to-code extraction pipeline
- **extract-design-system** — Design token extraction tooling
- **design-taste-frontend / design-with-taste / frontend-design** — Senior UI/UX engineering practices

---

*This gist is a living document. Update it as you collect new patterns. Paste the link, tell any agent "read and follow," get consistent premium creative output.*