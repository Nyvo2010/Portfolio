import * as yaml from "js-yaml";
import { assetUrl } from "../utils/urls";

export type Project = {
  id: number;
  title: string;
  imageSource: string;
  description: string;
  /** True pixel aspect (w/h) of the source file — reserves the exact
      thumb + overlay box before decode, so no layout shift. */
  ratio: number;
  /** Small WebP for the grid (480w). The overlay + hover preload keep
      using the full-res imageSource — the flight needs those pixels. */
  thumbSource: string;
};

export type Writing = {
  id: string;
  title: string;
  date: string;
  imageSource?: string;
  body: string;
};

type RawRecord = Record<string, unknown>;

const rawProjects = import.meta.glob("./projects/*.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const rawWritings = import.meta.glob("./writings/*.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parseYaml(source: string): RawRecord | null {
  try {
    const parsed = yaml.load(source);
    return parsed && typeof parsed === "object" ? (parsed as RawRecord) : null;
  } catch (error) {
    console.warn("Could not parse content YAML", error);
    return null;
  }
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function fileId(path: string) {
  return path.split("/").pop()?.replace(/\.yaml$/, "") ?? "";
}

/* Measured source dimensions — keeps thumb + overlay boxes exact
   without touching the YAMLs. Fallback is 16/9. */
const RATIO_BY_FILE: Record<string, number> = {
  alto: 1920 / 1080,
  atlas: 1854 / 1312,
  kicks: 1920 / 1080,
  monolith: 1920 / 1080,
  "pxl-webworks": 3360 / 2100,
  rubus: 1920 / 1080,
  vanta: 1920 / 1080,
};

export const projects: Project[] = Object.entries(rawProjects)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, source], index) => {
    const data = parseYaml(source);
    if (!data) return null;

    const imageSource = stringValue(data.imageSource);
    if (!stringValue(data.title) || !imageSource) return null;

    return {
      id: index + 1,
      title: stringValue(data.title),
      imageSource: assetUrl(imageSource),
      description: stringValue(data.description),
      ratio: RATIO_BY_FILE[fileId(path)] ?? 16 / 9,
      // Grid thumb lives next to the original: /assets/projects/X.png
      // → /assets/projects/thumbs/X.webp. Falls back to the original
      // when the pattern doesn't match, so a missing thumb never 404s
      // the grid — it just serves the full file.
      thumbSource: assetUrl(
        imageSource
          .replace("/assets/projects/", "/assets/projects/thumbs/")
          .replace(/\.png$/, ".webp")
      ),
    };
  })
  .filter((project): project is Project => project !== null)
  .slice(0, 7);

export const writings = Object.entries(rawWritings)
  .map(([path, source]): Writing | null => {
    const data = parseYaml(source);
    if (!data) return null;

    const title = stringValue(data.title);
    const body = stringValue(data.body);
    if (!title || !body) return null;

    return {
      id: fileId(path),
      title,
      date: stringValue(data.date),
      imageSource: stringValue(data.imageSource)
        ? assetUrl(stringValue(data.imageSource))
        : undefined,
      body,
    };
  })
  .filter((writing): writing is Writing => writing !== null)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export function writingSlug(writing: Pick<Writing, "title">) {
  return writing.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
