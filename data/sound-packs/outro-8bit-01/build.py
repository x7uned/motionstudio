"""Build the 8-bit outro audition. Kenney CC0 originals are read from audition-01/sources; synth candidates are original."""
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import wave

ROOT = Path(__file__).resolve().parent
SOURCES = ROOT.parent / 'audition-01' / 'sources'
FFMPEG = ROOT.parents[2] / 'bin/ffmpeg'
RATE = 48000
KENNEY = {
    'click': [('interface-sounds', 'click_002', 'Kenney · щелчок'), ('interface-sounds', 'tick_002', 'Kenney · тик'),
              ('digital-audio', 'pepSound1', 'Kenney · цифровой бип'), ('digital-audio', 'tone1', 'Kenney · короткий тон')],
    'arpeggio': [('digital-audio', 'powerUp2', 'Kenney · power-up 2'), ('digital-audio', 'powerUp7', 'Kenney · power-up 7'),
                 ('digital-audio', 'threeTone1', 'Kenney · три тона'), ('digital-audio', 'zapThreeToneUp', 'Kenney · три тона вверх')],
}
CATEGORY = {'click': 'Пиксельный клик · нажатие кнопки', 'arpeggio': 'Арпеджио · «Вы подписаны» / «Following»'}

def pulse(freq, t, duty=.5, ceiling=12000):
    """Band-limited pulse wave: clean chiptune colour without aliasing."""
    value, k = 0.0, 1
    while k * freq < ceiling:
        value += math.sin(math.pi * k * duty) / k * math.cos(2 * math.pi * k * freq * t - math.pi * k * duty)
        k += 1
    return value * 4 / math.pi * .5

def notes(sequence, duty, step, hold, echo=0.0):
    """Each note starts at its own key; the final note decays into a smooth tail."""
    total = step * (len(sequence) - 1) + hold + (0.11 if echo else 0) + .02
    out = [0.0] * int(total * RATE)
    for i, freq in enumerate(sequence):
        start, length = i * step, (hold if i == len(sequence) - 1 else step * .92)
        for j in range(int(length * RATE)):
            t = j / RATE
            env = min(1, t / .004) * (math.exp(-t * (5.5 if i == len(sequence) - 1 else 9)))
            env *= min(1, (length - t) / (.06 if i == len(sequence) - 1 else .008))
            value = pulse(freq, t, duty) * env
            n = int((start + t) * RATE)
            out[n] += value
            if echo and n + int(.11 * RATE) < len(out): out[n + int(.11 * RATE)] += value * echo
    return out

def blip(f0, f1, length, duty=.5):
    out = []
    for j in range(int(length * RATE)):
        t = j / RATE; freq = f0 + (f1 - f0) * t / length
        out.append(pulse(freq, t, duty) * min(1, t / .0015) * math.exp(-t * 60) * min(1, (length - t) / .006))
    return out

SYNTH = {
    'click': [('synth-pixel-click', 'Синтез · пиксельный клик', lambda: blip(1500, 900, .045)),
              ('synth-press-release', 'Синтез · нажатие и отпускание',
               lambda: blip(660, 600, .03, .25) + [0.0] * int(.035 * RATE) + blip(990, 940, .03, .25))],
    'arpeggio': [('synth-major-arp', 'Синтез · мажорное арпеджио', lambda: notes([1046.5, 1318.5, 1568.0, 2093.0], .5, .062, .26, .22)),
                 ('synth-pentatonic', 'Синтез · пентатоника вверх', lambda: notes([784.0, 880.0, 1046.5, 1174.7, 1318.5, 1568.0], .25, .046, .22)),
                 ('synth-sparkle', 'Синтез · искра', lambda: notes([1318.5, 1661.2, 1975.5, 2637.0], .125, .07, .3, .18))],
}

def normalized(samples):
    peak = max(abs(x) for x in samples)
    active = [x for x in samples if abs(x) > peak * 0.01]
    rms = math.sqrt(sum(x * x for x in active) / len(active))
    gain = min(10 ** (-22 / 20) / rms, 10 ** (-6 / 20) / peak, 10 ** (12 / 20))
    return gain, peak

def write(filename, mono_or_stereo, channels):
    gain, peak = normalized(mono_or_stereo)
    frames = mono_or_stereo if channels == 2 else [v for x in mono_or_stereo for v in (x, x)]
    pcm = array.array('h', (round(max(-1, min(1, x * gain)) * 32767) for x in frames))
    with wave.open(str(ROOT / filename), 'wb') as output:
        output.setnchannels(2); output.setsampwidth(2); output.setframerate(RATE); output.writeframes(pcm.tobytes())
    return gain, peak, len(frames) / 2 / RATE

def build():
    (ROOT / 'audio').mkdir(exist_ok=True)
    items = []
    for kind in ('click', 'arpeggio'):
        for pack, stem, title in KENNEY[kind]:
            metadata = json.loads((SOURCES / (pack + '.json')).read_text())
            candidates = [p for p in (SOURCES / pack).rglob('*') if p.stem == stem and p.suffix in ('.wav', '.ogg')]
            assert len(candidates) == 1, (stem, candidates)
            source = candidates[0]
            raw = subprocess.check_output([str(FFMPEG), '-v', 'error', '-i', str(source), '-f', 'f32le', '-ar', str(RATE), '-ac', '2', '-'])
            number = f'{len(items) + 1:02d}'; filename = f'audio/{number}-{stem}.wav'
            gain, peak, duration = write(filename, array.array('f', raw), 2)
            items.append(dict(id=number, kind=kind, title=title, category=CATEGORY[kind], file=filename, duration=round(duration, 4),
                              pack=pack, author=metadata['author'], license=metadata['license'], source=metadata['source'],
                              original=str(source.relative_to(ROOT.parent)), originalSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                              sha256=hashlib.sha256((ROOT / filename).read_bytes()).hexdigest(),
                              gainDb=round(20 * math.log10(gain), 3), peakDbFS=round(20 * math.log10(peak * gain), 3)))
        for stem, title, make in SYNTH[kind]:
            number = f'{len(items) + 1:02d}'; filename = f'audio/{number}-{stem}.wav'
            gain, peak, duration = write(filename, make(), 1)
            items.append(dict(id=number, kind=kind, title=title, category=CATEGORY[kind], file=filename, duration=round(duration, 4),
                              pack='motion-studio-synth', author='Motion Studio (build.py)', license='original',
                              source='build.py', sha256=hashlib.sha256((ROOT / filename).read_bytes()).hexdigest(),
                              gainDb=round(20 * math.log10(gain), 3), peakDbFS=round(20 * math.log10(peak * gain), 3)))
    items.sort(key=lambda x: (x['kind'] != 'click', x['id']))
    manifest = dict(id='outro-8bit-01', created='2026-10-19', status='awaiting-editor-selection',
                    purpose='Заставка @xtuned v1: один клик и одно арпеджио. Победителя выбирает редактор.',
                    preparation='48 kHz stereo PCM16; constant gain toward active-sample RMS -22 dBFS; peak ceiling -6 dBFS; max boost +12 dB',
                    sounds=items)
    (ROOT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'catalog.js').write_text('window.SOUNDS = ' + json.dumps(items, ensure_ascii=False) + ';\n')
    print(json.dumps([(x['id'], x['title'], x['duration']) for x in items], ensure_ascii=False))

if __name__ == '__main__':
    build()
