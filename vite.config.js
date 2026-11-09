import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Vite 8 defaults to Baseline 2026 (Safari 16.4+). The site should parse
    // and boot on older iPhones, Android webviews and office browsers too, so
    // optional chaining / nullish assignment are lowered to ES2018 syntax.
    target: ['es2018', 'safari13'],
    cssTarget: 'safari13',
  },
});
