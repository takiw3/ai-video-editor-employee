// Finds what to cut from a talking-head take: long pauses, filler words, stutters and retakes.
// Words are in SOURCE seconds. Returns keep ranges (source seconds) and a list of what was removed.
import { q, r3 } from "./util.mjs";

const FILLERS = new Set(["um", "umm", "ummm", "uh", "uhh", "uhm", "erm", "er", "ah", "ahh", "hmm", "hm", "mm", "mmm"]);
export const PACES = {
  tight: { maxGap: 0.22, keepGap: 0.1 },
  natural: { maxGap: 0.4, keepGap: 0.2 },
  loose: { maxGap: 0.7, keepGap: 0.35 },
};

const norm = (t) => String(t).toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

function levelAt(env, t) {
  if (!env) return -120;
  const i = Math.round((t - env.offset) / env.step);
  return i >= 0 && i < env.db.length ? env.db[i] : -120;
}

// A speech threshold relative to this recording: halfway between the noise floor and typical speech.
function threshold(env) {
  if (!env) return -45;
  const v = Array.from(env.db).filter((x) => x > -100).sort((a, b) => a - b);
  if (!v.length) return -45;
  const floor = v[Math.floor(v.length * 0.1)], speech = v[Math.floor(v.length * 0.7)];
  return Math.max(floor + 6, (floor + speech) / 2 - 3);
}

// Speech models often stretch a word over the silence after it. Trim each word to where the voice actually is,
// so pauses show up as gaps (and captions switch on time). Only trims a quiet run of 0.1 s or more.
export function refine(words, env) {
  if (!env) return words;
  const v = Array.from(env.db).filter((x) => x > -100).sort((a, b) => a - b);
  if (!v.length) return words;
  const floor = v[Math.floor(v.length * 0.1)], speech = v[Math.floor(v.length * 0.7)];
  const thr = floor + Math.max(5, 0.3 * (speech - floor));
  const t0 = env.offset, t1 = env.offset + env.db.length * env.step;
  return words.map((w) => {
    if (w.start < t0 || w.end > t1) return w;
    let s = w.start, e = w.end;
    let t = w.end;
    while (t > w.start && levelAt(env, t) < thr) t -= env.step;
    if (w.end - t >= 0.1) e = Math.max(w.start + 0.08, t + 0.04);
    t = w.start;
    while (t < e && levelAt(env, t) < thr) t += env.step;
    if (t - w.start >= 0.1) s = Math.min(e - 0.06, t - 0.03);
    return { ...w, start: r3(s), end: r3(e) };
  });
}

