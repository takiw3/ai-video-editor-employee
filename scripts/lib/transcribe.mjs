// Word-level transcript of a source file, via HyperFrames (Parakeet when installed, otherwise whisper.cpp).
// Cached per file, so cutting several clips from one long video transcribes it once.
import fs from "node:fs";
import path from "node:path";
import { CACHE, fileKey, hf, readJSON, writeJSON, fmtTime } from "./util.mjs";

export function transcribe(file, { language, model } = {}) {
  const dir = path.join(CACHE, fileKey(file) + (language ? `-${language}` : ""));
  const out = path.join(dir, "words.json");
  const cached = readJSON(out);
  if (cached) return cached;
  fs.mkdirSync(dir, { recursive: true });
  const args = ["transcribe", path.resolve(file), "-d", dir, "--json"];
  if (language && !/^en/i.test(language)) args.push("--model", model || "small", "--language", language);
  else if (model) args.push("--model", model);
  else if (language) args.push("--language", "en");
  process.stdout.write("transcribing on this computer (first run downloads the speech model)...\n");
  const r = hf(args, { allowFail: true });
  const last = r.out.trim().split("\n").filter(Boolean).pop() || "{}";
  let res = {};
  try { res = JSON.parse(last); } catch {}
  if (!res.ok) {
    const msg = (res.error && res.error.message) || r.err.trim().split("\n").slice(-4).join("\n");
    throw new Error(`transcription failed: ${msg}\nRun  ac doctor  to check the speech model.`);
  }
  const raw = readJSON(res.transcriptPath || path.join(dir, "transcript.json"), []);
  const words = raw
    .map((w) => ({ text: String(w.text || w.word || "").trim(), start: Number(w.start), end: Number(w.end) }))
    .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end))
    .map((w) => ({ ...w, end: Math.max(w.end, w.start + 0.04) }));
  writeJSON(out, words);
  return words;
}

// Sentences with their times, for reading a transcript or picking clips.
export function sentences(words, { maxGap = 0.9 } = {}) {
  const out = [];
  let cur = null;
  for (const w of words) {
    const gap = cur ? w.start - cur.end : 0;
    if (!cur || gap > maxGap) { if (cur) out.push(cur); cur = { start: w.start, end: w.end, text: w.text }; }
    else { cur.end = w.end; cur.text += " " + w.text; }
    if (/[.!?]["')\]]*$/.test(w.text)) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}

export function transcriptText(words) {
  return sentences(words).map((s) => `[${fmtTime(s.start)} - ${fmtTime(s.end)}] ${s.text}`).join("\n") + "\n";
}
