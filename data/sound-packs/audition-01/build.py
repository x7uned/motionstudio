"""Build the first audition. Originals and their licences remain in sources/."""
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import wave

ROOT = Path(__file__).resolve().parent
FFMPEG = ROOT.parents[2] / 'bin/ffmpeg'
GROUPS = [
    ('Щелчки и переключатели', 'interface-sounds', [
        ('click_001', 'Щелчок 1'), ('click_003', 'Щелчок 2'),
        ('tick_001', 'Короткий тик'), ('switch_001', 'Переключатель 1'),
        ('switch_004', 'Переключатель 2'), ('toggle_001', 'Тумблер'),
        ('select_001', 'Выбор элемента'), ('drop_001', 'Падение элемента'),
        ('pluck_001', 'Щипок'), ('scroll_001', 'Прокрутка'),
    ]),
    ('Сигналы и UI', 'interface-sounds', [
        ('confirmation_001', 'Подтверждение 1'), ('confirmation_003', 'Подтверждение 2'),
        ('error_001', 'Ошибка'), ('question_001', 'Вопрос'),
        ('glass_001', 'Стеклянный сигнал 1'), ('glass_004', 'Стеклянный сигнал 2'),
        ('bong_001', 'Тональный удар'), ('glitch_001', 'Глитч'),
        ('maximize_001', 'Разворачивание'), ('minimize_001', 'Сворачивание'),
    ]),
    ('Переходы и движение', 'digital-audio', [
        ('highUp', 'Цифровой подъём'), ('lowDown', 'Цифровой спад'),
        ('phaserUp1', 'Восходящий фазер'), ('phaserDown1', 'Нисходящий фазер'),
        ('powerUp1', 'Набор энергии'),
    ]),
    ('Переходы и движение', 'swishes-sound-pack', [
        ('swish-1', 'Свист движения 1'), ('swish-3', 'Свист движения 2'),
        ('swish-7', 'Свист движения 3'), ('swish-12', 'Свист движения 4'),
    ]),
    ('Переходы и движение', 'air-whoosh', [('whoosh2', 'Воздушный whoosh · длинный')]),
    ('Удары и материалы', 'impact-sounds', [
        ('impactSoft_medium_000', 'Мягкий удар'), ('impactGeneric_light_000', 'Лёгкий удар'),
        ('impactWood_light_000', 'Дерево · лёгкий'), ('impactWood_heavy_000', 'Дерево · тяжёлый'),
        ('impactMetal_light_000', 'Металл · лёгкий'), ('impactMetal_heavy_000', 'Металл · тяжёлый'),
        ('impactGlass_light_000', 'Стекло · лёгкий'), ('impactGlass_heavy_000', 'Стекло · тяжёлый'),
        ('impactBell_heavy_000', 'Колокол'), ('impactPlate_heavy_000', 'Пластина'),
    ]),
    ('Техника и атмосфера', 'sci-fi-sounds', [
        ('doorOpen_000', 'Механизм · открытие'), ('doorClose_000', 'Механизм · закрытие'),
        ('forceField_000', 'Силовое поле'), ('lowFrequency_explosion_000', 'Низкочастотный удар'),
        ('computerNoise_000', 'Компьютерная текстура 1'), ('computerNoise_002', 'Компьютерная текстура 2'),
        ('engineCircular_000', 'Вращающийся двигатель'), ('spaceEngineLow_000', 'Низкий двигатель'),
        ('spaceEngineLarge_000', 'Большой двигатель'), ('thrusterFire_000', 'Реактивная тяга'),
    ]),
]

def build():
    (ROOT / 'audio').mkdir(exist_ok=True)
    items = []
    for category, pack, sounds in GROUPS:
        metadata = json.loads((ROOT / 'sources' / (pack + '.json')).read_text())
        for stem, title in sounds:
            candidates = [p for p in (ROOT / 'sources' / pack).rglob('*')
                          if p.stem == stem and p.suffix in ('.wav', '.ogg') and '__MACOSX' not in str(p)]
            assert len(candidates) == 1, (stem, candidates)
            source = candidates[0]
            raw = subprocess.check_output([str(FFMPEG), '-v', 'error', '-i', str(source),
                                           '-f', 'f32le', '-ar', '48000', '-ac', '2', '-'])
            samples = array.array('f', raw)
            peak = max(abs(x) for x in samples)
            active = [x for x in samples if abs(x) > peak * 0.01]
            rms = math.sqrt(sum(x*x for x in active) / len(active))
            gain = min(10**(-22/20) / rms, 10**(-6/20) / peak, 10**(12/20))
            pcm = array.array('h', (round(max(-1, min(1, x*gain))*32767) for x in samples))
            number = f'{len(items)+1:02d}'
            filename = f'audio/{number}-{stem}.wav'
            with wave.open(str(ROOT / filename), 'wb') as output:
                output.setnchannels(2); output.setsampwidth(2); output.setframerate(48000)
                output.writeframes(pcm.tobytes())
            duration = len(samples) / 2 / 48000
            items.append(dict(id=number, title=title, category=category, file=filename,
                              duration=round(duration, 4), pack=pack, author=metadata['author'],
                              license=metadata['license'], source=metadata['source'],
                              original=str(source.relative_to(ROOT)),
                              originalSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                              sha256=hashlib.sha256((ROOT/filename).read_bytes()).hexdigest(),
                              gainDb=round(20*math.log10(gain), 3), peakDbFS=round(20*math.log10(peak*gain), 3)))
    assert len(items) == 50
    assert len({x['originalSha256'] for x in items}) == 50
    manifest = dict(id='audition-01', created='2026-10-19', status='awaiting-editor-selection',
                    preparation='48 kHz stereo PCM16; constant gain toward active-sample RMS -22 dBFS; peak ceiling -6 dBFS; max boost +12 dB; full source duration retained',
                    sounds=items)
    (ROOT/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    (ROOT/'catalog.js').write_text('window.SOUNDS = '+json.dumps(items, ensure_ascii=False)+';\n')
    print(json.dumps(dict(count=len(items), shortest=min(x['duration'] for x in items),
                         longest=max(x['duration'] for x in items), total=sum(x['duration'] for x in items)), indent=2))

if __name__ == '__main__':
    build()
