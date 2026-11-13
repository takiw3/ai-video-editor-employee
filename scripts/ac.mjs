#!/usr/bin/env node
// Agentic Cut: talking-head video editing on top of HyperFrames.
//   ac setup | doctor                      install or check what it needs
//   ac new <clip> [--format short|long|square|feed] [--title "..."] [--from s --to s] [--pace tight|natural|loose]
//   ac cut [project] [--pace ...]          redo the cut after editing keep / frame / voice in plan.json
//   ac build [project]                     write index.html from plan.json
//   ac preview [project] [--at 1,4.5]      stills of the edit as one contact sheet
//   ac render [project] [--draft]          the final video, checked, saved next to the source with an .srt
//   ac transcript <clip|project>           what was said, with times (for picking clips)
//   ac effects [words] [--all]             every effect, look, caption style and registry block
//   ac brand [key=value ...]               your colours, fonts, caption style, handle
//   ac studio [project] | --stop           open the HyperFrames Studio to scrub the edit
import fs from "node:fs";
import path from "node:path";
import { CANVAS, HOME, HF_VERSION, envelope, fileKey, flags, fmtTime, has, hashOf, hf, probe, projectDir, readJSON, run, slug, writeJSON, r3 } from "./lib/util.mjs";
import { transcribe, transcriptText } from "./lib/transcribe.mjs";
import { analyze, refine, remap } from "./lib/analyze.mjs";
import { cut as cutVideo } from "./lib/cut.mjs";
import { brand, saveBrand, defaults, load, save } from "./lib/plan.mjs";
import { compose, gsapFile } from "./lib/compose.mjs";
import { preview, render, summary } from "./lib/render.mjs";
import { listing } from "./lib/effects.mjs";

const say = (s) => process.stdout.write(s + "\n");

function cutStamp(plan) {
  return hashOf({ keep: plan.keep, frame: plan.frame, voice: plan.voice, format: plan.format, source: plan.source });
}

// The transcript of the source, with each word trimmed to the voice (and the audio levels it was trimmed with).
const memo = new Map();
function sourceWords(plan) {
  const src = probe(plan.source);
  const win = plan.window || [0, src.duration];
  const key = `${fileKey(plan.source)}|${win.join("-")}|${plan.language || ""}`;
  if (!memo.has(key)) {
    const words = transcribe(plan.source, { language: plan.language });
    const env = src.hasAudio ? envelope(plan.source, win[0], win[1]) : null;
    memo.set(key, { words: refine(words, env), env, src, win });
  }
  return memo.get(key);
}

function doCut(project, plan) {
  const res = cutVideo(project, plan);
  const { words } = sourceWords(plan);
  const out = remap(words, plan.keep);
  writeJSON(path.join(project, "timing.json"), out);
  fs.writeFileSync(path.join(project, "script.txt"), transcriptText(out));
  writeJSON(path.join(project, "media", "cut.json"), { stamp: cutStamp(plan), total: res.total });
  return { ...res, words: out };
}

function ensureCut(project) {
  const plan = load(project);
  const stamp = readJSON(path.join(project, "media", "cut.json"), {}).stamp;
  if (stamp !== cutStamp(plan) || !fs.existsSync(path.join(project, "media", "cut.mp4"))) doCut(project, plan);
}

function analyzeInto(plan, opts) {
  const { words, env, src, win } = sourceWords(plan);
  const a = analyze(words, { env, total: src.duration, pace: plan.pace, window: win, keepFillers: opts["keep-fillers"], keepRetakes: opts["keep-retakes"] });
  if (!a.keep.length) throw new Error("no speech found in that clip (is the audio track silent?)");
  plan.keep = a.keep;
  plan.removed = a.removed;
  return { a, src, win };
}

