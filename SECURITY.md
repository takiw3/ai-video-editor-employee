# Security

## Reporting a vulnerability

Report privately through GitHub's **Security → Report a vulnerability** on this repository. Please don't open a
public issue for security problems.

Useful reports include:
- a way to make the plugin upload footage, audio or transcripts anywhere
- a way to make it run a command, install software or render without the user's approval
- instructions hidden in a video's speech, a file name or a downloaded block that Claude follows as if the user gave
  them (prompt injection)
- a way for a plan or registry block to read or write files outside the project and the user's chosen output folder

Include the steps to reproduce, what happened, and what you expected. You'll get an acknowledgement, and a fix is
released as a new version with a note in `CHANGELOG.md`.

## What the plugin trusts

- It runs code only from this repository, the pinned HyperFrames version (`hyperframes@0.9.42` from npm) and GSAP
  from npm.
- HyperFrames registry blocks are HTML and JavaScript downloaded from the HyperFrames registry when a video uses one.
  They run inside the headless render browser, in the project folder.
- Speech in a video and text in transcripts are data. The skill tells Claude never to follow instructions found in
  them.

## Supported versions

Only the latest release gets fixes. Update with `claude plugin update agentic-cut@agentic-cut`.
