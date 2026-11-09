import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const LAB_DIR = 'public/assets/lab';
const LAB_MANIFEST = 'virtual:lab-manifest';
const LAB_MANIFEST_ID = `\0${LAB_MANIFEST}`;
const IMAGE = /\.(avif|gif|jpe?g|png|webp)$/i;

/**
 * The lab canvas shows every image in public/assets/lab. Exposing the folder
 * as a module keeps that true in dev and in the build: dropping a file in or
 * deleting one is enough, and nothing has to be listed by hand.
 */
function labManifest() {
  let root = process.cwd();

  const files = () => {
    let names = [];
    try {
      names = fs.readdirSync(path.join(root, LAB_DIR));
    } catch {
      return [];
    }

    return names
      .filter((name) => IMAGE.test(name))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => `/assets/lab/${name}`);
  };

  return {
    name: 'lab-manifest',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === LAB_MANIFEST ? LAB_MANIFEST_ID : null;
    },
    load(id) {
      return id === LAB_MANIFEST_ID ? `export default ${JSON.stringify(files())};` : null;
    },
    configureServer(server) {
      const dir = path.join(root, LAB_DIR);
      server.watcher.add(dir);

      const refresh = (file) => {
        if (path.dirname(file) !== dir || !IMAGE.test(file)) return;
        const mod = server.moduleGraph.getModuleById(LAB_MANIFEST_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };

      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

/**
 * This is a static multi-page site. Vite's SPA fallback answers unknown URLs
 * with index.html in dev and preview, so add the same missing-page fallback
 * GitHub Pages applies to dist/404.html.
 */
function notFoundPage() {
  let root = process.cwd();

  const wantsHtml = (req) =>
    (req.method === 'GET' || req.method === 'HEAD') &&
    (req.headers.accept || '').includes('text/html');

  const pathnameOf = (url) => {
    try {
      return new URL(url, 'http://localhost').pathname;
    } catch {
      return null;
    }
  };

  const exists = (base, pathname) => {
    const clean = pathname.replace(/^\/+|\/+$/g, '');
    if (!clean) return true;

    return [path.join(base, clean), path.join(base, clean, 'index.html')].some(
      (file) => {
        try {
          return fs.statSync(file).isFile();
        } catch {
          return false;
        }
      },
    );
  };

  const isInternal = (pathname) =>
    pathname.startsWith('/@') ||
    pathname.startsWith('/__') ||
    pathname.startsWith('/node_modules/');

  const missing = (pathname, base) => {
    const bases = [base];
    if (base === root) bases.push(path.join(root, 'public'));
    return !bases.some((dir) => exists(dir, pathname));
  };

  const send = (req, res, html) => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(req.method === 'HEAD' ? undefined : html);
  };

  return {
    name: 'not-found-page',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!wantsHtml(req)) return next();
        const pathname = pathnameOf(req.url);
        if (!pathname || isInternal(pathname) || !missing(pathname, root)) return next();

        try {
          const html = fs.readFileSync(path.join(root, '404.html'), 'utf8');
          server
            .transformIndexHtml(req.url, html)
            .then((page) => send(req, res, page))
            .catch(next);
        } catch {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!wantsHtml(req)) return next();
        const pathname = pathnameOf(req.url);
        if (!pathname || isInternal(pathname)) return next();

        const outDir = path.resolve(root, server.config.build.outDir);
        if (!missing(pathname, outDir)) return next();

        try {
          send(req, res, fs.readFileSync(path.join(outDir, '404.html'), 'utf8'));
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [labManifest(), notFoundPage()],
  build: {
    // Vite 8 defaults to Baseline 2026 (Safari 16.4+). The site should parse
    // and boot on older iPhones, Android webviews and office browsers too, so
    // optional chaining / nullish assignment are lowered to ES2018 syntax.
    target: ['es2018', 'safari13'],
    cssTarget: 'safari13',
    rollupOptions: {
      input: {
        main: 'index.html',
        labs: 'labs/index.html',
        notFound: '404.html',
      },
    },
  },
});
