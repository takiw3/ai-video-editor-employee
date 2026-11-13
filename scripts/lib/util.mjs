// Shared helpers: paths, running tools, probing media, reading audio levels.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const HF_VERSION = "0.9.42";
export const FPS = 30;
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const RUNTIME = path.join(ROOT, "scripts", "runtime");
export const HOME = process.env.AGENTIC_CUT_HOME || path.join(os.homedir(), "agentic-cut");
export const CACHE = path.join(HOME, ".cache");
const WIN = process.platform === "win32";

export const CANVAS = {
  short: [1080, 1920],
  long: [1920, 1080],
  square: [1080, 1080],
  feed: [1080, 1350],
};

// Round to the frame grid so cuts land on whole frames.
export const q = (t) => Math.round(t * FPS) / FPS;
export const r3 = (t) => Math.round(t * 1000) / 1000;

export function run(cmd, args, { cwd, quiet = true, allowFail = false, input, maxBuffer = 2 ** 30 } = {}) {
  const res = spawnSync(cmd, args, {
    cwd,
    input,
    maxBuffer,
    shell: WIN && /^(npx|npm)$/.test(cmd),
    stdio: quiet ? ["pipe", "pipe", "pipe"] : ["inherit", "inherit", "inherit"],
  });
  if (res.error && !allowFail) throw new Error(`${cmd} could not start: ${res.error.message}`);
  if (res.status !== 0 && !allowFail) {
    const err = String(res.stderr || "").trim().split("\n").slice(-12).join("\n");
    throw new Error(`${cmd} ${args.slice(0, 3).join(" ")} failed (exit ${res.status})\n${err}`);
  }
  return { code: res.status, out: String(res.stdout || ""), err: String(res.stderr || "") };
}

export function has(cmd) {
  const r = spawnSync(cmd, ["-version"], { stdio: "ignore", shell: false });
  return !r.error && r.status === 0;
}

// The pinned HyperFrames CLI, fetched once by npx and cached.
export function hf(args, opts = {}) {
  return run("npx", ["--yes", `hyperframes@${HF_VERSION}`, ...args], opts);
}

export function ffmpeg(args, opts = {}) {
  return run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], opts);
}

export function probe(file) {
  const { out } = run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]);
  const j = JSON.parse(out);
  const v = j.streams.find((s) => s.codec_type === "video");
  const a = j.streams.find((s) => s.codec_type === "audio");
  let w = v ? v.width : 0, h = v ? v.height : 0;
  const rot = v ? Math.abs(Number((v.tags || {}).rotate || (v.side_data_list || []).find((d) => d.rotation !== undefined)?.rotation || 0)) : 0;
  if (rot === 90 || rot === 270) [w, h] = [h, w];
  const [n, d] = String(v?.avg_frame_rate || "30/1").split("/").map(Number);
  return {
    duration: Number(j.format.duration || v?.duration || a?.duration || 0),
    width: w,
    height: h,
    fps: d ? n / d : 30,
    hasVideo: !!v,
    hasAudio: !!a,
    hdr: /smpte2084|arib-std-b67/.test(String(v?.color_transfer || "")),
  };
}

// Loudness envelope: dBFS every 10 ms, from a 16 kHz mono decode.
export function envelope(file, from = 0, to = null) {
  const args = ["-v", "error"];
  if (from) args.push("-ss", String(from));
  args.push("-i", file);
  if (to !== null) args.push("-t", String(to - from));
  args.push("-ac", "1", "-ar", "16000", "-f", "f32le", "-");
  const res = spawnSync("ffmpeg", args, { maxBuffer: 2 ** 31 });
  if (res.status !== 0) throw new Error("could not read the audio: " + String(res.stderr).slice(-300));
  const buf = res.stdout;
  const samples = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
  const hop = 160;
  const out = new Float32Array(Math.ceil(samples.length / hop));
  for (let i = 0; i < out.length; i++) {
    let s = 0, n = 0;
    for (let j = i * hop; j < Math.min(samples.length, (i + 1) * hop); j++) { s += samples[j] * samples[j]; n++; }
    out[i] = n ? 10 * Math.log10(s / n + 1e-12) : -120;
  }
  return { db: out, step: 0.01, offset: from };
}

export function loudness(file) {
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-"], { allowFail: true });
  const s = r.err.slice(r.err.lastIndexOf("Summary:"));
  const lufs = Number((s.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1]);
  const peak = Number((s.match(/Peak:\s+(-?[\d.]+) dBFS/) || [])[1]);
  return { lufs, peak };
}

export const readJSON = (f, fallback = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return fallback; } };
export const writeJSON = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2) + "\n"); };

export function slug(s) {
  return String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 48) || "video";
}

export function fileKey(file) {
  const st = fs.statSync(file);
  return crypto.createHash("sha1").update(`${path.resolve(file)}|${st.size}|${st.mtimeMs}`).digest("hex").slice(0, 16);
}

export function hashOf(v) {
  return crypto.createHash("sha1").update(JSON.stringify(v)).digest("hex").slice(0, 12);
}

// A project is a folder with plan.json. Accept the folder, its name under HOME, or nothing (the newest).
export function projectDir(arg) {
  if (arg && fs.existsSync(path.join(arg, "plan.json"))) return path.resolve(arg);
  if (arg && fs.existsSync(path.join(HOME, arg, "plan.json"))) return path.join(HOME, arg);
  if (!arg && fs.existsSync(HOME)) {
    const dirs = fs.readdirSync(HOME).map((d) => path.join(HOME, d)).filter((d) => fs.existsSync(path.join(d, "plan.json")));
    dirs.sort((a, b) => fs.statSync(path.join(b, "plan.json")).mtimeMs - fs.statSync(path.join(a, "plan.json")).mtimeMs);
    if (dirs[0]) return dirs[0];
  }
  throw new Error(`no project ${arg ? `"${arg}"` : "yet"}: start one with  ac new <clip>`);
}

export function fmtTime(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export function flags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) out[k] = v;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) out[k] = argv[++i];
      else out[k] = true;
    } else out._.push(a);
  }
  return out;
}
