"""«not-ugly» pixel film: one ElevenLabs take (Dennis · Eleven v4, en) with word timings, reusing the studio adapter.
The key is read from .env.local into this process only and never printed."""
import sys, os, json, base64, subprocess, pathlib, wave
ROOT = pathlib.Path("/Users/rv/Desktop/Motion Studio")
sys.path.insert(0, str(ROOT / "scripts"))
for line in (ROOT / ".env.local").read_text().splitlines():
    if line.startswith("ELEVENLABS_API_KEY="):
        os.environ["ELEVENLABS_API_KEY"] = line.split("=", 1)[1].strip().strip('"').strip("'")
import elevenlabs_speech as el

HERE = pathlib.Path(__file__).parent
out = HERE / "voice"
plain = (HERE / "narration.txt").read_text().strip()
annotated = "[curious] " + plain
voice = "Uk2wBdgJpwqwirqxDggc"  # Dennis
payload, endpoint = el.speech_payload(voice, annotated, "eleven_v4", "en")
response, key = el.cached_speech(out, voice, payload, endpoint)
words = el.spoken_alignment(plain, annotated, response.get("alignment") or {}, "en")
mp3 = out / f"eleven-{key}.mp3"
mp3.write_bytes(base64.b64decode(response["audio_base64"], validate=True))
wav = out / "voice-raw.wav"
subprocess.run([str(ROOT / "bin/ffmpeg"), "-y", "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", str(wav)], check=True)
with wave.open(str(wav), "rb") as f:
    dur = f.getnframes() / f.getframerate()
(out / "words.json").write_text(json.dumps({"text": plain, "duration": dur, "words": words}, indent=1))
print(f"ok key={key} words={len(words)} duration={dur:.2f}s last_word_end={words[-1]['end']:.2f}s")
