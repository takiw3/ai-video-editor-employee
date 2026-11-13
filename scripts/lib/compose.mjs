// Turns plan.json + words.json into a HyperFrames composition (index.html) in the project folder.
import fs from "node:fs";
import path from "node:path";
import { CANVAS, HF_VERSION, HOME, RUNTIME, hf, run, readJSON, writeJSON, r3, slug } from "./util.mjs";
import { load } from "./plan.mjs";
import { keptLength, cutPoints } from "./analyze.mjs";
import { sfxFile, SFX } from "./sfx.mjs";

export const CAPTION_STYLES = {
  bold: { words: 3, chars: 16, strip: true, desc: "heavy uppercase, black outline, the spoken word lights up in your accent colour" },
  pop: { words: 3, chars: 16, strip: true, desc: "uppercase words pop in one by one as they're said" },
  highlight: { words: 3, chars: 16, strip: true, desc: "an accent box slides behind the word being said" },
  karaoke: { words: 4, chars: 24, strip: true, desc: "a dark pill, words fill in as they're said" },
  "one-word": { words: 1, chars: 99, strip: true, desc: "one big word at a time, punched in" },
  neon: { words: 3, chars: 18, strip: true, desc: "glowing words in your accent colour" },
  minimal: { words: 6, chars: 34, strip: false, desc: "clean sentence-case lines, no animation" },
  typewriter: { words: 5, chars: 28, strip: false, desc: "words type on in white blocks" },
  subtitle: { words: 14, chars: 42, strip: false, desc: "classic two-line subtitles in a dark box (long-form)" },
  none: { words: 0, chars: 0, strip: false, desc: "no burned-in captions (an .srt is still delivered)" },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attr = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`)).join(" ");
const norm = (t) => String(t).toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
// *word* -> accent span
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<span class="acc">$1</span>').replace(/\n/g, "<br>");

function groupWords(words, style, long) {
  const S = CAPTION_STYLES[style] || CAPTION_STYLES.bold;
  const k = long && style !== "one-word" ? 1.6 : 1;
  const maxW = Math.round(S.words * k), maxC = Math.round(S.chars * k);
  const groups = [];
  let g = null;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = words[i - 1];
    const len = g ? g.words.reduce((s, x) => s + x.text.length + 1, 0) + w.text.length : 0;
    const brk = !g || g.words.length >= maxW || len > maxC || (prev && w.start - prev.end > 0.5) || (prev && /[.!?]["')\]]*$/.test(prev.text));
    if (brk) { if (g) groups.push(g); g = { words: [] }; }
    g.words.push(w);
  }
  if (g) groups.push(g);
  for (let i = 0; i < groups.length; i++) {
    const G = groups[i], next = groups[i + 1];
    G.s = Math.max(0, G.words[0].start - 0.03);
    G.e = Math.max(G.s + 0.35, G.words[G.words.length - 1].end + 0.35);
    if (next) G.e = Math.min(G.e, next.words[0].start - 0.03);
    if (i > 0) G.s = Math.max(G.s, groups[i - 1].e);
  }
  return groups;
}

function captionsHtml(words, cap, long) {
  const style = cap.style || "none";
  if (style === "none" || !words.length) return "";
  const S = CAPTION_STYLES[style] || CAPTION_STYLES.bold;
  const acc = new Set((cap.accent || []).map(norm));
  const groups = groupWords(words, style, long);
  const out = groups.map((G) => {
    if (style === "subtitle") {
      const text = G.words.map((w) => w.text).join(" ");
      const lines = [];
      if (text.length > 42) {
        let best = 0, bestD = 1e9, pos = 0;
        G.words.forEach((w, i) => { pos += w.text.length + 1; const d = Math.abs(pos - text.length / 2); if (i < G.words.length - 1 && d < bestD) { bestD = d; best = i; } });
        lines.push(G.words.slice(0, best + 1).map((w) => w.text).join(" "), G.words.slice(best + 1).map((w) => w.text).join(" "));
      } else lines.push(text);
      return `<div class="ac-g" data-s="${r3(G.s)}" data-e="${r3(G.e)}"><div class="ac-in">${lines.map((l) => `<span class="ac-line">${esc(l)}</span>`).join("<br>")}</div></div>`;
    }
    const spans = G.words.map((w) => {
      let t = S.strip ? w.text.replace(/[.,!?;:]+$/g, "").replace(/^["'(]+|["')]+$/g, "") : w.text;
      if (!t) t = w.text;
      const isAcc = acc.has(norm(w.text)) || (cap.numbers !== false && /\d/.test(w.text));
      return `<span class="ac-w${isAcc ? " ac-acc" : ""}" data-s="${r3(w.start)}" data-e="${r3(w.end)}">${esc(t)}</span>`;
    }).join(" ");
    return `<div class="ac-g" data-s="${r3(G.s)}" data-e="${r3(G.e)}"><div class="ac-in">${spans}</div></div>`;
  });
  return out.join("\n      ");
}

const TEXT_Y = { hook: 0.2, title: 0.45, label: 0.14, cta: 0.8, emoji: 0.3, number: 0.36, quote: 0.42, list: 0.42, handle: 0.06 };
const TEXT_ANIM = { hook: "pop", title: "slam", label: "pop", cta: "slide", emoji: "pop", number: "pop", quote: "fade", list: "fade", handle: "fade" };

function textHtml(items, total, long) {
  return items.map((t, i) => {
    const style = t.style || "hook";
    const a = Number(t.at ?? 0), b = t.end === "end" || t.end === undefined && style === "cta" ? total : Number(t.end ?? a + 2.5);
    const y = t.y ?? (long && style === "hook" ? 0.16 : TEXT_Y[style] ?? 0.5), x = t.x ?? 0.5;
    const anim = t.anim || TEXT_ANIM[style] || "pop";
    let inner;
    const split = (s) => anim === "type" ? esc(s).replace(/\n/g, "\u0001").split("").map((c) => (c === "\u0001" ? "<br>" : `<span class="ch">${c}</span>`)).join("") : rich(s);
    if (style === "hook") inner = String(t.text || "").split("\n").map((l) => `<span class="box">${anim === "type" ? split(l) : rich(l)}</span>`).join("<br>");
    else if (style === "number") {
      const dec = t.decimals ?? (String(t.value).includes(".") ? String(t.value).split(".")[1].length : 0);
      const fmt = Number(t.value).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
      inner = `<span class="num" data-from="${t.from ?? 0}" data-to="${t.value}" data-dec="${dec}" data-pre="${esc(t.prefix || "")}" data-suf="${esc(t.suffix || "")}">${esc((t.prefix || "") + fmt + (t.suffix || ""))}</span>${t.text ? `<small>${esc(t.text)}</small>` : ""}`;
    } else if (style === "quote") inner = `${rich(t.text || "")}${t.by ? `<cite>${esc(t.by)}</cite>` : ""}`;
    else if (style === "list") {
      const items = t.items || [];
      const step = t.step ?? Math.max(0.5, (b - a - 0.6) / Math.max(1, items.length));
      inner = items.map((it, k) => {
        const txt = typeof it === "string" ? it : it.text, at = typeof it === "string" ? a + 0.2 + k * step : Number(it.at);
        return `<div class="it" data-s="${r3(at)}"><b>${t.marker === "number" ? k + 1 + "." : t.marker || "✓"}</b><span>${rich(txt)}</span></div>`;
      }).join("");
    } else inner = split(t.text || "");
    const pos = `top:${(y * 100).toFixed(2)}%;left:${(x * 100).toFixed(2)}%;${t.size ? `--ts:${t.size};` : ""}`;
    return `<div id="tx${i}" class="ac-t t-${style}" ${attr({ "data-s": r3(a), "data-e": r3(b), "data-anim": anim, "data-hold": t.hold || (style === "cta" && b >= total - 0.05) ? "1" : undefined, "data-wiggle": style === "emoji" ? "1" : undefined })} style="${pos}"><div class="in">${inner}</div></div>`;
  }).join("\n      ");
}

// Copy (or hard-link) a media file into <project>/media and return its project-relative path.
function bring(project, src, base) {
  if (!src) throw new Error("a media item has no src");
  const cand = [src, path.join(project, src), path.join(project, "media", src), base && path.join(base, src)].filter(Boolean);
  const found = cand.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!found) throw new Error(`can't find ${src} (put it in ${path.join(project, "media")})`);
  const rel = path.relative(project, path.resolve(found));
  if (!rel.startsWith("..") && !path.isAbsolute(rel)) return rel.split(path.sep).join("/");
  const dest = path.join(project, "media", path.basename(found));
  if (!fs.existsSync(dest)) { try { fs.linkSync(found, dest); } catch { fs.copyFileSync(found, dest); } }
  return "media/" + path.basename(found);
}

