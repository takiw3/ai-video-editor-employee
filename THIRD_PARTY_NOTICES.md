# Third-party software

Agentic Cut contains only its own code (MIT). It installs or calls the following at run time. None of it is
included in this repository.

| what | how it's used | license |
|---|---|---|
| [HyperFrames](https://github.com/heygen-com/hyperframes) by HeyGen, version 0.9.42 | composition, preview, colour grading, transcription, rendering; run with `npx hyperframes@0.9.42` | Apache-2.0 |
| HyperFrames registry blocks | installed into a project when a plan uses one (`blocks`) | see each block's source in the HyperFrames repository |
| [GSAP](https://gsap.com) 3.14.2 | animation runtime, installed from npm into `~/agentic-cut/.vendor` and copied into each project | [GSAP standard "no charge" license](https://gsap.com/standard-license) |
| Speech models (whisper.cpp models, or NVIDIA Parakeet when installed) | on-device transcription, downloaded by HyperFrames on first use | MIT (whisper.cpp, Whisper models), CC-BY-4.0 (Parakeet) |
| Chrome headless shell | rendering, downloaded by HyperFrames | Google Chrome terms / Chromium BSD-style licenses |
| [FFmpeg](https://ffmpeg.org) | cutting, audio cleanup, loudness, sound-effect synthesis; installed by the user | LGPL / GPL depending on the build |
| [Google Fonts](https://fonts.google.com) | caption and title fonts, loaded at render time | SIL Open Font License (most families) |

The sound effects are synthesized by ffmpeg from formulas in `scripts/lib/sfx.mjs` when a project first uses them.
They are original and free to use in any video.