const cmds = {
  async new(f) {
    const clip = f._[0];
    if (!clip || !fs.existsSync(clip)) throw new Error("usage: ac new <clip> [--format short|long] [--title ...] [--from s --to s]");
    const source = path.resolve(clip);
    const src = probe(source);
    if (!src.hasVideo) throw new Error("that file has no video");
    const format = f.format || (src.width > src.height ? "long" : src.width === src.height ? "square" : "short");
    if (!CANVAS[format]) throw new Error(`format must be one of ${Object.keys(CANVAS).join(", ")}`);
    const title = f.title || path.basename(source).replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    let dir = path.join(HOME, slug(title)), n = 2;
    while (fs.existsSync(dir) && !f.overwrite) dir = path.join(HOME, `${slug(title)}-${n++}`);
    fs.mkdirSync(path.join(dir, "media"), { recursive: true });
    const plan = { ...defaults(format), title, format, source, pace: f.pace || "natural" };
    if (f.language) plan.language = f.language;
    if (f.from !== undefined || f.to !== undefined) plan.window = [Number(f.from ?? 0), Number(f.to ?? src.duration)];
    if (f.fit) plan.frame.mode = "fit";
    delete plan.brand;
    const { a, win } = analyzeInto(plan, f);
    save(dir, plan);
    const res = doCut(dir, load(dir));
    const fillers = a.removed.filter((r) => r.why === "filler" || r.why === "stutter").length;
    const retakes = a.removed.filter((r) => r.why === "retake");
    say(`\nproject  ${dir}`);
    say(`cut      ${fmtTime(win[1] - win[0])} -> ${fmtTime(res.total)}  (${a.pauseCount} pauses, ${fillers} fillers/stutters, ${retakes.length} retakes removed)`);
    for (const r of retakes) say(`         retake at ${fmtTime(r.at)}: "${r.text.slice(0, 70)}${r.text.length > 70 ? "..." : ""}"`);
    say(`format   ${format} ${CANVAS[format].join("x")}${src.width / src.height !== CANVAS[format][0] / CANVAS[format][1] ? `, reframed from ${src.width}x${src.height} (${plan.frame.mode})` : ""}`);
    say(`words    ${res.words.length} -> timing.json, script.txt (times on the cut)`);
    say(`next     edit plan.json, then  ac preview  and  ac render`);
  },

  async cut(f) {
    const project = projectDir(f._[0]);
    const plan = load(project);
    if (f.pace || f.reanalyze || f["keep-fillers"] || f["keep-retakes"]) {
      if (f.pace) plan.pace = f.pace;
      analyzeInto(plan, f);
      save(project, plan);
    }
    const res = doCut(project, load(project));
    say(`cut: ${res.total.toFixed(1)} s, ${plan.keep.length} pieces. script.txt updated (times on the cut)`);
  },

  async build(f) {
    const project = projectDir(f._[0]);
    ensureCut(project);
    compose(project);
  },

  async preview(f) {
    const project = projectDir(f._[0]);
    ensureCut(project);
    const at = f.at ? String(f.at).split(",").map(Number) : null;
    const res = preview(project, { at, frames: Number(f.frames || 8) });
    say(`preview  ${res.sheet}`);
    say(`frames   ${res.times.map((t) => t.toFixed(2) + "s").join("  ")}`);
  },

  async render(f) {
    const project = projectDir(f._[0]);
    ensureCut(project);
    const res = render(project, { draft: !!f.draft });
    say(summary(res));
    if (res.problems.length) process.exitCode = 2;
  },

  async transcript(f) {
    const arg = f._[0];
    let words;
    if (arg && fs.existsSync(arg) && fs.statSync(arg).isFile()) words = sourceWords({ source: path.resolve(arg), language: f.language }).words;
    else words = readJSON(path.join(projectDir(arg), "timing.json"), []);
    if (f.from !== undefined || f.to !== undefined) words = words.filter((w) => w.start >= Number(f.from ?? 0) && w.end <= Number(f.to ?? 1e9));
    process.stdout.write(transcriptText(words));
  },

  async effects(f) {
    process.stdout.write(listing(f._.join(" "), { all: !!f.all }));
  },

  async brand(f) {
    if (!f._.length) { say(JSON.stringify(brand(), null, 2)); return; }
    const patch = {};
    for (const kv of f._) {
      const i = kv.indexOf("=");
      if (i < 0) throw new Error(`use key=value (got ${kv})`);
      const k = kv.slice(0, i), v = kv.slice(i + 1);
      patch[k] = v === "null" ? null : k === "logo" && v ? path.resolve(v) : v;
    }
    say(JSON.stringify(saveBrand(patch), null, 2));
  },

  async studio(f) {
    if (f.stop) { hf(["preview", "--stop"], { allowFail: true }); say("studio stopped"); return; }
    const project = projectDir(f._[0]);
    ensureCut(project);
    compose(project, { quiet: true });
    const r = hf(["preview", "--background"], { cwd: project, allowFail: true });
    say((r.out + r.err).trim().split("\n").filter((l) => /http|studio|ready|listening/i.test(l)).slice(0, 4).join("\n") || (r.out + r.err).trim().slice(-400));
  },

  async setup(f) { return checkAll(f, true); },
  async doctor(f) { return checkAll(f, false); },
};

