# AI Video Editor Employee (Agentic Cut)

![Agentic Cut: the AI video editor employee for Claude, built on HyperFrames](docs/img/banner.jpg)

A [Claude Code](https://claude.com/claude-code) plugin named `agentic-cut`: a video editor that works on your
computer, directly with you. Hand it a raw talking-head recording and it cuts the dead air, filler words and false
starts, adds captions, zooms, on-screen text, b-roll, sound and your brand, and renders a finished short or YouTube
video with [HeyGen HyperFrames](https://github.com/heygen-com/hyperframes). It shows you a preview before it renders,
and it never uploads your footage or posts anything.

- **Author:** Taki Wong / TakiGPT AI Inc.
- **License:** MIT (HyperFrames, which it runs but does not bundle, is Apache-2.0, HeyGen, Inc.)
- **Plugin name:** `agentic-cut` · **Commands:** `/agentic-cut:...`
- **Version:** 1.0.0 · **Built on:** HyperFrames 0.9.42

## Who it's for

Business owners, entrepreneurs, coaches and creators who record themselves talking to camera and want those
recordings edited to a professional standard, without learning editing software or paying an editor per video.
One brand setup per computer.

## What it does

- **Cleans up the recording.** Removes long pauses, "um"s, stutters and the stumbled attempts when you say a line
  twice, then cleans up and levels your voice.
- **Edits in three shapes.** Vertical shorts for Reels, TikTok and YouTube Shorts; 16:9 YouTube videos; square and
  4:5 feed posts.
- **Turns long recordings into clips.** Reads a podcast, webinar or Zoom call, proposes the moments that stand on
  their own, and cuts the ones you pick into vertical clips, with the crop following whoever is talking.
- **Adds the editing.** 9 caption styles, 6 cut moves, smooth, snap and push zooms, shake and flash, 9 kinds of
  on-screen text (hooks, titles, counters, checklists, quote cards, CTAs) with 8 animations, b-roll in 4 layouts
  with 8 transitions, 10 sound effects, and music that drops under your voice.
- **Uses HyperFrames' library.** 18 colour looks, 18 film, glitch and print treatments, and 450+ ready-made blocks
  (lower thirds, light leaks, title cards and more), installed only when a video uses one.
- **Keeps your brand.** Accent colour, fonts, caption style, look, handle and logo, set once.
- **Delivers ready to post.** An MP4 at -14 LUFS (the loudness Instagram, TikTok and YouTube expect) and an SRT
  caption file, saved in the same folder as your recording.

![The 9 caption styles: bold, pop, highlight, karaoke, one word, neon, minimal, typewriter and subtitle](docs/img/caption-styles.jpg)

## What it will not do

- Upload your footage or audio anywhere. Transcription and rendering run on your computer.
- Render before you've seen the preview and said go, unless you tell it to skip the review.
- Invent b-roll, screenshots, testimonials or numbers. It only uses media and facts you give it.
- Download other people's videos or music.
- Post, schedule or publish anywhere. You decide where the finished file goes.
- Overwrite your original recording. The edit is a new file, and a second version gets "v2".
- Install system software (Node.js, ffmpeg) without asking you first.

## Requirements

- [Claude Code](https://claude.com/claude-code) (terminal, desktop app or IDE) or Claude Cowork. The plugin
  validates with Claude Code 2.1.325.
- Node.js 22 or newer, and ffmpeg. Setup checks both and gives you the one command to install whichever is missing.
- About 1 GB of free disk for the render browser and the on-device speech model.
- Internet for the first setup (HyperFrames, the browser and the speech model download once) and at render time for
  Google Fonts.

Tested end to end on Linux (Node.js 22.22, ffmpeg 6.1, HyperFrames 0.9.42): a clean setup ending in `READY`, and
full renders of a vertical short, a podcast clip and a 16:9 YouTube section, each checked for length, audio sync and
loudness. Not yet tested on macOS or Windows; report anything that breaks there.

Rendering runs every frame through a headless browser, so it takes minutes, not seconds: a few minutes for a short,
longer for long-form. A draft render gives a fast, low-quality check.

## Install

In Claude Code, run:

```
/plugin marketplace add takiw3/ai-video-editor-employee
/plugin install agentic-cut@agentic-cut
```

In the Claude desktop app you can also go to Settings, Customize, Plugins, Discover, add
`https://github.com/takiw3/ai-video-editor-employee` as a marketplace, sync it, and add Agentic Cut to this computer.

### What installation does and doesn't

Installing copies the plugin's commands, skill and scripts into Claude Code. That's all. It doesn't download
anything else, change your system, or run any code. The downloads happen when you run setup.

## First run

1. Run setup once per computer:

   ```
   /agentic-cut:setup
   ```

   It checks Node.js and ffmpeg, then downloads the HyperFrames render browser, the on-device speech model and the
   GSAP animation library into your user folders (`~/.cache/hyperframes` and `~/agentic-cut`). The first run takes
   5 to 10 minutes and ends with a test render and `READY`.

2. Set your brand, or skip this and use the defaults:

   ```
   /agentic-cut:brand accent #FFD23F, font Montserrat, bold captions, handle @yourname
   ```

3. Edit your first video:

   ```
   /agentic-cut:edit ~/Desktop/take.mov make it a short with a CTA to comment AGENT
   ```

   Claude cuts the take, plans the edit, and shows you a preview sheet and a timeline of the edit. Ask for changes
   in plain words, then say go.

## The team

The Video Editor is one specialist on a team of AI employees from the Agentic AI Academy:

| Employee | Owns |
| --- | --- |
| **Jarvis** | Chief of staff. Assigns work, collects results, holds priorities across the team. |
| **Video Editor** | This plugin. Editing the footage you record into finished, branded videos. |
| **Social Media** | Organic social: research, pillars, ideas, hooks, scripts, filming briefs, edit plans, local video rendering, packaging, analysis, experiments, coaching. |
| **Marketing** | Strategy, positioning, campaigns, email, funnels, copy, video scripts. |
| **Ads** | Paid media. |
| **Sales** | One-to-one prospect outreach, pipeline, deals. |
| **Support** | Customer inquiries. |
| **Dev** | Implementation. Site changes, tracking, integrations. |

The other employees are Hermes profiles and install separately. The Video Editor is a Claude Code plugin because
editing needs your footage, ffmpeg and a render browser on the same computer. Hand-offs are manual: bring a script or
filming brief from Social Media or Marketing, record it, edit it here, and take the finished file wherever it's going.
The Video Editor works fine on its own.

## Example tasks

- "Edit this into a 45-second Reel. Bold captions, a hook in the first second, and a CTA to comment GUIDE."
- "Here's last week's 60-minute webinar. Find five clips under 45 seconds that stand on their own."
- "Make this a YouTube video: captions off, a lower third with my name in the first 5 seconds, a title for each
  section."
- "Use the screenshot in my Downloads folder when I mention the dashboard, and zoom in on 'three hours'."
- "At 0:14 the caption says 'chat GPT'. Fix it to ChatGPT and render again."
- "Show me the lower thirds you have."
- "Change my brand colour to #FF5A36 and switch to highlight captions."

## Commands

| Command | Does |
| ----- | -------- |
| `/agentic-cut:setup` | Checks and installs what it needs, once per computer and after updates |
| `/agentic-cut:edit <clip>` | Turns a raw clip into a short, reel or YouTube video |
| `/agentic-cut:clips <long video>` | Proposes standalone moments from a long recording and cuts the ones you pick |
| `/agentic-cut:effects [words]` | Lists effects, looks, caption styles, sounds and HyperFrames blocks |
| `/agentic-cut:brand` | Sets your colours, fonts, caption style, look, handle and logo |

Behind the commands, one skill (`skills/agentic-cut/`) holds the editing workflow, every field of a video's
`plan.json` ([PLAN.md](skills/agentic-cut/reference/PLAN.md)) and ready-made edit recipes
([PLAYBOOK.md](skills/agentic-cut/reference/PLAYBOOK.md)). The engine (`scripts/`) is about 1,600 lines of plain
Node.js, CSS and browser JavaScript with no dependencies of its own.

## Permission model

Allowed by default: read the clips you point it to, transcribe them on your computer, create project files in
`~/agentic-cut/`, make preview stills, and download the HyperFrames blocks a video uses.

It asks you first before: rendering (once you've seen the preview), installing Node.js or ffmpeg, running anything
that needs an admin password, and using any media file you didn't hand it.

## Data and privacy

- Your footage never leaves your computer. Speech-to-text runs locally (whisper.cpp, or NVIDIA Parakeet if you
  install it), and so does rendering.
- Your brand settings live in `~/agentic-cut/brand.json`, and each video in its own folder under `~/agentic-cut/`.
  Plugin updates never touch them.
- Network use is limited to downloading tools and assets: HyperFrames and GSAP from npm, the render browser and
  speech model on first use, Google Fonts at render time, and registry blocks when a video uses one.
- This plugin has no telemetry and no accounts. HyperFrames has its own usage telemetry; turn it off with
  `npx hyperframes telemetry disable`.

## Optional extras

None are required.

- Another on-device speech model: `npx hyperframes models install parakeet` (HyperFrames uses it automatically once
  installed).
- The HyperFrames Studio, to scrub an edit frame by frame: ask Claude to "open this project in the studio".
- The HyperFrames skills (`npx skills add heygen-com/hyperframes`), for hand-editing a composition beyond what
  `plan.json` covers.
- Your own music and sound effects: put them in the project's `media/` folder or point to them.

## Update

```
claude plugin marketplace update agentic-cut
claude plugin update agentic-cut@agentic-cut
```

Then run `/agentic-cut:setup` again. Your brand, projects and finished videos are preserved.

## Remove

```
claude plugin uninstall agentic-cut@agentic-cut
claude plugin marketplace remove agentic-cut
```

Your projects stay in `~/agentic-cut/` until you delete that folder.

## Troubleshooting

- **Setup says FIX node:** install Node.js 22 or newer (nodejs.org, `brew install node`, or
  `winget install OpenJS.NodeJS.LTS`), then run `/agentic-cut:setup` again.
- **Setup says FIX ffmpeg:** `brew install ffmpeg` (macOS), `winget install Gyan.FFmpeg` (Windows),
  `sudo apt install ffmpeg` (Linux).
- **Transcription failed:** the first run downloads the speech model and needs internet. Run setup again; if it
  still fails, the message names the step.
- **A word in the captions is wrong:** tell Claude the right spelling ("it's ChatGPT, not chat GPT"). It adds a fix
  and renders again.
- **The crop cuts off a face** (wide footage made vertical): ask Claude to move the frame left or right, or to show
  the whole frame over a blurred background.
- **Render is slow:** expected, since every frame goes through a browser. Use a draft render for checks and render
  the final once.
- **"the composition has errors":** Claude reads the HyperFrames check and fixes the plan. If it can't, share the
  message in the community.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Validate the plugin with `claude plugin validate .` and check a machine with
`node scripts/ac.mjs doctor`.

## Security

Report vulnerabilities, such as a way to make it upload footage or run a command you didn't approve, privately
through GitHub's **Security → Report a vulnerability** on this repository. Details in [SECURITY.md](SECURITY.md).

## License

MIT, see [LICENSE](LICENSE). Copyright (c) 2026 TakiGPT AI Inc. Third-party software it installs is listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

---

Learn how to build your full AI workforce inside the Agentic AI Academy for
$97/month: https://www.skool.com/agenticaiacademy/about
