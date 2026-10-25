// Catalog meta for the "One minute on Earth" film (2026-10-22, World If Then): a looping film that starts and ends in
// a maternity ward. Drawings: renderer/IllustratedMinute.tsx. Meta only (no React): illustrated.ts spreads these into
// ILLUSTRATED_KINDS, FOOTPRINT and KIND_GUIDE. Illustrations, not to scale. No letters inside the objects except the
// counter / money-stack label (verbatim on-screen text from the checked script); no logos (logo-tile does that).
export const MINUTE_KINDS=["maternity-ward","viewer","counter","money-stack","minute-earth","upload-phone","kiss-couple"] as const;
export type MinuteKind=typeof MINUTE_KINDS[number];
/** Footprint at scale 1 in world px (width, height), centred; the bottom edge (+h/2) is the bottom of the pedestal. */
export const MINUTE_FOOTPRINT:Record<MinuteKind,[number,number]>={
 "maternity-ward":[900,700],viewer:[520,620],counter:[620,170],"money-stack":[300,780],"minute-earth":[700,700],"upload-phone":[460,640],"kiss-couple":[760,640],
};
/** Icons the counter can show at its left (o.aim). */
export const COUNTER_ICONS=["baby","candle","eye","heart","flame","bolt","sun","globe","coin","upload","play","search","kiss","people"] as const;
export type CounterIcon=typeof COUNTER_ICONS[number];
export const MINUTE_GUIDE:Record<MinuteKind,string>={
 "maternity-ward":"ГЕРОЙ, первый и последний кадр петли: диорама ночной палаты новорождённых на парящем в космосе постаменте. Задняя стена с большим окном (ночной город, луна, звёзды), круглые часы без цифр с плавной секундной стрелкой, мягкий светящийся знак-сердце (без букв), подвесные тёплые лампы; два ряда прозрачных кроваток (4 сзади, 4 спереди) на тележках, в каждой спелёнутый малыш в розовом, лавандовом, жёлтом или мятном одеяльце и вязаной шапочке; над тремя кроватками медленно вращаются мобили; медсестра справа склоняется над кроваткой. Малыши дышат (одеяльце чуть поднимается), иногда шевелят ручкой. active 0 = спокойная ночь: лампы приглушены, малыши спят; 0.5 = рождения: каждые ~0,4 с по очереди одна кроватка вспыхивает мягкой звёздочкой, в ней появляется новый малыш (одеяльце меняет цвет под вспышкой), вверх поднимаются звёздочки, сердечки и воздушные шарики; 1 = все лампы тёплые, вся комната светится (рождения продолжаются). Смена 1,4 с. Весь фон петлевой: для петли ставь одно и то же active в первом и последнем кадре. Крупно — scale 1, zoom 1–1.3; вид на часы — zoom 2 около (250,−190). Выноски: top — часы, left — левая передняя кроватка, right — правая передняя кроватка, bottom — передний ряд",
 viewer:"«ты»: человек в худи (нейтральный, тёплая кожа, тёмные волосы) сидит в уютном кресле под торшером на парящем круглом островке с ковром и смотрит в телефон, экран подсвечивает лицо снизу лавандовым. Живёт сам: естественно моргает ~17 раз в минуту (веки плавно закрываются и открываются за 0,3 с), дышит. Состояния накопительные: active 0 = смотрит, моргает; 0.33 = моргание в фокусе: лавандовое кольцо вокруг глаза, рядом с головой с каждым морганием появляется черта счёта (группы по пять); 0.66 = сердце: в груди бьётся светящееся сердце 70 ударов в минуту, справа плавающая лента кардиограммы с теми же ударами; 1 = калории: над головой маленький скромный жёлто-оранжевый огонёк (сжигание в покое — маленький, у поцелуя огонь большой). Смена 1,4 с. Работает крупным планом: zoom до 2.6 на лицо (лицо ≈ (0,−128) от центра предмета). Выноски: top — огонёк, left — лицо, right — сердце, bottom — телефон",
 counter:"большая табличка-счётчик: тёмная скруглённая плита со светящимся ободом, слева круглый значок (o.aim — одно из baby, candle, eye, heart, flame, bolt, sun, globe, coin, upload, play, search, kiss, people), справа label — точный текст из сценария крупными цифрами («250», «$88,000», «1,800 km», «26 calories», «2.6 billion»). Цифры крутятся как одометр: каждая колонка катится вертикально и непрерывно от 0 до своей цифры, младшие разряды делают лишний оборот; знак валюты и слова-единицы проявляются. active 0 = нули, приглушённо; 1 = ровно label, вспышка обода и ровное свечение. Смена 1,6 с (2026-10-22, после ревью кадров: число должно встать на своём слове): ставь 1 на слове перед числом или на появлении — счётчик докатывается за 1,6 с. rows 2 = компактная плита поменьше. Длинная подпись (до 28 знаков) уменьшает шрифт и остаётся в плите. Ставь над или под героем сцены, scale 0.8–1.2. Выноски обычно не нужны",
 "money-stack":"стопка пачек купюр (условные лавандово-кремовые купюры с мятной банковской лентой и знаком-монетой, без букв и без настоящей валюты) на маленьком парящем постаменте; над стопкой label — сумма из сценария («$88,000», «$1.3 million»). Высота пропорциональна сумме: полная высота 620 px при scale 1 у самой большой суммы ряда, минимум одна тонкая пачка (18 px). Ряд — money-stack с тем же y (±40): рендер сравнивает их суммы (moneyStackMax), поэтому стопки, которые сравниваются, ставь с одинаковым y и scale; стопку другого масштаба (например, «всё человечество») ставь на другой y. active 0 = пустой постамент; 0→1 = пачки по одной падают сверху с небольшим отскоком, стопка непрерывно растёт, подпись проявляется; 1 = стопка готова, у основания монеты, блики. Смена 2,4 с. Ставь стопки в ряд с одинаковым y и scale (x через 260–320·scale), под каждой — logo-tile компании (y + 470·scale). Выноски: top — подпись, bottom — постамент",
 "minute-earth":"большая гранёная Земля в космосе (свет слева, медленно вращается), без постамента. rows 1 = молнии: над тропиками на ночной стороне грозовые тучи, по всей ночной стороне вспыхивают молнии (каждая вспышка нарастает за 2–3 кадра и гаснет ~0,25 с, места и моменты фиксированы); плотность ∝ active, при 1 — много вспышек в секунду. rows 2 = солнечный свет: слева летят золотые лучи и частицы и ложатся на дневную сторону; с ростом active освещённое полушарие теплеет и светится зарядом. rows 3 = полёт по орбите: Земля скользит по пунктирной дуге орбиты со шлейфом и линиями скорости (планета остаётся в центре предмета, дуга и шлейф уходят назад); скорость ∝ active, путь интегрирован — смена active без скачков. active 0 = просто Земля. Смена 1,6 с. Выноски: left — дневная сторона, right — ночная сторона, bottom — шлейф, top — верх планеты rows 4 = ОДНА планета на весь космический блок (лучше, чем менять объекты rows 1/2/3): active ≈0.33 — молнии над грозами; ≈0.6 — молнии гаснут, планета летит по орбите (дуга, шлейф, линии скорости, стрелка; путь интегрирован); 1 — орбита гаснет, солнечный свет слева заливает дневную сторону. Ставь ключи 0.33 → 0.6 → 1 по одному на слово; смена 1,6 с",
 "upload-phone":"современный смартфон на подставке на парящем постаменте, условный интерфейс без логотипов. rows 1 = фото: на экране сетка снимков и кнопка «+», из экрана вылетают квадратные карточки фото (пейзажи, лица, еда) и уходят вверх потоком; rows 2 = короткие вертикальные видео: высокие карточки с треугольником «play» и полосой прогресса; rows 3 = поиск: строка поиска с лупой, точки запроса печатаются, появляются строки результатов, вверх вылетают капсулы запросов. Поток интегрирован по скорости: active 0 = экран в покое; 0.5 = ровный поток (~3 карточки в секунду); 1 = лавина (~10 в секунду); смена active не даёт скачка. Смена 1,2 с. Ставь три телефона рядом (rows 1/2/3) или по одному на главу. Выноски: top — поток над телефоном, left/right — края экрана, bottom — подставка",
 "kiss-couple":"двое на скамейке в ночном парке на парящем травяном островке: тёплый фонарь слева, дерево справа, светлячки. Стилизованно и деликатно. active 0 = сидят рядом и смотрят друг на друга; 0.5 = плавно наклоняются и целуются (голову слегка наклоняют, глаза закрываются, над ними поднимается сердечко); 1 = калории: вокруг них большой тёплый огонь, марево жара и поднимающиеся сердца (заметно больше скромного огонька viewer). Смена 1,6 с; ставь 0.5 на слове «kiss», 1 — на «calories». Выноски: top — головы, left — фонарь и левый, right — правый, bottom — скамейка",
};
/** Slow state changes (seconds per key): every kind is listed, so the renderer always uses easeSine with these. */
export const MINUTE_KEY_SECONDS:Record<MinuteKind,number>={
 "maternity-ward":1.4,viewer:1.4,counter:1.6,"money-stack":2.4,"minute-earth":1.6,"upload-phone":1.2,"kiss-couple":1.6,
};
/** Callout anchors (object-local px at scale 1) on the part a callout talks about. */
export const MINUTE_CALLOUT_ANCHOR:Partial<Record<MinuteKind,Partial<Record<"top"|"bottom"|"left"|"right",[number,number]>>>>={
 "maternity-ward":{top:[250,-254],left:[-372,-96],right:[372,-96],bottom:[-100,236]},
 viewer:{top:[30,-262],left:[-52,-128],right:[64,-12],bottom:[0,60]},
 counter:{top:[0,-70],bottom:[0,70],left:[-282,0],right:[300,0]},
 "money-stack":{top:[0,-340],bottom:[0,356]},
 "minute-earth":{left:[-196,-40],right:[196,-30],top:[0,-238],bottom:[-150,240]},
 "upload-phone":{top:[0,-200],left:[-104,40],right:[104,40],bottom:[0,262]},
 "kiss-couple":{top:[0,-112],left:[-110,-10],right:[110,-10],bottom:[0,150]},
};
/** No minute kind draws x-ray details above the world layers. */
export const MINUTE_XRAY_OVERLAY:readonly MinuteKind[]=[];

