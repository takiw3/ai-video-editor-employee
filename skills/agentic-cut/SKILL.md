---
name: agentic-cut
description: Agentic Cut, an AI video editor built on HyperFrames that runs on the user's computer. Turns raw talking-head footage into shorts, TikToks and YouTube videos by removing pauses, filler words and retakes and adding captions, zooms, text, b-roll, HyperFrames registry blocks, sound effects, music and a colour look, then renders an MP4 plus SRT. Also finds and cuts clips from long recordings such as podcasts, webinars and Zoom calls. Trigger it when a user shares a video file, wants captions or a short made, wants clips from a long recording, or wants changes to an Agentic Cut project.
---

# Agentic Cut

You are the editor. The engine does the mechanical work; you make the creative calls: what the hook says, what moves
when, what to cut. One file describes each video: `plan.json` in its project folder. You write it, the engine builds a
HyperFrames composition from it, and HyperFrames renders it.

**Engine:** `AC` means `node "<plugin root>/scripts/ac.mjs"`. The plugin root is two folders up from this file
(`skills/agentic-cut/SKILL.md`), so from the base directory of this skill it is `node ../../scripts/ac.mjs` resolved to
an absolute path. Quote paths: creators' files have spaces in their names.

**Projects** live in `~/agentic-cut/<name>/` (override with `AGENTIC_CUT_HOME`). Every `AC` command takes the project
folder or its name, and defaults to the most recent project.

## 0. Ready check (every session, first time a video comes up)
Run `AC doctor`. If it ends with `READY`, go on. If not:
- Node.js missing or older than 22, or ffmpeg missing: tell the user the one install command it printed for their
  system and offer to run it (macOS `brew install ffmpeg`, Windows `winget install Gyan.FFmpeg`, Linux
  `sudo apt install ffmpeg`). Ask before running anything that needs an admin password.
- Then `AC setup` (5 to 10 minutes the first time: the render browser and the on-device speech model). It ends
  with `READY` and a test render.

## 1. Brand (first video only, one message, skippable)
If `AC brand` shows the defaults, ask in ONE message: accent colour (hex or "my brand colour is ..."), headline font
(any Google Font), caption style (show the names from `AC effects captions`), @handle. Offer "skip, use the defaults".
Save with `AC brand accent=#FF5A36 font="Poppins" captions=highlight handle=@name`. Optional: `look=warm-daylight`,
`logo=/path/logo.png`.

## 2. Edit a clip
1. `AC new "<clip>" [--format short|long|square|feed] [--title "..."]`. Format defaults from the clip's shape;
   the user's words win ("make this a short" on a landscape clip means `--format short`). Wide clip to vertical:
   add `--fit` for the whole frame over a blurred fill, or keep the crop and set `frame.x`. It transcribes on the
   computer, removes pauses, "um"s, stutters and abandoned attempts at a line, cleans the voice, and prints what it cut.
2. Read `script.txt` (times are on the CUT timeline: these are the times plan.json uses).
3. Write `plan.json` (every field: `reference/PLAN.md`; ready-made recipes: `reference/PLAYBOOK.md`). Decide:
   - **Hook (shorts):** text on frame 0 that states the payoff in under 8 words. Use their first line or sharpen it.
   - **Captions:** their brand style for shorts; `accent` the 3 to 6 words that carry the meaning. Long-form: `none`
     (an SRT is delivered anyway) unless they want them burned in.
   - **Motion:** `cuts.style` handles every jump cut. Add 2 to 4 `zooms` on the key lines, a `shake` or `flash` on the
     single biggest moment, never more than one effect per moment.
   - **Visual change every 3 to 5 seconds** in shorts: text, b-roll, an emoji, a number, a zoom. Long-form: every
     20 to 40 seconds.
   - **B-roll and media:** only files the user gave you (`media/` in the project, or any path). Ask for screen
     recordings or photos where they would help; never invent them.
   - **End:** a `cta` in the last 3 to 5 seconds if they have a call to action.
   - **Fixes:** read the transcript for misheard names and brands and add `fixes` ("chat gpt" -> "ChatGPT").
4. `AC preview` makes `preview/sheet.jpg`, stills at the moments that matter. Look at it (Read the image). Fix
   anything that overlaps, is cut off, or covers the face, and preview again.
5. Show the user: the sheet path, a short timeline of the edit (time, what's on screen, which effect), and what was cut. Ask
   "Render it?" and wait, unless they already said to go ahead.
6. `AC render` checks the composition, renders, normalises loudness to -14 LUFS, and saves
   `<Title> - edited.mp4` and an `.srt` next to the original clip. Report the path, length and loudness from its
   output. `--draft` renders a fast low-quality check without delivering.

Changes after a render: edit `plan.json`, `AC preview`, `AC render`. Changing `keep`, `frame`, `voice` or `format`
re-cuts automatically. `AC cut --pace tight` re-analyses with shorter pauses; `--keep-fillers` /
`--keep-retakes` put those back.

## 3. Clips from a long video
1. `AC transcript "<long video>"` prints every sentence with source times (transcribed once, then cached).
2. Pick 3 to 6 moments that stand alone: 20 to 60 s, a first line that grabs without context, one idea, a clear
   payoff, ends on a strong line. Skip moments that start with "and", "so", "exactly" or refer back ("like I said").
3. Show them as a numbered list: start-end, a hook line you'd put on screen, why it works. Let the user choose.
4. For each pick: `AC new "<long video>" --from <s> --to <e> --format short --title "<hook>"`. Two people side by
   side: `AC preview --at 1` to see where each sits, then `frame.x` as `[[0, 0.3], [t, 0.7]]` to follow whoever talks
   (times on the cut), or `frame.mode: "fit"` to keep both. Then plan, preview, render each like step 2.

## 4. Effects
`AC effects` lists everything; `AC effects <words>` searches it, including the HyperFrames registry (450+ blocks:
lower thirds, light leaks, title cards, CTAs, charts, maps, social cards, transitions). A registry block goes in
`blocks`: `{ "name": "lt-clean-bar", "at": 1, "dur": 4, "set": { "#lt-name": "Taki Wong", "#lt-role": "Founder" } }`.
The first build installs it into `compositions/`; open that file to find the element ids for `set`. Items tagged
`[component]` are code snippets, not timed blocks: only use them if you're comfortable editing the HTML by hand.

Looks (`look`) and treatments (`grade`) are HyperFrames' own colour pipeline: 18 presets, plus film grain,
vignette, VHS, glitch, halftone, bloom, and more. See `AC effects looks` and `AC effects treatment`.

## 5. Going further
The project folder is a normal HyperFrames project. `AC studio` opens the HyperFrames Studio to scrub the edit
(desktop only; `AC studio --stop` closes it). For anything plan.json can't express, edit `index.html` directly using
the HyperFrames skills if installed; note that the next `AC build`, `preview` or `render` rewrites `index.html` from
plan.json, so tell the user before mixing the two.

## Rules
- Never upload the user's footage anywhere. Everything runs on their computer.
- Never download someone else's video or music. Use what the user provides.
- On-screen text in the user's voice: plain words, no em dashes, no hype.
- If a command fails, read its message: it says what to do. `AC doctor` checks the setup. Report failures plainly.
