"""Voice Remixing test (user request 2026-10-23): an American-accent variant of the owner's Dennis voice.
POST /v1/text-to-voice/{voice_id}/remix with a narration excerpt of the heart film; the previews are saved for the user
to choose from. Nothing is created in the account yet (a preview becomes a voice only via POST /v1/text-to-voice).
The key is read from .env.local into this process only and never printed. A pending marker prevents a silent second
paid request after an unclear failure."""
import json, base64, pathlib, urllib.request, urllib.error, sys

ROOT = pathlib.Path("/Users/rv/Desktop/Motion Studio")
KEY = next(l.split("=", 1)[1].strip().strip('"').strip("'") for l in (ROOT / ".env.local").read_text().splitlines() if l.startswith("ELEVENLABS_API_KEY="))
HERE = pathlib.Path(__file__).parent
OUT = HERE / "voice-remix"; OUT.mkdir(exist_ok=True)
VOICE = "Uk2wBdgJpwqwirqxDggc"  # Dennis (owner's professional voice)
TEXT = ("A blue whale's heart can slow to just two beats a minute. A shrew's heart can beat twenty-five times a second. "
        "Mostly, size sets the speed. On a deep dive, the whale's heart beats once every thirty seconds. "
        "Its huge, stretchy main artery keeps the blood moving between beats. But a heart can also slow down to save energy.")
DESCRIPTION = ("Keep the same male voice: the same timbre, pitch, age and warm, calm, conversational explainer delivery. "
               "Change only the accent: speak English with a natural General American (United States) accent, "
               "with American vowels and a rhotic R, like a friendly American science explainer. No British accent and no Russian accent.")
body = {"voice_description": DESCRIPTION, "text": TEXT, "prompt_strength": float(sys.argv[1]) if len(sys.argv) > 1 else 0.5}
pending = OUT / "remix.pending.json"
if pending.exists():
    raise SystemExit("A previous remix request has an unknown result; check the ElevenLabs history before repeating.")
pending.write_text(json.dumps({"body": body}))
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-voice/{VOICE}/remix?output_format=mp3_44100_128",
                             data=json.dumps(body).encode(), headers={"xi-api-key": KEY, "Content-Type": "application/json"}, method="POST")
try:
    res = json.load(urllib.request.urlopen(req, timeout=180))
except urllib.error.HTTPError as e:
    detail = e.read().decode(errors="replace")[:800]
    if e.code in (400, 401, 403, 404, 409, 422, 429): pending.unlink(missing_ok=True)
    raise SystemExit(f"HTTP {e.code}: {detail}")
pending.unlink(missing_ok=True)
meta = {"voice": VOICE, "body": body, "text": res.get("text"), "previews": []}
for i, p in enumerate(res.get("previews", []), 1):
    f = OUT / f"dennis-us-preview-{i}.mp3"
    f.write_bytes(base64.b64decode(p["audio_base_64"]))
    meta["previews"].append({"file": f.name, "generated_voice_id": p["generated_voice_id"], "duration_secs": p.get("duration_secs"), "language": p.get("language")})
(OUT / "remix.json").write_text(json.dumps(meta, indent=1))
print(json.dumps({"previews": [{k: v for k, v in p.items() if k != "generated_voice_id"} for p in meta["previews"]]}, indent=1))
