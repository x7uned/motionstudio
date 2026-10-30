"""«From the slowest heartbeat to the fastest»: a second, separate take of the same narration with an American (US)
accent, same voice (Dennis · Eleven v4, the owner's professional voice), requested by the user on 2026-10-23.
One ElevenLabs request; the key is read from .env.local into this process only and never printed.
Writes voice-us/ (mp3, 48 kHz wav, words.json); the film's own voice/ take is not touched."""
import sys, os, re, json, base64, subprocess, pathlib, wave
ROOT = pathlib.Path("/Users/rv/Desktop/Motion Studio")
sys.path.insert(0, str(ROOT / "scripts"))
for line in (ROOT / ".env.local").read_text().splitlines():
    if line.startswith("ELEVENLABS_API_KEY="):
        os.environ["ELEVENLABS_API_KEY"] = line.split("=", 1)[1].strip().strip('"').strip("'")
import elevenlabs_speech as el

HERE = pathlib.Path(__file__).parent
out = HERE / "voice-us"
out.mkdir(exist_ok=True)
plain = (HERE / "narration.txt").read_text().strip()
annotated = "[American accent] [curious] " + plain
voice = "Uk2wBdgJpwqwirqxDggc"  # Dennis
payload, endpoint = el.speech_payload(voice, annotated, "eleven_v4", "en")
response, key = el.cached_speech(out, voice, payload, endpoint)
mp3 = out / "heartbeat-narration-us.mp3"
mp3.write_bytes(base64.b64decode(response["audio_base64"], validate=True))
wav = out / "heartbeat-narration-us.wav"
subprocess.run([str(ROOT / "bin/ffmpeg"), "-y", "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", str(wav)], check=True)
with wave.open(str(wav), "rb") as f:
    dur = f.getnframes() / f.getframerate()
# word timings: drop the leading direction tags from the alignment, then map onto the plain text
al = response.get("alignment") or {}
chars = al.get("characters", [])
text = "".join(chars)
words = None
m = re.match(r"(?:\[[^\]]+\] )+", text)
if m and text[m.end():] == plain:
    k = m.end()
    mapped = {name: al[name][k:] for name in ("characters", "character_start_times_seconds", "character_end_times_seconds")}
    words = el.words_from_characters(plain, mapped, "en")
elif text == plain:
    words = el.words_from_characters(plain, al, "en")
(out / "words.json").write_text(json.dumps({"text": plain, "duration": dur, "words": words, "tags": annotated[: len(annotated) - len(plain)].strip()}, indent=1))
print(f"ok key={key} duration={dur:.2f}s words={'none' if words is None else len(words)} -> {mp3.name}, {wav.name}")
