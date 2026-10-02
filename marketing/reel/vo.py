import json, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("models/kokoro.onnx", "models/voices.bin")
lines = [
 "You lift. You run. And then? Nothing happens.",
 "In Level, every set earns XP.",
 "Level up, and climb from E rank to S rank.",
 "Runs and rides count too. Every lap.",
 "Forgot to hit start? Log it after. The XP still counts.",
 "Level. Your workouts, now a game. Free to join, link in bio.",
]
out = []
for i, t in enumerate(lines):
    a, sr = k.create(t, voice="am_michael", speed=1.08, lang="en-us")
    sf.write(f"public/vo{i}.wav", a, sr)
    out.append({"text": t, "file": f"vo{i}.wav", "sec": round(len(a)/sr, 2)})
json.dump(out, open("src_vo.json","w"), indent=1)
print(out)
