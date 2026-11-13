// Cuts the source down to the keep ranges in one ffmpeg pass: reframes it to the canvas, cleans the voice,
// and writes media/cut.mp4 at a constant 30 fps with a keyframe every second (fast to seek while rendering).
import fs from "node:fs";
import path from "node:path";
import { CANVAS, FPS, ffmpeg, probe, run } from "./util.mjs";

const VOICE = {
  off: [],
  light: ["highpass=f=70"],
  clean: ["highpass=f=80", "afftdn=nf=-28", "acompressor=threshold=-21dB:ratio=2.5:attack=5:release=90:makeup=2"],
  strong: ["highpass=f=90", "afftdn=nf=-22", "deesser=i=0.4", "acompressor=threshold=-24dB:ratio=3.5:attack=4:release=70:makeup=3"],
};

let zscale = null;
function hasZscale() {
  if (zscale === null) zscale = /\bzscale\b/.test(run("ffmpeg", ["-hide_banner", "-filters"], { allowFail: true }).out);
  return zscale;
}

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

// frame.x / frame.y: a number 0..1 (where the crop sits), or [[t, x], ...] on the output timeline.
function stepExpr(v, size, cropSize) {
  const px = (f) => Math.round(Math.min(Math.max(0, (size - cropSize) * f), size - cropSize));
  if (!Array.isArray(v)) return String(px(v ?? 0.5));
  const pts = [...v].sort((a, b) => a[0] - b[0]);
  let expr = String(px(pts[pts.length - 1][1]));
  for (let i = pts.length - 2; i >= 0; i--) expr = `if(lt(t,${pts[i + 1][0]}),${px(pts[i][1])},${expr})`;
  return `'${expr}'`;
}

export function videoChain(src, plan) {
  const [W, H] = CANVAS[plan.format] || CANVAS.short;
  const f = plan.frame || {};
  const chain = [];
  if (src.hdr) {
    if (hasZscale()) chain.push("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv");
  }
  if (f.mode === "fit") {
    // the whole frame, centred, over a blurred fill of itself
    return { pre: chain, fit: true, W, H };
  }
  const ta = W / H, sa = src.width / src.height;
  let cw = sa > ta ? src.height * ta : src.width, ch = sa > ta ? src.height : src.width / ta;
  const zoom = Math.max(1, Number(f.zoom || 1));
  cw = even(cw / zoom); ch = even(ch / zoom);
  chain.push(`crop=${cw}:${ch}:${stepExpr(f.x, src.width, cw)}:${stepExpr(f.y ?? 0.5, src.height, ch)}`);
  chain.push(`scale=${W}:${H}:flags=lanczos`, "setsar=1");
  return { pre: chain, fit: false, W, H };
}

export function cut(project, plan, { quiet = false } = {}) {
  const srcFile = plan.source;
  if (!fs.existsSync(srcFile)) throw new Error(`the source clip moved or was deleted: ${srcFile}`);
  const src = probe(srcFile);
  const keep = plan.keep;
  if (!keep || !keep.length) throw new Error("plan.keep is empty: nothing to keep");
  for (let i = 1; i < keep.length; i++) if (keep[i][0] < keep[i - 1][1] - 0.001) throw new Error(`plan.keep must be in order and not overlap (range ${i + 1})`);
  const w0 = Math.max(0, keep[0][0] - 1), w1 = keep[keep.length - 1][1] + 0.5;
  const rel = keep.map(([a, b]) => [a - w0, b - w0]);
  const eps = 0.0005;
  const sel = rel.map(([a, b]) => `between(t,${(a - eps).toFixed(4)},${(b - eps - 1 / (FPS * 2)).toFixed(4)})`).join("+");
  const asel = rel.map(([a, b]) => `between(t,${a.toFixed(4)},${(b - 0.00003).toFixed(4)})`).join("+");
  const { pre, fit, W, H } = videoChain(src, plan);
  const g = [];
  g.push(`[0:v]fps=${FPS},select='${sel}',setpts=N/${FPS}/TB${pre.length ? "," + pre.join(",") : ""}[vs]`);
  if (fit) {
    g.push(`[vs]split[bg][fg]`);
    g.push(`[bg]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=40:2,eq=brightness=-0.12:saturation=0.8[bgb]`);
    g.push(`[fg]scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos[fgs]`);
    g.push(`[bgb][fgs]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p[v]`);
  } else g.push(`[vs]format=yuv420p[v]`);
  if (src.hasAudio) {
    const voice = VOICE[plan.voice || "clean"] || VOICE.clean;
    g.push(`[0:a]aformat=sample_rates=48000:channel_layouts=stereo,aselect='${asel}',asetpts=N/SR/TB${voice.length ? "," + voice.join(",") : ""},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`);
  }
  const script = path.join(project, "media", "cut.filter");
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.writeFileSync(script, g.join(";\n"));
  const out = path.join(project, "media", "cut.mp4");
  const tmp = out.replace(/\.mp4$/, ".tmp.mp4");
  const total = keep.reduce((s, [a, b]) => s + (b - a), 0);
  if (!quiet) process.stdout.write(`cutting ${keep.length} piece${keep.length > 1 ? "s" : ""} into ${total.toFixed(1)} s...\n`);
  ffmpeg([
    "-ss", w0.toFixed(3), "-t", (w1 - w0).toFixed(3), "-i", srcFile,
    "-filter_complex_script", script,
    "-map", "[v]", ...(src.hasAudio ? ["-map", "[a]"] : []),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-g", String(FPS), "-r", String(FPS),
    ...(src.hasAudio ? ["-c:a", "aac", "-b:a", "192k"] : []),
    "-t", total.toFixed(3), "-movflags", "+faststart", tmp,
  ]);
  fs.renameSync(tmp, out);
  return { file: out, total, W, H, hasAudio: src.hasAudio, hdr: src.hdr && !hasZscale() };
}