/** Phase in [0,1) of a periodic ambient motion with the given period (s). For a looping film pass `loop` (its
 *  length in seconds): the motion then makes a whole number n=max(1,round(loop/period)) of cycles over the film, so
 *  the phase at t=loop equals the phase at t=0 and the last frame flows into the first. */
export function loopPhase(t:number,period:number,loop?:number):number{
 const v=loop&&loop>0?t/loop*Math.max(1,Math.round(loop/period)):t/period;
 return v-Math.floor(v);
}
const MAGNITUDE:Record<string,number>={thousand:1e3,k:1e3,million:1e6,mln:1e6,billion:1e9,bn:1e9,trillion:1e12,tn:1e12};
/** Number in an on-screen label: "$88,000" → 88000, "$1.3 million" → 1.3e6, "2.6 billion" → 2.6e9, "1,800 km" → 1800.
 *  Commas between digits are thousands separators. null when the label has no number. */
export function parseAmount(label:string):number|null{
 const m=/(\d[\d,]*(?:\.\d+)?)\s*([a-z]+)?/i.exec(label);
 if(!m)return null;
 const n=Number(m[1].replace(/,(?=\d)/g,"").replace(/,$/,""));
 if(!Number.isFinite(n))return null;
 const word=(m[2]??"").toLowerCase();
 return n*(MAGNITUDE[word]??1);
}
/** stackMax for a money-stack: the largest amount among the money stacks standing in the same row (y within 40 px of
 *  this one), so stacks shown side by side share one scale. undefined when the object is not a money stack. */
export function moneyStackMax(objects:readonly {id:string;kind:string;label:string;y:number}[],id:string):number|undefined{
 const self=objects.find(o=>o.id===id);if(!self||self.kind!=="money-stack")return undefined;
 const amounts=objects.filter(o=>o.kind==="money-stack"&&Math.abs(o.y-self.y)<=40).map(o=>parseAmount(o.label)).filter((v):v is number=>v!==null&&v>0);
 return amounts.length?Math.max(...amounts):undefined;
}
