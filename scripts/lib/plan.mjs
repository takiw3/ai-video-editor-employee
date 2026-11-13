// plan.json: the one file that describes a video. Defaults per format, merged with the creator's brand.
import fs from "node:fs";
import path from "node:path";
import { HOME, readJSON, writeJSON } from "./util.mjs";

export const BRAND_FILE = path.join(HOME, "brand.json");

export const BRAND_DEFAULT = {
  name: "",
  handle: "",
  accent: "#FFD23F",
  accent2: "#3DDC97",
  text: "#FFFFFF",
  dark: "#0B0B0F",
  font: "Montserrat",
  body_font: "Inter",
  captions: "bold",
  look: null,
  logo: null,
};

export function brand() {
  return { ...BRAND_DEFAULT, ...readJSON(BRAND_FILE, {}) };
}

export function saveBrand(patch) {
  const b = { ...brand(), ...patch };
  writeJSON(BRAND_FILE, b);
  return b;
}

export function defaults(format, b = brand()) {
  const short = format !== "long";
  return {
    title: "Video",
    format,
    source: null,
    window: null,
    pace: "natural",
    keep: [],
    removed: [],
    fixes: {},
    frame: { mode: "crop", x: 0.5, y: 0.5, zoom: 1 },
    voice: "clean",
    look: b.look,
    grade: {},
    captions: {
      style: format === "long" ? "none" : b.captions,
      accent: [],
      position: format === "long" ? "bottom" : "middle",
      size: 1,
      hide: [],
    },
    cuts: { style: short ? "punch" : "punch-soft", sfx: false },
    zooms: [],
    shake: [],
    flash: [],
    text: [],
    broll: [],
    blocks: [],
    sfx: [],
    progress: false,
    music: null,
    brand: {},
  };
}

export function load(project) {
  const p = readJSON(path.join(project, "plan.json"));
  if (!p) throw new Error(`no plan.json in ${project}`);
  const d = defaults(p.format || "short");
  const merged = { ...d, ...p };
  for (const k of ["captions", "cuts", "frame"]) merged[k] = { ...d[k], ...(p[k] || {}) };
  merged.brand = { ...brand(), ...(p.brand || {}) };
  return merged;
}

export function save(project, plan) {
  const { brand: _b, ...rest } = plan;
  const raw = readJSON(path.join(project, "plan.json"), {});
  writeJSON(path.join(project, "plan.json"), { ...rest, brand: raw.brand || {} });
}

export const exists = (project) => fs.existsSync(path.join(project, "plan.json"));
