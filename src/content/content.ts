import * as yaml from "js-yaml";
import { assetUrl } from "../utils/urls";

export type Project = {
  /** Filename without extension (e.g. "vanta") — opaque, never parsed. */
  id: string;
  title: string;
  /** Full-res image from the YAML's `imageSource` — grid fallback + overlay. */
  imageSource: string;
  /** Grid thumb from the YAML's `thumbSource` (aka `thumb`/`thumbnail`/
      `cover`). Falls back to `imageSource`, so a project never 404s just
      because no separate thumb file exists yet. */
  thumbSource: string;
  description: string;
  /** Optional pixel aspect (w/h) from the YAML's `ratio` (aka `aspect`/
      `aspectRatio`). When absent the grid + overlay measure the real file
      at runtime, so no per-project table lives in code. */
  ratio?: number;
};

export type Writing = {
  id: string;
  title: string;
  date: string;
  body: string;
  /** Optional cover from the YAML (`imageSource` aka `cover`/`thumb`/
      `thumbnail`/`image`). Writings stay text-only when absent. */
  imageSource?: string;
  thumbSource?: string;
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

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Accepts 1.78, "16/9", "16:9", "1920x1080", "1920 / 1080". */
function parseRatio(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parts = value
      .toLowerCase()
      .split(/[/:x\s]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0);
    if (parts.length === 2) return parts[0] / parts[1];
    const single = Number(value);
    if (Number.isFinite(single) && single > 0) return single;
  }
  return undefined;
}

function fileId(path: string) {
  return path.split("/").pop()?.replace(/\.yaml$/, "") ?? "";
}

type ProjectEntry = {
  project: Project;
  order: number | undefined;
  file: string;
};

export const projects: Project[] = Object.entries(rawProjects)
  .map(([path, source]): ProjectEntry | null => {
    const data = parseYaml(source);
    if (!data) return null;

    const imageSource = stringValue(data.imageSource);
    if (!stringValue(data.title) || !imageSource) return null;

    // Thumb is YAML-driven: thumbSource (aka thumb/thumbnail/cover) or
    // the full image itself. No filename convention is assumed here, so
    // any project name works and a missing thumb file can never 404 the
    // grid — it just serves the full file until a thumb is added.
    const thumbRaw =
      stringValue(data.thumbSource) ||
      stringValue(data.thumb) ||
      stringValue(data.thumbnail) ||
      stringValue(data.cover) ||
      imageSource;

    const project: Project = {
      id: fileId(path),
      title: stringValue(data.title),
      imageSource: assetUrl(imageSource),
      thumbSource: assetUrl(thumbRaw),
      description: stringValue(data.description),
      ratio: parseRatio(data.ratio ?? data.aspect ?? data.aspectRatio),
    };

    return {
      project,
      // Optional `order` in the YAML controls the grid sequence;
      // unordered projects fall back to filename order.
      order: numberValue(data.order),
      file: fileId(path),
    };
  })
  .filter((entry): entry is ProjectEntry => entry !== null)
  .sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.file.localeCompare(b.file);
  })
  .map((entry) => entry.project);

export const writings = Object.entries(rawWritings)
  .map(([path, source]): Writing | null => {
    const data = parseYaml(source);
    if (!data) return null;

    const title = stringValue(data.title);
    const body = stringValue(data.body);
    if (!title || !body) return null;

    const imageRaw =
      stringValue(data.imageSource) ||
      stringValue(data.cover) ||
      stringValue(data.image) ||
      "";
    const thumbRaw =
      stringValue(data.thumbSource) ||
      stringValue(data.thumb) ||
      stringValue(data.thumbnail) ||
      "";

    return {
      id: fileId(path),
      title,
      date: stringValue(data.date),
      body,
      ...(imageRaw ? { imageSource: assetUrl(imageRaw) } : {}),
      ...(thumbRaw ? { thumbSource: assetUrl(thumbRaw) } : {}),
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