const IMG = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

function brollHtml(project, items, total, base) {
  return items.map((r, i) => {
    const a = Number(r.at), b = r.end === "end" ? total : Number(r.end ?? a + 3);
    const src = bring(project, r.src, base);
    const mode = r.mode || "full";
    const media = IMG.test(src)
      ? `<img src="${esc(src)}" alt="">`
      : `<video ${attr({ id: `brv${i}`, class: "clip", src, muted: true, playsinline: true, "data-start": r3(a), "data-duration": r3(b - a), "data-media-start": r.media_start ? r3(r.media_start) : undefined, "data-track-index": 20 + i })}></video>`;
    return `<div id="br${i}" class="ac-br br-${mode}${r.fit === "contain" ? " br-fit" : ""}" ${attr({ "data-s": r3(a), "data-e": r3(b), "data-in": r.in || (mode === "full" ? "zoom" : "pop"), "data-out": r.out || (mode === "full" ? "fade" : "pop"), "data-kb": r.kenburns === false || !IMG.test(src) && !r.kenburns ? undefined : "1" })}>${media}</div>`;
  }).join("\n      ");
}

// HyperFrames registry blocks (lower thirds, overlays, title cards...), installed into the project on first use.
function blockFile(project, name) {
  for (const p of [path.join(project, "compositions", `${name}.html`), path.join(project, "compositions", "components", `${name}.html`)]) if (fs.existsSync(p)) return p;
  return null;
}

