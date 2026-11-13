// Sound effects synthesized with ffmpeg on demand: nothing to download, nothing to license.
import fs from "node:fs";
import path from "node:path";
import { ffmpeg } from "./util.mjs";

export const SFX = {
  whoosh: { d: 0.5, expr: "(random(0)*2-1)*pow(sin(PI*t/0.5),2)", post: "bandpass=f=900:width_type=o:w=2.5,volume=3" },
  swoosh: { d: 0.3, expr: "(random(0)*2-1)*pow(sin(PI*t/0.3),2)", post: "bandpass=f=2400:width_type=o:w=2,volume=3" },
  pop: { d: 0.16, expr: "0.8*sin(2*PI*(380+1400*exp(-35*t))*t)*exp(-28*t)", post: "" },
  click: { d: 0.04, expr: "0.9*(random(0)*2-1)*exp(-260*t)", post: "highpass=f=1500" },
  tick: { d: 0.05, expr: "0.7*sin(2*PI*2400*t)*exp(-90*t)", post: "" },
  boom: { d: 1.2, expr: "0.9*sin(2*PI*(42+90*exp(-7*t))*t)*exp(-3.2*t)", post: "lowpass=f=300,volume=1.6" },
  riser: { d: 1.4, expr: "(random(0)*2-1)*pow(t/1.4,2.2)", post: "highpass=f=600,volume=1.4" },
  ding: { d: 1.0, expr: "0.5*(sin(2*PI*1318*t)+0.6*sin(2*PI*2637*t)+0.3*sin(2*PI*3955*t))*exp(-4.5*t)", post: "" },
  glitch: { d: 0.35, expr: "0.6*(random(0)*2-1)*gt(sin(2*PI*28*t),0)*exp(-6*t)", post: "acrusher=bits=5:mode=log:aa=1" },
  type: { d: 0.06, expr: "0.6*(random(0)*2-1)*exp(-120*t)+0.3*sin(2*PI*1800*t)*exp(-150*t)", post: "highpass=f=900" },
};

export function sfxFile(project, name) {
  const s = SFX[name];
  if (!s) return null;
  const out = path.join(project, "media", "sfx", `${name}.wav`);
  if (fs.existsSync(out)) return out;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const fade = `afade=t=out:st=${(s.d - 0.03).toFixed(3)}:d=0.03`;
  const chain = [s.post, "aformat=channel_layouts=stereo", fade].filter(Boolean).join(",");
  ffmpeg(["-f", "lavfi", "-i", `aevalsrc='${s.expr}':s=48000:d=${s.d}`, "-af", chain, "-c:a", "pcm_s16le", out]);
  return out;
}
