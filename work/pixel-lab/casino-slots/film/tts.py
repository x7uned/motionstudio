"""Casino secrets 2/5 «This slot machine already knows if you won» (Kagenami, not a loop): one ElevenLabs take (Dennis · Eleven v4
[thoughtful], en) with word timings, reusing the studio adapter (frozen copy of pal-50hz/film/tts.py). No extra [pause] tag
(narration-tags.txt); the tags are stripped from the alignment, the spoken text is narration.txt. The key is read from
.env.local into this process only and never printed."""
import sys, os, re, json, base64, subprocess, pathlib, wave
ROOT = pathlib.Path("/Users/rv/Desktop/Motion Studio")
sys.path.insert(0, str(ROOT / "scripts"))
for line in (ROOT / ".env.local").read_text().splitlines():
    if line.startswith("ELEVENLABS_API_KEY="):
        os.environ["ELEVENLABS_API_KEY"] = line.split("=", 1)[1].strip().strip('"').strip("'")
import elevenlabs_speech as el

HERE = pathlib.Path(__file__).parent
out = HERE / "voice"
plain = (HERE / "narration.txt").read_text().strip()
tagged = (HERE / "narration-tags.txt").read_text().strip()
TAG = re.compile(r"\[(?:thoughtful|pause|long pause)\] ")
assert TAG.sub("", tagged) == plain, "tagged text must equal the plain narration without tags"
annotated = "[thoughtful] " + tagged
voice = "Uk2wBdgJpwqwirqxDggc"  # Dennis
payload, endpoint = el.speech_payload(voice, annotated, "eleven_v4", "en")
response, key = el.cached_speech(out, voice, payload, endpoint)
al = response.get("alignment") or {}
actual = "".join(al.get("characters", []))
if actual == plain:
    mapped = al
elif actual == annotated:
    keep, cur = [], 0
    for m in TAG.finditer(annotated):
        keep.extend(range(cur, m.start())); cur = m.end()
    keep.extend(range(cur, len(annotated)))
    mapped = {k: [al[k][i] for i in keep] for k in ("characters", "character_start_times_seconds", "character_end_times_seconds")}
else:
    (out / "alignment-mismatch.txt").write_text(actual)
    raise SystemExit("alignment text differs from the request; take saved, see voice/alignment-mismatch.txt")
words = el.words_from_characters(plain, mapped, "en")
mp3 = out / f"eleven-{key}.mp3"
mp3.write_bytes(base64.b64decode(response["audio_base64"], validate=True))
wav = out / "voice-raw.wav"
subprocess.run([str(ROOT / "bin/ffmpeg"), "-y", "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", str(wav)], check=True)
with wave.open(str(wav), "rb") as f:
    dur = f.getnframes() / f.getframerate()
(out / "words.json").write_text(json.dumps({"text": plain, "duration": dur, "words": words}, indent=1))
print(f"ok key={key} words={len(words)} duration={dur:.2f}s last_word_end={words[-1]['end']:.2f}s")
for a, b in zip(words, words[1:]):
    if b["start"] - a["end"] > 0.35:
        print(f"gap {b['start'] - a['end']:.2f}s after {a['text']!r} at {a['end']:.2f}s")
