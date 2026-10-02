# Levl reels

Short vertical videos (1080 x 1920) for Instagram Reels, Stories and YouTube Shorts, made in
code with Remotion so a new reel is a new script, not a new edit. Kept apart from the app: it has
its own `package.json` and the app's `tsconfig.json` leaves this folder out.

## Make a reel
1. `npm install`
2. `npm run assets` copies the story and carousel images and the two Levl fonts into `public/`.
3. Voice: `pip install kokoro-onnx soundfile`, download `kokoro-v1.0.int8.onnx` and
   `voices-v1.0.bin` from the kokoro-onnx GitHub releases into `models/`, then `npm run voice`.
   It writes one WAV per line into `public/` and the line lengths into `src_vo.json`, which set
   the length of each scene. Write "Level" in the spoken text so the voice says the name right.
4. `npm run studio` to preview, `npm run render` to write `out/levl-reel-1.mp4`. On a Mac, drop
   the `--browser-executable` flag and Remotion downloads its own browser.

## Safe zones
Instagram covers about the top 250 px and the bottom 350 px of a reel with its own buttons.
Captions sit 330 px above the bottom; keep anything important between those lines.
