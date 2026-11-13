// Preview stills, the final render, its checks, and delivery next to the source clip.
import fs from "node:fs";
import path from "node:path";
import { HOME, FPS, ffmpeg, hf, loudness, probe, readJSON, slug, fmtTime } from "./util.mjs";
import { load } from "./plan.mjs";
import { compose, fixedWords } from "./compose.mjs";

export function lint(project) {
  const r = hf(["lint", project, "--json"], { allowFail: true });
  let res = null;
  try { res = JSON.parse(r.out.slice(r.out.indexOf("{"))); } catch {}
  const findings = res ? res.findings || res.issues || [] : [];
  const errors = findings.filter((f) => /error/i.test(f.severity || f.level || ""));
  return { ok: r.code === 0 && !errors.length, errors, raw: res || r.out + r.err };
}

export function preview(project, { at = null, frames = 8 } = {}) {
  const { total } = compose(project, { quiet: true });
  const plan = load(project);
  let times = at;
  if (!times) {
    const t = new Set();
    for (const x of plan.text || []) t.add(Math.min(total - 0.1, Number(x.at) + 0.5));
    for (const x of plan.broll || []) t.add((Number(x.at) + Number(x.end === "end" ? total : x.end ?? Number(x.at) + 3)) / 2);
    for (const x of plan.blocks || []) t.add(Number(x.at ?? 0) + 1.2);
    for (let i = 0; t.size < frames && i < frames; i++) t.add(((i + 0.5) / frames) * total);
    times = [...t].filter((x) => x >= 0 && x < total).sort((a, b) => a - b).slice(0, 12);
  }
  times = times.map((x) => Math.round(x * 100) / 100);
  const dir = path.join(project, "preview");
  fs.rmSync(dir, { recursive: true, force: true });
  const r = hf(["snapshot", project, "--at", times.join(","), "--no-end", "--output", dir], { allowFail: true });
  const pngs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".png")).map((f) => path.join(dir, f)) : [];
  if (!pngs.length) throw new Error("no preview frames came back:\n" + (r.err || r.out).slice(-800));
  const num = (f) => Number((path.basename(f).match(/([\d.]+)s?\.png$/) || [])[1] || 0);
  pngs.sort((a, b) => num(a) - num(b));
  const cols = Math.min(4, pngs.length), rows = Math.ceil(pngs.length / cols);
  const { width, height } = probe(pngs[0]);
  const tw = width > height ? 480 : 270, th = Math.round((tw * height) / width / 2) * 2;
  const inputs = pngs.flatMap((p) => ["-i", p]);
  const blanks = cols * rows - pngs.length;
  const g = pngs.map((_, i) => `[${i}:v]scale=${tw}:${th}[s${i}]`);
  for (let i = 0; i < blanks; i++) g.push(`color=c=black:s=${tw}x${th}:d=1[b${i}]`);
  const ins = pngs.map((_, i) => `[s${i}]`).join("") + Array.from({ length: blanks }, (_, i) => `[b${i}]`).join("");
  g.push(`${ins}xstack=inputs=${cols * rows}:layout=${Array.from({ length: cols * rows }, (_, i) => `${(i % cols) * tw}_${Math.floor(i / cols) * th}`).join("|")}[out]`);
  const sheet = path.join(dir, "sheet.jpg");
  if (pngs.length > 1) ffmpeg([...inputs, "-filter_complex", g.join(";"), "-map", "[out]", "-frames:v", "1", "-q:v", "3", sheet]);
  else fs.copyFileSync(pngs[0], sheet.replace(/\.jpg$/, ".png"));
  return { sheet: pngs.length > 1 ? sheet : sheet.replace(/\.jpg$/, ".png"), frames: pngs, times };
}

