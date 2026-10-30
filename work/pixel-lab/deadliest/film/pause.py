"""Insert the user's requested ~1.5 s pause after "…the mosquito." (before "Yes.") into the single take.
Same take, one continuous master: the natural sentence gap is widened with its own room tone (the quietest 0.2 s of the gap,
looped with 30 ms crossfades) — no time-stretching. Writes voice/voice-master.wav and voice/words-master.json (shifted words)."""
import json, wave, struct, pathlib, math
HERE = pathlib.Path(__file__).parent
V = HERE / "voice"
d = json.loads((V / "words.json").read_text()); words = d["words"]
w = wave.open(str(V / "voice-raw.wav"), "rb"); sr = w.getframerate(); n = w.getnframes(); raw = w.readframes(n); w.close()
x = list(struct.unpack(f"<{n}h", raw))
i = next(k for k, ww in enumerate(words) if ww["text"] == "mosquito.")
a, b = words[i]["end"], words[i + 1]["start"]
TARGET = 1.5
ins = round((TARGET - (b - a)) * sr)
# quietest 0.2 s window inside the gap
L = int(0.2 * sr); best = None
for s in range(int((a + 0.05) * sr), int((b - 0.05) * sr) - L, int(0.01 * sr)):
    e = sum(v * v for v in x[s:s + L]) / L
    if best is None or e < best[0]: best = (e, s)
rms, s0 = math.sqrt(best[0]), best[1]
tone = x[s0:s0 + L]
fill = []
F = int(0.03 * sr)
while len(fill) < ins:
    seg = tone[:]
    if fill:  # crossfade the loop joint
        for k in range(F): fill[-F + k] = round(fill[-F + k] * (1 - k / F) + seg[k] * (k / F))
        seg = seg[F:]
    fill.extend(seg)
fill = fill[:ins]
cut = round(((a + b) / 2) * sr)
# crossfade the fill into the take at both edges
for k in range(F): fill[k] = round(fill[k] * (k / F) + x[cut + k] * (1 - k / F)); fill[-1 - k] = round(fill[-1 - k] * (k / F) + x[cut - 1 - k] * (1 - k / F))
y = x[:cut] + fill + x[cut:]
out = wave.open(str(V / "voice-master.wav"), "wb"); out.setnchannels(1); out.setsampwidth(2); out.setframerate(sr)
out.writeframes(struct.pack(f"<{len(y)}h", *[max(-32768, min(32767, v)) for v in y])); out.close()
sh = ins / sr
nw = [dict(ww, start=ww["start"] + (sh if k > i else 0), end=ww["end"] + (sh if k > i else 0)) for k, ww in enumerate(words)]
(V / "words-master.json").write_text(json.dumps({"text": d["text"], "duration": len(y) / sr, "words": nw, "edits": [{"after": "mosquito.", "at": round(cut / sr, 3), "insertedSeconds": round(sh, 3), "pause": TARGET, "roomToneRms": round(rms, 1)}]}, indent=1))
print(f"gap {b - a:.2f}s -> {TARGET}s, inserted {sh:.3f}s at {cut / sr:.2f}s, room tone rms {rms:.1f}/32768, new duration {len(y) / sr:.2f}s")
