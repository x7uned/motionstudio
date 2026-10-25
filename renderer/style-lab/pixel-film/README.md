# Исходники образца «Пиксель-фильм»

Снимок кода эталонного ролика «What happens when you tap» на 2026-10-21. Это не Remotion-композиция: кадры рисует растр на Node и передаёт их в ffmpeg.

- `pixel.mjs` — растр, шрифты, дизеринг (общая версия — `renderer/pixel/raster.mjs`).
- `film/world.mjs` — пиксельная Земля (общая версия — `renderer/pixel/earth.mjs`).
- `film/iso.mjs` — изометрические помощники, пакет, ночной Лондон.
- `film/scenes.mjs` — интерьер кофейни и квартал Токио; интерьер вписан в здание в масштабе 1:2.
- `film/timeline.mjs` — события по словам дубля и наезды камеры.
- `film/render.mjs` — камера, шапка, караоке, заставка, вывод в ffmpeg.
- `film/synth.mjs` — 8-битные звуки и чиптюн.
- `film/mix.mjs` — сведение и громкость.
- `film/cover.mjs` — обложка.

Запуск — из рабочей копии с данными (голос, медиа):

```bash
cd "work/pixel-lab/tap-film" && node render.mjs --video && node synth.mjs && node mix.mjs
```

Кадры для проверки: `node render.mjs --stills 4,16.2,38.5`.