export function analyze(words, { env = null, total, pace = "natural", keepFillers = false, keepRetakes = false, window = null } = {}) {
  const P = PACES[pace] || PACES.natural;
  const thr = threshold(env);
  const [w0, w1] = window || [0, total];
  const W = words.filter((w) => w.start >= w0 - 0.05 && w.end <= w1 + 0.05);
  const drop = new Array(W.length).fill(null);
  const toks = W.map((w) => norm(w.text));

  if (!keepFillers) {
    toks.forEach((t, i) => { if (FILLERS.has(t)) drop[i] = "filler"; });
    // stutters: the same short word twice in a row, close together
    for (let i = 0; i + 1 < W.length; i++) {
      if (toks[i] && toks[i] === toks[i + 1] && toks[i].length <= 5 && W[i + 1].start - W[i].end < 0.6 && !/^\d+$/.test(toks[i])) drop[i] = drop[i] || "stutter";
    }
  }
  if (!keepRetakes) {
    // a retake: the same 3+ words said again within 15 s, after a pause. Keep the last attempt.
    for (let i = 0; i < W.length; i++) {
      if (drop[i]) continue;
      for (let j = i + 3; j < Math.min(W.length, i + 40); j++) {
        if (W[j].start - W[i].start > 15) break;
        let L = 0;
        while (L < 8 && j + L < W.length && i + L < j && toks[i + L] && toks[i + L] === toks[j + L]) L++;
        const pauseBefore = W[j].start - W[j - 1].end;
        if (L >= 3 && pauseBefore >= 0.25) {
          for (let k = i; k < j; k++) drop[k] = drop[k] || "retake";
          break;
        }
      }
    }
  }

  // Build keep ranges from runs of kept words; split a run at any pause longer than maxGap.
  const runs = [];
  let cur = null;
  for (let i = 0; i < W.length; i++) {
    if (drop[i]) { if (cur) { runs.push(cur); cur = null; } continue; }
    if (cur && W[i].start - W[cur.last].end > P.maxGap) { runs.push(cur); cur = null; }
    if (!cur) cur = { first: i, last: i };
    else cur.last = i;
  }
  if (cur) runs.push(cur);

  const keep = [];
  for (let r = 0; r < runs.length; r++) {
    const a = W[runs[r].first], b = W[runs[r].last];
    const prevEnd = runs[r].first > 0 ? W[runs[r].first - 1].end : w0;
    const nextStart = runs[r].last + 1 < W.length ? W[runs[r].last + 1].start : w1;
    // pad into the pause, following the voice's real onset and release
    let s = a.start - P.keepGap * 0.4, e = b.end + P.keepGap * 0.6;
    for (let t = a.start; t > a.start - 0.25; t -= 0.01) { if (levelAt(env, t) < thr) break; s = Math.min(s, t - 0.02); }
    for (let t = b.end; t < b.end + 0.35; t += 0.01) { if (levelAt(env, t) < thr) break; e = Math.max(e, t + 0.03); }
    s = Math.max(s, prevEnd + 0.01, w0);
    e = Math.min(e, nextStart - 0.01, w1);
    // the first and last ranges stop short of words outside the window (a clip never starts on half a word)
    if (r === 0) { const before = words.filter((w) => w.end <= a.start + 0.001).pop(); s = Math.max(w0, a.start - 0.15, before ? before.end + 0.03 : 0); }
    if (r === runs.length - 1) { const after = words.find((w) => w.start >= b.end - 0.001); e = Math.min(w1, b.end + 0.45, after ? after.start - 0.03 : Infinity); }
    keep.push([q(s), q(e)]);
  }
  // join ranges that are almost touching: a 2-frame cut only causes a jump
  const merged = [];
  for (const k of keep) {
    const p = merged[merged.length - 1];
    if (p && k[0] - p[1] < 0.1) p[1] = Math.max(p[1], k[1]);
    else if (k[1] - k[0] >= 0.1) merged.push([...k]);
  }

  const removed = [];
  for (let i = 0; i < W.length; i++) {
    if (!drop[i]) continue;
    const last = removed[removed.length - 1];
    if (last && last.why === drop[i] && W[i].start - last.end < 0.8) { last.end = r3(W[i].end); last.text += " " + W[i].text; }
    else removed.push({ at: r3(W[i].start), end: r3(W[i].end), why: drop[i], text: W[i].text });
  }
  const pauses = [];
  for (let i = 1; i < merged.length; i++) {
    const gap = merged[i][0] - merged[i - 1][1];
    if (gap > 0.3) pauses.push(r3(gap));
  }
  return { keep: merged.map(([a, b]) => [r3(a), r3(b)]), removed, pauseCount: pauses.length, pauseTime: r3(pauses.reduce((s, x) => s + x, 0)) };
}

// Map source-time words onto the cut timeline.
export function remap(words, keep) {
  const out = [];
  let off = 0;
  for (const [a, b] of keep) {
    for (const w of words) {
      const s = Math.max(w.start, a), e = Math.min(w.end, b);
      const inside = e - s;
      if (inside <= 0) continue;
      if (inside < Math.min(0.06, (w.end - w.start) * 0.5)) continue;
      out.push({ text: w.text, start: r3(off + s - a), end: r3(off + e - a) });
    }
    off += b - a;
  }
  out.sort((x, y) => x.start - y.start);
  return out;
}

export const keptLength = (keep) => keep.reduce((s, [a, b]) => s + (b - a), 0);
export const cutPoints = (keep) => { const c = []; let off = 0; for (let i = 0; i < keep.length; i++) { off += keep[i][1] - keep[i][0]; if (i < keep.length - 1) c.push(r3(off)); } return c; };
