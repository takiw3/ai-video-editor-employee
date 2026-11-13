# plan.json: every field

`AC new` writes plan.json with the cut already filled in. Everything else is optional. Times are seconds on the CUT
timeline (the times in `script.txt`), except `keep` and `window`, which are seconds in the SOURCE clip.
`"end"` means the last frame.

## The video
| field | default | what it does |
|---|---|---|
| `title` | file name | names the delivered file: `<title> - edited.mp4` |
| `format` | from the clip | `short` 1080x1920, `long` 1920x1080, `square` 1080x1080, `feed` 1080x1350 |
| `source` | | the original clip (absolute path) |
| `window` | | `[from, to]` in the source: only this part (clips) |
| `language` | English | e.g. `"es"`, for transcription |

## The cut
| field | default | what it does |
|---|---|---|
| `keep` | from the analysis | `[[from, to], ...]` source ranges to keep, in order. Edit to restore or drop a line |
| `removed` | | what the analysis took out (pauses aren't listed): fillers, stutters, retakes. For reference |
| `pace` | `natural` | `tight`, `natural`, `loose`: how long a pause may stay. Re-run `AC cut --pace tight` |
| `frame` | crop, centred | `{ mode: "crop", x: 0.5, y: 0.5, zoom: 1 }`. x / y: where the crop sits, 0..1. `x: [[0, 0.3], [8.2, 0.7]]` moves it at 8.2 s (two speakers). `zoom: 1.3` crops tighter. `mode: "fit"`: the whole frame over a blurred fill. `face_y`: where the face is (0..1) for zooms |
| `voice` | `clean` | `off`, `light`, `clean`, `strong` (noisy rooms) |
| `fixes` | `{}` | words the speech model got wrong: `{ "chat gpt": "ChatGPT", "say new time": "save you time" }` |

## Captions
`captions: { style, accent, numbers, position, size, hide }`
- `style`: `bold`, `pop`, `highlight`, `karaoke`, `one-word`, `neon`, `minimal`, `typewriter`, `subtitle`, `none`
- `accent`: words always in the accent colour, e.g. `["agent", "free"]`. Numbers are accented unless `numbers: false`
- `position`: `top`, `middle`, `low`, `bottom`. `size`: 1 = default, 1.2 = bigger
- `hide`: `[[from, to]]` where something else carries the words (a full-screen title, a number)

## Text on screen
`text: [{ at, end, style, text, y, x, anim, size, sfx }]`
| style | use | extra fields |
|---|---|---|
| `hook` | the opening line, white boxes; `\n` breaks lines, `*word*` gets the accent | |
| `title` | big outlined line, chapter titles | |
| `label` | small accent pill: STEP 1, FREE, NEW | |
| `cta` | accent button; with no `end` it holds to the last frame | |
| `emoji` | a giant emoji that pops and wiggles | |
| `number` | rolls up to a value | `value`, `from`, `prefix`, `suffix`, `decimals`, `text` (small line under it) |
| `quote` | quote card | `by` |
| `list` | builds item by item | `items: ["...", ...]` or `[{ at, text }]`, `step`, `marker: "number"` |
| `handle` | your @handle, small | |

`anim`: `pop`, `slide`, `drop`, `fade`, `slam`, `spin`, `blur`, `type`, `none`. `y` / `x`: centre position, 0..1.
`sfx`: a sound on entry (see Sound).

## Camera
| field | shape |
|---|---|
| `cuts` | `{ style, every, sfx }`. style on every jump cut: `punch` (alternates tight and wide), `punch-soft`, `zoom`, `flash`, `whip`, `glitch`, `none`. `every: 2` = every other cut. `sfx: true` (a swoosh) or a sound name |
| `zooms` | `[{ at, end, scale: 1.25, kind: "smooth" \| "snap" \| "push", x, y }]` |
| `shake` | `[{ at, dur: 0.4, strength: 1 }]` |
| `flash` | `[{ at, dur: 0.2, color: "#ffffff" }]` |

## Picture
| field | shape |
|---|---|
| `broll` | `[{ at, end, src, mode, in, out, media_start, kenburns, fit, sfx }]`. mode: `full`, `pip`, `top`, `card`. in / out: `fade`, `slide`, `up`, `zoom`, `pop`, `whip`, `flash`, `cut`. Photos get a slow push unless `kenburns: false`. `fit: "contain"` shows the whole image (screenshots) |
| `blocks` | HyperFrames registry blocks: `[{ name, at, dur, set: { "#id": "text" }, fit, x, y, scale, zoom }]`. `fit`: `width`, `height`, `cover`, `contain`. Search with `AC effects <words>` |
| `look` | a HyperFrames colour preset: `clean-studio`, `warm-daylight`, `skin-soft`, `muted-editorial`, `deep-contrast`, `bright-pop`, `vintage-wash`, `mono-clean`, `creator-camcorder`, `vhs-playback`, ... (`AC effects looks`) |
| `grade` | HyperFrames grading on the footage: `{ adjust: { exposure, contrast, temperature, saturation, ... }, details: { grain, vignette }, effects: { chromaticAberration: 0.15, ... }, intensity }` (`AC effects treatment`) |
| `progress` | `true`: a progress bar |
| `logo` | `true`: the brand logo in the corner |

## Sound
| field | shape |
|---|---|
| `sfx` | `[{ at, name, volume }]` or `[[at, "name", volume]]`. Built in (synthesized, free to use): `whoosh`, `swoosh`, `pop`, `click`, `tick`, `boom`, `riser`, `ding`, `glitch`, `type`. Or `src` for your own file |
| `music` | `"path/song.mp3"` or `{ src, volume: 0.22, start, duck: true, duck_to: 0.4, fade_out: 1.5 }`. Ducks under the voice automatically |

## Brand (in plan.json, overrides ~/agentic-cut/brand.json for this video)
`brand: { accent, accent2, text, dark, font, body_font, handle, logo }`