async function checkAll(f, install) {
  const ok = [], bad = [];
  const line = (good, what, note) => { (good ? ok : bad).push(what); say(`${good ? "ok  " : "FIX "} ${what.padEnd(14)} ${note}`); };
  const major = Number(process.versions.node.split(".")[0]);
  line(major >= 22, "node", `${process.versions.node}${major >= 22 ? "" : "  (needs 22 or newer: nodejs.org, or brew install node / winget install OpenJS.NodeJS.LTS)"}`);
  const ff = has("ffmpeg") && has("ffprobe");
  line(ff, "ffmpeg", ff ? run("ffmpeg", ["-version"]).out.split("\n")[0].replace(/ Copyright.*/, "") : "missing: macOS  brew install ffmpeg   Windows  winget install Gyan.FFmpeg   Linux  sudo apt install ffmpeg");
  const v = hf(["--version"], { allowFail: true });
  const hv = (v.out.match(/\d+\.\d+\.\d+/) || [])[0];
  line(hv === HF_VERSION, "hyperframes", hv ? `${hv} (via npx)` : "could not run npx hyperframes: check your internet connection");
  if (install && hv) {
    say("     getting the render browser (one time, about 150 MB)...");
    hf(["browser", "ensure"], { allowFail: true });
  }
  const b = hv ? hf(["browser", "path"], { allowFail: true }) : { code: 1, out: "" };
  const bp = b.out.trim().split("\n").pop();
  line(b.code === 0 && bp && fs.existsSync(bp), "browser", b.code === 0 ? bp : "missing: run  ac setup");
  if (install && ff && hv) {
    // a 3-second spoken test: downloads the speech model once, then proves transcribe -> cut -> render works
    const tdir = path.join(HOME, ".setup-test");
    fs.rmSync(tdir, { recursive: true, force: true });
    fs.mkdirSync(tdir, { recursive: true });
    const clip = path.join(tdir, "test.mp4");
    run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=0x202030:s=540x960:r=30:d=3", "-f", "lavfi", "-i", "sine=f=220:d=3", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", clip]);
    say("     downloading the on-device speech model (one time, a few hundred MB)...");
    const tr = hf(["transcribe", clip, "-d", tdir, "--json"], { allowFail: true });
    const tok = /"ok":true/.test(tr.out);
    line(tok, "speech model", tok ? "ready (runs on this computer)" : "failed: " + (tr.out + tr.err).trim().split("\n").pop().slice(0, 200));
    say("     test render...");
    fs.copyFileSync(gsapFile(), path.join(tdir, "gsap.min.js"));
    fs.writeFileSync(path.join(tdir, "index.html"), `<!doctype html><html><head><meta charset="UTF-8"><script src="gsap.min.js"></script><style>html,body{margin:0;width:540px;height:960px;background:#111}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="1" data-width="540" data-height="960"><div id="t" class="clip" data-start="0" data-duration="1" style="position:absolute;inset:0;display:grid;place-items:center;color:#fff;font:700 60px sans-serif">OK</div></div><script>var tl=gsap.timeline({paused:true});tl.from("#t",{opacity:0,duration:0.5});window.__timelines=window.__timelines||{};window.__timelines.main=tl;</script></body></html>`);
    const rr = hf(["render", tdir, "-o", path.join(tdir, "ok.mp4"), "--quality", "draft", "--quiet"], { allowFail: true });
    const rok = rr.code === 0 && fs.existsSync(path.join(tdir, "ok.mp4"));
    line(rok, "test render", rok ? "ok" : "failed: " + (rr.err || rr.out).trim().split("\n").slice(-3).join(" | ").slice(0, 300));
    if (rok) fs.rmSync(tdir, { recursive: true, force: true });
  }
  fs.mkdirSync(HOME, { recursive: true });
  if (!fs.existsSync(path.join(HOME, "brand.json"))) writeJSON(path.join(HOME, "brand.json"), brand());
  say(bad.length ? `\nNOT READY: fix ${bad.join(", ")} and run this again.` : `\nREADY. Projects live in ${HOME}`);
  if (bad.length) process.exitCode = 1;
}

const [cmd, ...rest] = process.argv.slice(2);
const fn = cmds[cmd];
if (!fn) {
  const src = fs.readFileSync(new URL(import.meta.url), "utf8");
  say(src.split("\n").filter((l) => l.startsWith("//")).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(cmd ? 1 : 0);
}
try {
  await fn(flags(rest));
} catch (e) {
  process.stderr.write(`\n${e.message}\n`);
  process.exit(1);
}
