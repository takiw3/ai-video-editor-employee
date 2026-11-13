# Changelog

## 1.0.0 (2026-11-13)
First release.
- `ac new`: on-device transcription through HyperFrames, voice-trimmed word timings, removal of pauses, filler
  words, stutters and retakes, one-pass ffmpeg cut with reframing (crop, speaker-following crop, or fit over a
  blurred fill), voice cleanup.
- plan.json composer: 9 caption styles, 6 cut moves, zooms, shake, flash, 9 text styles and 8 animations, b-roll in
  4 layouts with 8 transitions, progress bar, logo, transcript fixes.
- HyperFrames colour looks and treatments, and any HyperFrames registry block, with text set from the plan.
- 10 synthesized sound effects; music that ducks under the voice.
- Preview contact sheets, render with checks, -14 LUFS loudness, delivery next to the source with an SRT.
- Clips from long videos with `--from` / `--to`, transcripts cached per file.
