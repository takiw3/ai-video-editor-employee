// Everything you can ask for, in one list: Agentic Cut's own moves, HyperFrames' looks and treatments,
// and the HyperFrames registry (450+ blocks, searched live so it is always current).
import { hf } from "./util.mjs";
import { CAPTION_STYLES } from "./compose.mjs";
import { SFX } from "./sfx.mjs";

export const BUILTIN = {
  "cut moves (cuts.style)": {
    punch: "alternates a tight and wide framing on every jump cut, so cuts feel intentional (shorts default)",
    "punch-soft": "the same, gentler (long-form default)",
    zoom: "a quick zoom that settles on every cut",
    flash: "a white flash on every cut",
    whip: "a whip-pan blur into every cut",
    glitch: "a glitch jolt on every cut",
    none: "straight cuts",
  },
  "camera (zooms / shake / flash)": {
    "zoom (smooth)": "eases in to a scale, holds, eases out: { at, end, scale: 1.25 }",
    "zoom (snap)": "hard punch-in for one line: { at, end, scale: 1.3, kind: 'snap' }",
    "zoom (push)": "slow push-in across a section: { at, end, scale: 1.15, kind: 'push' }",
    shake: "camera shake for impact: { at, dur: 0.4, strength: 1 }",
    flash: "a colour flash: { at, dur: 0.2, color: '#fff' }",
  },
  "text on screen (text[].style)": {
    hook: "the white-box headline readable from frame 0; *word* gets the accent",
    title: "big outlined display line",
    label: "small accent pill (STEP 1, NEW, FREE)",
    cta: "accent button that holds to the end (Comment AGENT)",
    emoji: "a giant emoji or sticker that pops and wiggles",
    number: "a counter that rolls up to a value: { value: 10, prefix: '$', suffix: 'K', text: 'per month' }",
    quote: "a quote card with a name",
    list: "a checklist that builds item by item",
    handle: "your @handle, small",
  },
  "text animations (text[].anim)": {
    pop: "scales in with a bounce", slide: "rises in", drop: "drops and bounces", fade: "fades", slam: "slams in from huge with a jolt",
    spin: "spins in", blur: "focuses in", type: "types on letter by letter", none: "just appears",
  },
  "b-roll (broll[].mode / in / out)": {
    full: "covers the frame", pip: "a framed card in the corner, you stay on screen", top: "top half, you stay on the bottom half", card: "a rounded card over you",
    "in/out": "fade, slide, up, zoom, pop, whip, flash, cut",
    kenburns: "slow push on photos (on by default for images)",
  },
  "frame (frame.mode)": {
    crop: "fills the canvas; move it with frame.x / frame.y (0..1), or [[t, x], ...] to follow two speakers",
    fit: "the whole picture, centred over a blurred copy of itself (great for landscape podcasts as shorts)",
  },
  "voice (voice)": { off: "untouched", light: "rumble removed", clean: "rumble and hiss removed, levelled (default)", strong: "for noisy rooms: heavier noise reduction and de-essing" },
  "other": { progress: "a progress bar (progress: true)", music: "a music bed that ducks under your voice: { src, volume: 0.22 }", logo: "your logo in the corner (logo: true, brand.logo set)" },
};

let hfCaps = null;
export function hfLooks() {
  if (hfCaps) return hfCaps;
  const r = hf(["media-treatment", "--all"], { allowFail: true });
  try { hfCaps = JSON.parse(r.out).capabilities; } catch { hfCaps = { presets: [], effects: [], details: [] }; }
  return hfCaps;
}

export function registry(words) {
  const args = ["catalog", "--json"];
  if (words) args.push(words);
  const r = hf(args, { allowFail: true });
  try { const j = JSON.parse(r.out); return Array.isArray(j) ? j : j.results || j.items || []; } catch { return []; }
}

export function listing(words, { all = false } = {}) {
  const out = [];
  const w = (words || "").toLowerCase();
  const hit = (...s) => !w || s.join(" ").toLowerCase().includes(w);
  for (const [group, items] of Object.entries(BUILTIN)) {
    const rows = Object.entries(items).filter(([k, v]) => hit(group, k, v));
    if (rows.length) { out.push(`\n## ${group}`); for (const [k, v] of rows) out.push(`  ${k.padEnd(14)} ${v}`); }
  }
  const caps = Object.entries(CAPTION_STYLES).filter(([k, v]) => hit("captions caption", k, v.desc));
  if (caps.length) { out.push("\n## caption styles (captions.style)"); for (const [k, v] of caps) out.push(`  ${k.padEnd(14)} ${v.desc}`); }
  const sfx = Object.keys(SFX).filter((k) => hit("sound sfx effect", k));
  if (sfx.length) out.push("\n## sound effects (sfx[].name, text[].sfx, cuts.sfx)\n  " + sfx.join(", "));
  const C = hfLooks();
  const looks = (C.presets || []).filter((p) => hit("look grade color colour preset", p.id, p.label));
  if (looks.length) out.push("\n## looks (look) - HyperFrames colour presets\n  " + looks.map((p) => p.id).join(", "));
  const eff = (C.effects || []).filter((e) => hit("treatment effect grade", e.key, e.family, e.description));
  if (eff.length) { out.push("\n## treatments (grade.effects) - HyperFrames, on the footage"); for (const e of eff) out.push(`  ${e.key.padEnd(20)} ${e.description}  e.g. ${JSON.stringify(e.apply)}`); }
  if (hit("grain vignette film details")) out.push("\n## finishing (grade.details)\n  grain 0..1, vignette 0..1   e.g. { \"details\": { \"grain\": 0.2, \"vignette\": 0.25 } }");
  if (w || all) {
    const items = registry(words || "");
    const list = all ? items : items.slice(0, 25);
    if (list.length) {
      out.push(`\n## HyperFrames registry blocks (blocks[].name)${!all && items.length > list.length ? ` - top ${list.length} of ${items.length}` : ""}`);
      for (const i of list) out.push(`  ${i.name.padEnd(28)} ${i.type === "component" ? "[component] " : ""}${String(i.description).slice(0, 110)}`);
    }
  } else out.push("\n## HyperFrames registry\n  450+ blocks: lower thirds, overlays, title cards, CTAs, charts, transitions...  search:  ac effects <words>");
  return out.join("\n").trim() + "\n";
}
