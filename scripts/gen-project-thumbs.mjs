// Regenerates project thumbnails from their full-res project images.
//
// The project image (`imageSource` in src/content/projects/*.yaml) is the
// single source of truth. Each thumb is derived from it and written to
// public/assets/projects/thumbs/<image-basename>.webp, and the YAML's
// `thumbSource` is normalised to that exact path so the app and the files on
// disk can never drift apart.
//
// Run locally with `npm run thumbs`; CI runs it on every push that touches a
// project image and commits the result back.

import { readFile, readdir, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";
import sharp from "sharp";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PROJECTS_DIR = path.join(ROOT, "src/content/projects");
const PUBLIC_DIR = path.join(ROOT, "public");
const THUMB_WIDTH = 480;
const WEBP_QUALITY = 80;
const PUBLIC_PREFIX = "/assets/projects/";

function toPublicPath(assetPath) {
  return path.join(PUBLIC_DIR, assetPath.replace(/^\//, ""));
}

function thumbPathFor(imageSource) {
  const ext = path.extname(imageSource);
  const base = path.basename(imageSource, ext);
  return `${PUBLIC_PREFIX}thumbs/${base}.webp`;
}

function isLocalAsset(value) {
  return typeof value === "string" && value.startsWith(PUBLIC_PREFIX);
}

// Rewrites the thumbSource line in place so comments/layout survive, and
// inserts one right after imageSource when it's missing.
function syncYamlThumb(source, thumbPath) {
  const line = `thumbSource: "${thumbPath}"`;
  if (/^thumbSource:.*$/m.test(source)) {
    return source.replace(/^thumbSource:.*$/m, line);
  }
  return source.replace(/^(imageSource:.*)$/m, `$1\n${line}`);
}

async function main() {
  const files = (await readdir(PROJECTS_DIR)).filter((f) =>
    f.endsWith(".yaml"),
  );
  const expectedThumbs = new Set();
  let generated = 0;
  let failed = false;

  for (const file of files.sort()) {
    const filePath = path.join(PROJECTS_DIR, file);
    let doc;
    let source;
    try {
      source = await readFile(filePath, "utf8");
      doc = yaml.load(source);
    } catch (error) {
      console.error(`✗ ${file}: could not parse (${error.message})`);
      failed = true;
      continue;
    }
    if (!doc || typeof doc !== "object") continue;

    const imageSource = doc.imageSource;
    if (!isLocalAsset(imageSource)) {
      console.warn(`• ${file}: no local imageSource, skipping`);
      continue;
    }

    const thumbPath = thumbPathFor(imageSource);
    expectedThumbs.add(thumbPath);

    const inputFile = toPublicPath(imageSource);
    const outputFile = toPublicPath(thumbPath);

    try {
      await mkdir(path.dirname(outputFile), { recursive: true });
      await sharp(inputFile)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 5 })
        .toFile(outputFile);
      generated += 1;
      console.log(`✓ ${file}: ${imageSource} -> ${thumbPath}`);
    } catch (error) {
      console.error(`✗ ${file}: failed on ${imageSource} (${error.message})`);
      failed = true;
      continue;
    }

    const nextSource = syncYamlThumb(source, thumbPath);
    if (nextSource !== source) {
      await writeFile(filePath, nextSource, "utf8");
      console.log(`  ↳ normalised thumbSource in ${file}`);
    }
  }

  // Drop thumbs that no longer belong to a project so the folder stays in sync.
  const thumbsDir = toPublicPath(`${PUBLIC_PREFIX}thumbs`);
  let existing = [];
  try {
    existing = await readdir(thumbsDir);
  } catch {
    existing = [];
  }
  for (const entry of existing) {
    if (!entry.endsWith(".webp")) continue;
    const rel = `${PUBLIC_PREFIX}thumbs/${entry}`;
    if (!expectedThumbs.has(rel)) {
      await rm(path.join(thumbsDir, entry));
      console.log(`✗ removed orphaned thumb ${entry}`);
    }
  }

  console.log(`\n${generated} thumb(s) regenerated from project images.`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
