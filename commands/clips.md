---
description: Find the best moments in a long video (podcast, webinar, Zoom call) and cut them into vertical shorts
argument-hint: <long video> [how many, how long]
---

Use the agentic-cut skill, section "Clips from a long video", on: $ARGUMENTS

Transcribe it with `AC transcript`, propose the strongest standalone moments as a numbered list (times, the hook line
you'd put on screen, why it works), and let the user pick. Then make each pick with `AC new --from --to --format
short`, plan it, preview it and render it.
