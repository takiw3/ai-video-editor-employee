# Masterclass outline: edit like a pro with Claude and Agentic Cut

Goal: every student leaves with Agentic Cut installed, their brand set, and one finished short posted.
Format: 90 minutes live, or 7 short recorded lessons.

## 1. Why an AI editor (5 min)
- The bottleneck is editing, not ideas. 30 to 60 minutes per short by hand; 5 minutes of your attention here.
- What Claude does (decides the edit) vs what the engine does (cuts, renders). You stay the director.

## 2. Install live (10 min)
- `/plugin marketplace add takiw3/ai-video-editor-employee`, `/plugin install agentic-cut@agentic-cut`, `/agentic-cut:setup`.
- Common snags: Node.js or ffmpeg missing (Claude installs them), corporate laptops (admin rights), disk space.

## 3. Your brand in one message (5 min)
- `/agentic-cut:brand`: accent colour, font, caption style, look, handle.
- Show the 9 caption styles side by side (`/agentic-cut:effects captions`).

## 4. Record for the edit (10 min)
- Hook first. Eye level. Light in front. Retakes are free: pause and say it again.
- Demo: record a 45-second take live, with a deliberate "um" and a retake.

## 5. The first edit (20 min)
- `/agentic-cut:edit <clip>`. Read what it cut. Open `script.txt`.
- The plan: hook, captions, cut moves, zooms, one visual change every 3 to 5 seconds, CTA.
- The preview sheet. Asking for changes in plain words. Render. Where the file lands.

## 6. Podcast and webinar clips (15 min)
- `/agentic-cut:clips <episode>`. What makes a clip stand alone: a first line that needs no context, one idea, a payoff.
- Following the speaker with `frame.x`; `fit` when both people matter.

## 7. Going further (15 min)
- YouTube long-form: soft punches, section titles, b-roll, a lower third, the SRT.
- The HyperFrames registry: 450+ blocks (`/agentic-cut:effects lower third`, `light leak`, `title`).
- Looks and treatments: `vhs-playback`, `creator-camcorder`, grain, vignette.
- Opening the project in HyperFrames Studio (`ac studio`) for frame-by-frame work.

## 8. Homework (5 min)
- Post one short this week made with Agentic Cut. Share the before/after in the community.
- Bonus: turn your last live call into 3 clips.

## Live demo checklist
- [ ] Setup already run on the demo machine (show it on a second machine only if time allows)
- [ ] A 45-second take with one "um" and one retake
- [ ] A screenshot and a screen recording in the clip's folder for b-roll
- [ ] A 10-minute podcast or call recording for the clips segment
- [ ] Brand values ready: hex colour, Google Font, handle