function blocksHtml(project, items, W, H, total, long) {
  return items.map((bk, i) => {
    let file = blockFile(project, bk.name);
    if (!file) {
      const r = hf(["add", bk.name, "--dir", project, "--no-clipboard", "--json"], { allowFail: true });
      let res = {};
      try { res = JSON.parse(r.out.trim().split("\n").pop()); } catch {}
      if (!res.ok) throw new Error(`HyperFrames has no block "${bk.name}" (search with  ac effects ${bk.name})`);
      file = blockFile(project, bk.name);
    }
    if (/[\\/]components[\\/]/.test(file)) throw new Error(`"${bk.name}" is a component (a code snippet, not a timed block): paste it by hand from ${file}, following its comments`);
    let html = fs.readFileSync(file, "utf8");
    const root = html.match(/<[^>]*data-composition-id="([^"]+)"[^>]*>/);
    if (!root) throw new Error(`${bk.name}: no composition root found`);
    const num = (k, d) => Number((root[0].match(new RegExp(`data-${k}="([\\d.]+)"`)) || [])[1] || d);
    const BW = num("width", 1920), BH = num("height", 1080), BD = num("duration", 4);
    const id = `${root[1]}-${i}`;
    html = html.split(`data-composition-id="${root[1]}"`).join(`data-composition-id="${id}"`).split(`__timelines["${root[1]}"]`).join(`__timelines["${id}"]`).split(`__timelines['${root[1]}']`).join(`__timelines['${id}']`);
    for (const [sel, val] of Object.entries(bk.set || {})) {
      const idName = sel.replace(/^#/, "");
      const re = new RegExp(`(<[^>]*\\bid="${idName.replace(/[-]/g, "\\-")}"[^>]*>)([^<]*)(<)`);
      if (!re.test(html)) throw new Error(`${bk.name}: no element ${sel} to set (open ${path.relative(project, file)} to see its ids)`);
      html = html.replace(re, (m, open, _old, close) => open + esc(val) + close);
    }
    // registry blocks load GSAP from a CDN: point them at the project's own copy instead
    html = html.replace(/<script[^>]+src="https:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com)\/gsap@[^"]*\/gsap(?:\.min)?\.js"[^>]*><\/script>/g, '<script src="../ac/gsap.min.js"></script>');
    const out = path.join(project, "compositions", `${bk.name}--${i}.html`);
    fs.writeFileSync(out, html);
    const a = Number(bk.at ?? 0), d = bk.dur ? Number(bk.dur) : bk.end ? Number(bk.end) - a : BD;
    const fit = bk.fit || (BW / BH > W / H + 0.01 ? "width" : "cover");
    let k = bk.scale ?? (fit === "width" ? W / BW : fit === "height" ? H / BH : fit === "contain" ? Math.min(W / BW, H / BH) : Math.max(W / BW, H / BH));
    // lower thirds are drawn for 1920 wide: on a vertical canvas, keep them readable and anchored left
    const lt = /^lt-|lower-third/.test(bk.name);
    if (bk.scale === undefined && lt && !long) k *= 1.7;
    if (bk.zoom) k *= Number(bk.zoom);
    const left = lt && bk.x === undefined ? 0 : (W - BW * k) * (bk.x ?? 0.5);
    const top = fit === "width" && !long && bk.y === undefined ? H * 0.8 - BH * k : (H - BH * k) * (bk.y ?? 0.5);
    return `<div class="ac-blk" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${BW}px;height:${BH}px;transform:scale(${k.toFixed(4)})"><div ${attr({ id: `blk${i}`, "data-composition-id": id, "data-composition-src": `compositions/${bk.name}--${i}.html`, "data-start": r3(a), "data-duration": r3(Math.min(d, total - a)), "data-width": BW, "data-height": BH, "data-track-index": 40 + i })}></div></div>`;
  }).join("\n      ");
}

