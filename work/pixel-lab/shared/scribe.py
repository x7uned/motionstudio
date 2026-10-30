"""Scribe check of a pixel film's single voice take: what was really said, with real word timings.
usage: python3 -I scribe.py <film dir>   → <film>/voice/scribe.json (+ prints the transcript)
The ElevenLabs key is read from .env.local into this process only and never printed or written."""
import sys, os, json, uuid, pathlib, urllib.request

ROOT = pathlib.Path("/Users/rv/Desktop/Motion Studio")
key = ""
for line in (ROOT / ".env.local").read_text().splitlines():
    if line.startswith("ELEVENLABS_API_KEY="):
        key = line.split("=", 1)[1].strip().strip('"').strip("'")
film = pathlib.Path(sys.argv[1])
wav = (film / "voice" / "voice-raw.wav").read_bytes()
out = film / "voice" / "scribe.json"
if out.exists():
    print("cached", out); sys.exit(0)
b = uuid.uuid4().hex
parts = []
for name, val in (("model_id", "scribe_v1"), ("language_code", "eng"), ("timestamps_granularity", "word"), ("tag_audio_events", "false")):
    parts.append(f"--{b}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{val}\r\n".encode())
parts.append(f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"voice.wav\"\r\nContent-Type: audio/wav\r\n\r\n".encode() + wav + b"\r\n")
parts.append(f"--{b}--\r\n".encode())
req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=b"".join(parts), method="POST",
                             headers={"xi-api-key": key, "Content-Type": f"multipart/form-data; boundary={b}"})
with urllib.request.urlopen(req, timeout=300) as r:
    res = json.load(r)
words = [{"text": w["text"], "start": w["start"], "end": w["end"]} for w in res.get("words", []) if w.get("type") == "word"]
out.write_text(json.dumps({"text": res.get("text", ""), "words": words}, indent=1))
print(res.get("text", ""))