export function srt(words, file) {
  const lines = [];
  let cur = null;
  for (const w of words) {
    const len = cur ? cur.text.length + 1 + w.text.length : 0;
    if (!cur || len > 42 || w.start - cur.end > 0.6 || /[.!?]$/.test(cur.text)) { if (cur) lines.push(cur); cur = { start: w.start, end: w.end, text: w.text }; }
    else { cur.text += " " + w.text; cur.end = w.end; }
  }
  if (cur) lines.push(cur);
  const ts = (t) => { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
  const body = lines.map((l, i) => { const end = Math.min(l.end + 0.3, lines[i + 1] ? lines[i + 1].start - 0.01 : l.end + 0.3); return `${i + 1}\n${ts(l.start)} --> ${ts(Math.max(end, l.start + 0.3))}\n${l.text}\n`; }).join("\n");
  fs.writeFileSync(file, body);
  return file;
}

function deliverPath(plan, ext) {
  const name = `${plan.title} - edited`;
  let dir = plan.source ? path.dirname(plan.source) : path.join(HOME, "exports");
  try { fs.accessSync(dir, fs.constants.W_OK); } catch { dir = path.join(HOME, "exports"); }
  fs.mkdirSync(dir, { recursive: true });
  let p = path.join(dir, `${name}.${ext}`), v = 2;
  while (fs.existsSync(p)) p = path.join(dir, `${name} v${v++}.${ext}`);
  return p;
}

export function render(project, { draft = false, deliver = true } = {}) {
  const t0 = Date.now();
  const { total } = compose(project, { quiet: true });
  const plan = load(project);
  const L = lint(project);
  if (!L.ok && L.errors.length) throw new Error("the composition has errors:\n" + L.errors.map((e) => `- ${e.message || e.code || JSON.stringify(e)}`).join("\n"));
  fs.mkdirSync(path.join(project, "renders"), { recursive: true });
  const raw = path.join(project, "renders", `${slug(plan.title)}${draft ? "-draft" : ""}.mp4`);
  process.stdout.write(`rendering ${total.toFixed(1)} s at ${draft ? "draft" : "full"} quality (every frame goes through the browser: a few minutes for a short, longer for long-form)...\n`);
  const r = hf(["render", project, "-o", raw, "--quality", draft ? "draft" : "looks", "--fps", String(FPS), "--quiet"], { allowFail: true });
  if (r.code !== 0 || !fs.existsSync(raw)) throw new Error("render failed:\n" + (r.err || r.out).trim().split("\n").slice(-15).join("\n"));
  // checks
  const p = probe(raw);
  const problems = [];
  if (Math.abs(p.duration - total) > 0.15) problems.push(`length ${p.duration.toFixed(2)} s, expected ${total.toFixed(2)} s`);
  if (!p.hasAudio) problems.push("no audio track");
  let lv = p.hasAudio ? loudness(raw) : { lufs: NaN, peak: NaN };
  if (p.hasAudio && (Math.abs(lv.lufs + 14) > 1 || lv.peak > -1)) {
    const fixed = raw.replace(/\.mp4$/, ".norm.mp4");
    ffmpeg(["-i", raw, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", fixed]);
    fs.renameSync(fixed, raw);
    lv = loudness(raw);
  }
  const words = fixedWords(project, plan);
  const result = { file: raw, seconds: Math.round((Date.now() - t0) / 1000), duration: p.duration, lufs: lv.lufs, peak: lv.peak, problems };
  if (deliver && !draft) {
    const dest = deliverPath(plan, "mp4");
    fs.copyFileSync(raw, dest);
    result.delivered = dest;
    if (words.length) result.srt = srt(words, dest.replace(/\.mp4$/, ".srt"));
  }
  return result;
}

export function summary(res) {
  const lines = [];
  lines.push(`${res.problems.length ? "CHECK" : "DONE"}  ${res.delivered || res.file}`);
  lines.push(`  ${fmtTime(res.duration)} long, ${Number.isFinite(res.lufs) ? `${res.lufs.toFixed(1)} LUFS, peak ${res.peak.toFixed(1)} dB` : "silent"}, rendered in ${res.seconds} s`);
  if (res.srt) lines.push(`  captions file: ${res.srt}`);
  for (const p of res.problems) lines.push(`  problem: ${p}`);
  return lines.join("\n");
}