function audioHtml(project, plan, words, cuts, total, base) {
  const out = [];
  const list = [...(plan.sfx || []).map((s) => (Array.isArray(s) ? { at: s[0], name: s[1], volume: s[2] } : s))];
  if (plan.cuts && plan.cuts.sfx) {
    const name = typeof plan.cuts.sfx === "string" ? plan.cuts.sfx : plan.cuts.style === "glitch" ? "glitch" : "swoosh";
    const every = Math.max(1, plan.cuts.every || 1);
    cuts.forEach((c, i) => { if (i % every === 0) list.push({ at: c - 0.05, name, volume: 0.35 }); });
  }
  for (const t of plan.text || []) if (t.sfx) list.push({ at: Number(t.at), name: t.sfx, volume: 0.5 });
  for (const r of plan.broll || []) if (r.sfx) list.push({ at: Number(r.at) - 0.08, name: r.sfx, volume: 0.45 });
  list.forEach((s, i) => {
    let src, dur;
    if (s.name && SFX[s.name]) { sfxFile(project, s.name); src = `media/sfx/${s.name}.wav`; dur = SFX[s.name].d; }
    else if (s.src || s.name) { src = bring(project, s.src || s.name, base); dur = s.dur || 2; }
    else return;
    const at = Math.max(0, Number(s.at));
    if (at >= total) return;
    out.push(`<audio id="sfx${i}" class="clip" ${attr({ src, "data-start": r3(at), "data-duration": r3(Math.min(dur, total - at)), "data-volume": s.volume ?? 0.5, "data-track-index": 60 + i })}></audio>`);
  });
  const m = typeof plan.music === "string" ? { src: plan.music } : plan.music;
  if (m && m.src) {
    const src = bring(project, m.src, base);
    const vol = m.volume ?? 0.22;
    let lane;
    if (m.duck !== false && words.length) {
      const spans = [];
      for (const w of words) { const l = spans[spans.length - 1]; if (l && w.start - l[1] < 1.2) l[1] = w.end; else spans.push([w.start, w.end]); }
      const low = m.duck_to ?? 0.4, pts = [{ t: 0, v: 1 }];
      for (const [a, b] of spans) pts.push({ t: r3(Math.max(0, a - 0.3)), v: 1 }, { t: r3(Math.max(0, a - 0.05)), v: low }, { t: r3(b + 0.1), v: low }, { t: r3(b + 0.45), v: 1 });
      lane = JSON.stringify({ version: 1, lanes: [{ target: "volume", points: pts.slice(0, 500) }] });
    }
    out.push(`<audio id="music" class="clip" ${attr({ src, "data-start": 0, "data-duration": r3(total), "data-media-start": m.start ? r3(m.start) : undefined, "data-volume": vol, "data-fade-in": m.fade_in ?? 0.3, "data-fade-out": m.fade_out ?? 1.5, "data-automation": lane, "data-track-index": 90 })}></audio>`);
  }
  return out.join("\n      ");
}

