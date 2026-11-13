# Quickstart: your first edit in 15 minutes

## 1. Install (once)
Open Claude Code and run:
```
/plugin marketplace add takiw3/ai-video-editor-employee
/plugin install agentic-cut@agentic-cut
/agentic-cut:setup
```
If setup says Node.js or ffmpeg is missing, let Claude run the install command it shows. Then setup downloads the
render browser and the speech model and ends with **READY**.

## 2. Your brand (optional, 1 minute)
```
/agentic-cut:brand accent #FF5A36, font Poppins, bold captions, handle @yourname
```

## 3. Record
30 to 60 seconds on your phone, vertical, eye level, window light in front of you. Say your best line first.
Mess up? Pause and say the line again: the retake is removed for you.

## 4. Edit
Drag the file into Claude:
```
/agentic-cut:edit ~/Desktop/IMG_1234.MOV  short, comment AGENT CTA at the end
```
Claude cuts it, plans the edit, and shows you a preview sheet and a list of beats. Ask for changes in plain words
("bigger captions", "zoom on 'never'", "use my screenshot when I say dashboard"), then say **go**.

## 5. Post
`<your clip name> - edited.mp4` and an `.srt` caption file appear next to your original. The MP4 is 1080x1920 at
-14 LUFS, ready for Reels, TikTok and Shorts.

## Next
- A podcast or webinar: `/agentic-cut:clips ~/Downloads/episode.mp4`
- A YouTube video: `/agentic-cut:edit ~/Desktop/video.mp4 long-form`
- Everything you can ask for: `/agentic-cut:effects`
