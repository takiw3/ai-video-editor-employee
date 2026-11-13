# Contributing

Thanks for helping make the Video Editor better. Bug reports from real footage are the most useful thing you can
send.

## Reporting a problem

Open an issue with:
- what you asked for, and what happened instead
- your system (macOS, Windows or Linux), Node.js version and `node scripts/ac.mjs doctor` output
- the error message, and the project's `plan.json` if the problem is in an edit

Please don't attach footage of other people without their permission. A short test clip of yourself is ideal.

## Working on the code

```
git clone https://github.com/takiw3/ai-video-editor-employee
cd ai-video-editor-employee
node scripts/ac.mjs doctor          # check the machine
node scripts/ac.mjs setup           # first time only
node scripts/ac.mjs new <clip>      # try a change on a real clip
node scripts/ac.mjs preview         # look at it
claude plugin validate .            # check the plugin manifests, commands and skill
```

Set `AGENTIC_CUT_HOME` to a scratch folder to keep test projects away from your real ones.

## Ground rules

- No new runtime dependencies. The engine is plain Node.js; HyperFrames runs through `npx`, pinned in
  `scripts/lib/util.mjs`.
- Everything the browser renders must be deterministic: no clocks, no randomness, no network calls in
  `scripts/runtime/`.
- New effects go in `plan.json` fields documented in `skills/agentic-cut/reference/PLAN.md`, with an entry in
  `scripts/lib/effects.mjs` so `ac effects` lists them.
- Only original work, or work under a license compatible with MIT, with credit in `THIRD_PARTY_NOTICES.md`.
- On-screen and documentation text: plain words, no em dashes.
- Test a render before opening a pull request, and say what you tested.