// GSAP from npm, once per computer, copied into each project: renders never depend on a CDN.
export const GSAP_VERSION = "3.14.2";
export function gsapFile() {
  const dir = path.join(HOME, ".vendor");
  const f = path.join(dir, "node_modules", "gsap", "dist", "gsap.min.js");
  const pkg = readJSON(path.join(dir, "node_modules", "gsap", "package.json"), {});
  if (fs.existsSync(f) && pkg.version === GSAP_VERSION) return f;
  fs.mkdirSync(dir, { recursive: true });
  run("npm", ["install", `gsap@${GSAP_VERSION}`, "--prefix", dir, "--no-save", "--no-audit", "--no-fund", "--silent"]);
  if (!fs.existsSync(f)) throw new Error("could not get GSAP from npm: check the internet connection and run  ac setup");
  return f;
}

function fontsLink(b) {
  const fams = [...new Set([b.font, b.body_font].filter(Boolean))];
  const q = fams.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;700;800;900`).join("&");
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${q}&display=swap" />`;
}

// plan.fixes corrects what the speech model misheard: { "chat gpt": "ChatGPT", "say new time": "save you time" }.
// A phrase becomes one caption word spanning the words it replaces.
export function fixedWords(project, plan) {
  const words = readJSON(path.join(project, "words.json"), []);
  const fixes = Object.entries(plan.fixes || {}).map(([k, v]) => [k.toLowerCase().split(/\s+/).map(norm).filter(Boolean), String(v)]).filter(([k]) => k.length);
  if (!fixes.length) return words;
  const out = [];
  for (let i = 0; i < words.length; i++) {
    let hit = null;
    for (const [k, v] of fixes) if (k.every((t, j) => words[i + j] && norm(words[i + j].text) === t)) { hit = [k, v]; break; }
    if (!hit) { out.push(words[i]); continue; }
    const last = words[i + hit[0].length - 1];
    const tail = (last.text.match(/[.,!?;:]+$/) || [""])[0];
    const parts = hit[1].split(/\s+/), span = (last.end - words[i].start) / parts.length;
    parts.forEach((p, j) => out.push({ text: p + (j === parts.length - 1 ? tail : ""), start: r3(words[i].start + j * span), end: r3(words[i].start + (j + 1) * span) }));
    i += hit[0].length - 1;
  }
  return out;
}

