# Визуальные библиотеки студии

Источник подборки: «Анимация с Claude: что дать ему в руки» (gtvardovsky.ru/files/claude-motion). Все шесть установлены в `node_modules` (версии зафиксированы в package.json) и используются **только внутри подготовленных рендереров Remotion** (`renderer/…`), которые управляются проверенным JSON. Сгенерированный код не исполняется; новый приём = новый подготовленный компонент + схема.

Общее правило для Remotion: кадры рендерятся параллельно и в любом порядке, поэтому всё вычисляется из `useCurrentFrame()`: фиксированные seed, никаких `Math.random`/`Date`/собственных таймеров и тикеров; асинхронная отрисовка canvas — через `delayRender/continueRender`. Рендер WebGL — `chromiumOptions:{gl:"angle"}`.

| Библиотека | Зачем | Как детерминировать | Пример в студии |
|---|---|---|---|
| **Rough.js** (`roughjs`) · github.com/rough-stuff/rough · roughjs.com | Рисованный от руки вид: наброски, штриховка, схемы «на салфетке» | `rough.generator()` → `toPaths()` в SVG, `seed` на каждую фигуру; «дрожание» линий — смена seed раз в 3–4 кадра | `renderer/style-lab/sketch` |
| **p5.brush** (`p5.brush` + `p5`) · github.com/acamposuribe/p5.brush · Brush Maker | Карандаш, уголь, маркер, акварельные заливки, штриховка | p5 в instance-режиме, WEBGL, `brush.seed()`; рисовать кадр целиком или кэшировать слои заранее | `renderer/style-lab/watercolor` |
| **Anime.js** (`animejs` v4) · github.com/juliangarnier/anime | Согласованная хореография текста, фигур и SVG: кто и когда движется | только как движок таймлайна/easing: пауза + `seek(frame/fps*1000)` | `renderer/style-lab/illustrated` |
| **Matter.js** (`matter-js`) · github.com/liabru/matter-js · brm.io/matter-js/demo | Физика: гравитация, столкновения, отскоки, пружины («карточки падают и складываются») | предрасчёт всей симуляции один раз (фиксированный шаг, свои seed) и запись позиций на все кадры | `renderer/style-lab/toy-physics` |
| **PixiJS + pixi-filters** (`pixi.js` v8, `pixi-filters` v6) · github.com/pixijs/pixijs · pixijs.io/filters/examples | Эффекты поверх текста и картинок: glitch, glow, bloom, CRT, ASCII, линза, штриховка | Renderer без тикера; на каждый кадр выставлять все свойства и `seed/time` фильтров из номера кадра, затем `render()` | `renderer/style-lab/neon` |
| **thinking-orbs** (`thinking-orbs`) · github.com/RareFormLabs/thinking-orbs | Точечные «орбы» мышления ИИ: поиск, решение, слушание, письмо — для пауз «система думает» | вести состояние от кадра; если движок живёт на своих часах — воспроизвести вид своими точками | `renderer/style-lab/illustrated` |

Вдохновение и приёмы (появление текста, переходы, темп): галерея 400+ роликов, сделанных с Claude, — skillry.dev/ai-videos/opus-5-5 и github.com/yihui-dev/awesome-opus5-5-videos. Это референсы-данные: смотреть приёмы, не копировать чужие ролики.

Как изучать новую библиотеку (рекомендация подборки): дать агенту ссылку на репозиторий, попросить прочитать код и демо, объяснить простыми словами и предложить 5 идей для вертикального ролика на конкретную тему: что видит зритель и на какой секунде.
