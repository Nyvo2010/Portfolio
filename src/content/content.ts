import * as yaml from "js-yaml";
import { assetUrl } from "../utils/urls";

export type Project = {
  id: number;
  title: string;
  imageSource: string;
  description: string;
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

export const projects: Project[] = Object.entries(rawProjects)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, source], index) => {
    const data = parseYaml(source);
    if (!data) return null;

    const imageSource = stringValue(data.imageSource);
    if (!stringValue(data.title) || !imageSource) return null;

    return {
      id: index + 1,
      title: stringValue(data.title),
      imageSource: assetUrl(imageSource),
      description: stringValue(data.description),
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
