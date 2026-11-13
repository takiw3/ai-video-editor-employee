# Playbook: recipes that work

Start from the recipe closest to the request, then adjust to the transcript. Times below are examples: use the
times in `script.txt`.

## 1. Talking-head short (Reels, TikTok, Shorts)
The default. Hook on frame 0, captions on every word, a move on every cut, one visual change every 3 to 5 seconds,
a CTA at the end.
```json
{
  "captions": { "style": "bold", "accent": ["agent", "10 hours"] },
  "cuts": { "style": "punch", "sfx": true },
  "text": [
    { "at": 0, "end": 3, "style": "hook", "text": "Stop wasting\n*10 hours* on email" },
    { "at": 9.2, "end": 11.5, "style": "number", "value": 500, "suffix": " hrs", "text": "saved last year", "sfx": "ding" },
    { "at": 17.2, "style": "cta", "text": "Comment AGENT" }
  ],
  "zooms": [{ "at": 3.3, "end": 4.7, "scale": 1.25, "kind": "snap" }],
  "progress": true
}
```
- The hook says the payoff, not the topic: "Stop wasting 10 hours on email", not "Email tips".
- Hide captions while a number or title carries the words: `"captions": { "hide": [[9.2, 11.5]] }`.

## 2. Podcast or interview clip (wide shot to vertical)
`AC new "<podcast>" --from 312 --to 351 --format short --title "<the hook>"`, then follow the speaker:
```json
{
  "frame": { "mode": "crop", "x": [[0, 0.3], [8.0, 0.72], [21.4, 0.3]] },
  "captions": { "style": "karaoke", "position": "low" },
  "cuts": { "style": "zoom" },
  "text": [{ "at": 0, "end": 3, "style": "hook", "text": "The #1 AI mistake\nbusiness owners make" }]
}
```
- Find each speaker's x from `AC preview --at 1,9` (0 = left edge, 1 = right edge of the source).
- Both people in frame matter (a reaction, a back-and-forth): `"frame": { "mode": "fit" }` instead.

## 3. Tutorial with screen recordings
```json
{
  "captions": { "style": "highlight" },
  "broll": [
    { "at": 4.0, "end": 9.5, "src": "media/screen-1.mp4", "mode": "top", "in": "up", "out": "fade" },
    { "at": 12.0, "end": 15.0, "src": "media/result.png", "mode": "card", "fit": "contain", "in": "pop", "sfx": "pop" }
  ],
  "text": [{ "at": 4.0, "end": 9.5, "style": "label", "text": "STEP 1", "y": 0.56 }]
}
```
- `top` keeps the speaker on the bottom half; `full` covers them (their voice continues).
- Screenshots: `fit: "contain"` so nothing is cropped.

## 4. YouTube long-form
`AC new "<video>" --format long`. Clean and calm: captions off (the SRT goes to YouTube), soft punches on cuts,
section titles, b-roll where the words describe something visual, a lower third early.
```json
{
  "captions": { "style": "none" },
  "cuts": { "style": "punch-soft", "every": 2 },
  "look": "clean-studio",
  "blocks": [{ "name": "lt-clean-bar", "at": 2, "dur": 5, "set": { "#lt-name": "Taki Wong", "#lt-role": "Founder, TakiGPT" } }],
  "text": [{ "at": 64.2, "end": 67, "style": "title", "text": "Step 1: pick one task" }],
  "broll": [{ "at": 71, "end": 78, "src": "media/dashboard.png", "mode": "full", "in": "whip", "sfx": "whoosh" }],
  "zooms": [{ "at": 120, "end": 135, "scale": 1.1, "kind": "push" }]
}
```
- One `title` per section; the titles and their times make good YouTube chapters for the description.
- Long renders take a while because every frame goes through a browser. Check a section first with a `--draft`
  of a copy whose `keep` is trimmed, or render once the plan is settled.

## 5. Ad or promo (punchy)
```json
{
  "pace": "tight",
  "captions": { "style": "one-word" },
  "cuts": { "style": "glitch", "sfx": "glitch" },
  "look": "bright-pop",
  "shake": [{ "at": 2.1, "dur": 0.4 }],
  "flash": [{ "at": 2.1 }],
  "text": [{ "at": 2.1, "end": 3.6, "style": "title", "text": "50% OFF", "anim": "slam", "sfx": "boom" }],
  "blocks": [{ "name": "organic-light-leak-overlay", "at": 0, "dur": 1.5 }]
}
```

## 6. Retro, film or lo-fi
```json
{ "look": "vhs-playback", "grade": { "details": { "grain": 0.35, "vignette": 0.3 } }, "captions": { "style": "typewriter" } }
```
Also: `creator-camcorder`, `home-movie-8mm`, `vintage-wash`, `mono-fade`, and `blocks` `camcorder-hud`.

## Taste
- One effect per moment. A zoom, a shake and a flash on the same word cancel each other out.
- Captions never cover the face: `position: "low"` when the face sits low in frame.
- Text stays up long enough to read: half a second plus a third of a second per word.
- Accent the words that carry the meaning, not every noun.
- B-roll shows what the words say, at the moment they say it.
- End on the strongest line or the CTA, not on "so yeah".