export function compose(project, { quiet = false } = {}) {
  const plan = load(project);
  const words = fixedWords(project, plan);
  const [W, H] = CANVAS[plan.format] || CANVAS.short;
  const long = W > H;
  const total = r3(keptLength(plan.keep));
  const cuts = cutPoints(plan.keep);
  const b = plan.brand;
  const u = Math.min(W, H) / 1080;
  const base = plan.source ? path.dirname(plan.source) : null;
  const cap = plan.captions || {};
  const faceY = plan.frame && plan.frame.face_y != null ? plan.frame.face_y : long ? 0.4 : 0.36;

  fs.mkdirSync(path.join(project, "ac"), { recursive: true });
  for (const f of ["ac-runtime.js", "ac.css"]) fs.copyFileSync(path.join(RUNTIME, f), path.join(project, "ac", f));
  fs.copyFileSync(gsapFile(), path.join(project, "ac", "gsap.min.js"));

  const config = {
    total, u, faceY, format: plan.format,
    captions: { style: cap.style, hide: cap.hide || [] },
    cuts: plan.cuts || {},
    cutTimes: cuts,
    zooms: plan.zooms || [], shake: plan.shake || [], flash: plan.flash || [],
  };
  const vars = `--W:${W}px;--H:${H}px;--u:${u};--cs:${cap.size || 1};--ts:1;--accent:${b.accent};--accent2:${b.accent2};--text:${b.text};--dark:${b.dark};--font:"${b.font}";--body:"${b.body_font}"`;
  const fx = [];
  if (plan.progress) fx.push('<div id="progress"></div>');
  const logo = b.logo && plan.logo !== false && plan.logo ? `<img id="logo" src="${esc(bring(project, b.logo, null))}" alt="" style="position:absolute;right:${(4 * u).toFixed(1)}%;top:${long ? 5 : 4}%;width:${(long ? 120 : 150) * u}px;z-index:65;opacity:.92">` : "";

  const html = `<!doctype html>
<html lang="en" data-resolution="${long ? "landscape" : W === H ? "square" : "portrait"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(plan.title)}</title>
    <script src="ac/gsap.min.js"></script>
    ${fontsLink(b)}
    <link rel="stylesheet" href="ac/ac.css" />
  </head>
  <body class="${long ? "long" : "short"}" style='${vars}'>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
      <div id="stage"><div id="cam"><div id="zoom"><div id="shake">
        <video id="aroll" class="clip" src="media/cut.mp4" playsinline data-start="0" data-duration="${total}" data-track-index="0" data-has-audio="true"></video>
      </div></div></div></div>
      <div id="brolls" class="ac-layer">
      ${brollHtml(project, plan.broll || [], total, base)}
      </div>
      ${blocksHtml(project, plan.blocks || [], W, H, total, long)}
      <div id="caps" class="ac-layer cap-${esc(cap.style || "none")} pos-${esc(cap.position || (long ? "bottom" : "middle"))} ${long ? "ac-long" : "ac-short"}">
      ${captionsHtml(words, cap, long)}
      </div>
      <div id="texts" class="ac-layer">
      ${textHtml(plan.text || [], total, long)}
      </div>
      <div id="fx" class="ac-layer"><div id="flash"></div>${fx.join("")}</div>
      ${logo}
      ${audioHtml(project, plan, words, cuts, total, base)}
    </div>
    <script>window.AC = ${JSON.stringify(config)};</script>
    <script src="ac/ac-runtime.js"></script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(project, "index.html"), html);
  if (!fs.existsSync(path.join(project, "hyperframes.json"))) {
    writeJSON(path.join(project, "hyperframes.json"), {
      $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
      registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
      paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
      media: { autoProxy: true },
    });
  }
  writeJSON(path.join(project, "meta.json"), { id: slug(plan.title), name: plan.title });
  writeJSON(path.join(project, "package.json"), { name: slug(plan.title), private: true, scripts: { dev: `npx --yes hyperframes@${HF_VERSION} preview`, render: `npx --yes hyperframes@${HF_VERSION} render` } });

  // colour: a HyperFrames grading preset plus any adjustments, validated and written by HyperFrames itself
  const look = plan.look && plan.look !== "none" ? plan.look : null;
  const grade = { ...(look ? { preset: look } : {}), ...(plan.grade || {}) };
  if (Object.keys(grade).length) {
    const r = hf(["media-treatment", "--project", project, "--selector", "#aroll", "--grading", JSON.stringify(grade), "--apply", "--json"], { allowFail: true });
    let res = {};
    try { res = JSON.parse(r.out); } catch {}
    if (!res.ok) throw new Error(`the look didn't apply: ${(res.error && (res.error.message || JSON.stringify(res.error))) || r.err.slice(-400)}\nSee  ac effects looks`);
  }
  if (!quiet) process.stdout.write(`built index.html: ${total.toFixed(1)} s, ${cuts.length} cuts, captions ${cap.style || "none"}${look ? `, look ${look}` : ""}\n`);
  return { total, W, H, cuts };
}
