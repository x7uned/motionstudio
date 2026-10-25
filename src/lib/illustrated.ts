import {z} from "zod";
import {anchor3dSchema,anchorTime,type Anchor3D} from "./scene3d";
import {QR_KINDS,QR_FOOTPRINT,QR_GUIDE} from "./illustrated-catalog-qr";
import {NET_KINDS,NET_FOOTPRINT,NET_GUIDE} from "./illustrated-catalog-net";
import {TUNNEL_KINDS,TUNNEL_FOOTPRINT,TUNNEL_GUIDE} from "./illustrated-catalog-tunnel";
import {FACEID_KINDS,FACEID_FOOTPRINT,FACEID_GUIDE} from "./illustrated-catalog-faceid";
import {PW_KINDS,PW_FOOTPRINT,PW_GUIDE} from "./illustrated-catalog-passwords";
import {SHAZAM_KINDS,SHAZAM_FOOTPRINT,SHAZAM_GUIDE} from "./illustrated-catalog-shazam";
import {MEDIA_TILE_KINDS,MEDIA_FOOTPRINT,MEDIA_GUIDE} from "./illustrated-catalog-media";
import {MINUTE_KINDS,MINUTE_FOOTPRINT,MINUTE_GUIDE,COUNTER_ICONS,parseAmount} from "./illustrated-catalog-minute";
import {findMedia,type MediaAsset} from "./media-contract";
import {sentences,anchoredTimes,coverageReport,coverageError} from "./coverage";

// illustrated/v1: one persistent 2D world of prepared low-poly objects. The director (Claude) only places
// catalog objects, keys their state, flows, callouts and the camera against measured words; the renderer owns
// every shape. No generated code, no remote assets.
export const ILLUSTRATED_KINDS=["lava-lamp","lamp-wall","camera","monitor","server","pixel-grid","hash-press","mixer","seed","generator","number-stream","key","browser","padlock","plaque","cloud-sign","person","cosmic-ray","memory-chip","voting-booth","ballot-box","tally-board","cat","chrono-strip","inner-ear","spin-stool","ship","globe","clock-face","pendulum-clock","sea-clock","pocket-watch","leaning-tower","sun","earth","moon","orbit","light-front","planet-row","night-sky","thermometer","leaf","spin-earth","wind-surface","day-year",
 ...QR_KINDS,...NET_KINDS,...TUNNEL_KINDS,...MEDIA_TILE_KINDS,...FACEID_KINDS,...PW_KINDS,...SHAZAM_KINDS,...MINUTE_KINDS] as const;
export type IllustratedKind=typeof ILLUSTRATED_KINDS[number];
/** Footprint at scale 1 in world px (width, height), centred on x/y. Shared by validator, renderer and director brief. */
export const FOOTPRINT:Record<IllustratedKind,[number,number]>={
 "lava-lamp":[150,440],"lamp-wall":[720,990],camera:[280,420],monitor:[420,340],server:[300,380],"pixel-grid":[400,400],
 "hash-press":[360,440],mixer:[380,340],seed:[120,120],generator:[380,420],"number-stream":[620,110],key:[230,100],
 browser:[520,360],padlock:[200,250],plaque:[540,120],"cloud-sign":[540,210],person:[140,380],
 "cosmic-ray":[360,820],"memory-chip":[560,380],"voting-booth":[400,470],"ballot-box":[320,400],"tally-board":[540,460],
 "cat":[560,440],"chrono-strip":[760,210],"inner-ear":[400,340],"spin-stool":[440,460],
 "ship":[520,470],"globe":[360,460],"clock-face":[300,370],"pendulum-clock":[220,530],"sea-clock":[440,400],"pocket-watch":[300,360],"leaning-tower":[560,1100],
 "sun":[560,560],"earth":[470,470],"moon":[220,220],"orbit":[1400,760],"light-front":[600,600],"planet-row":[960,160],"night-sky":[840,520],"thermometer":[170,560],"leaf":[460,460],
 "spin-earth":[540,540],"wind-surface":[840,560],"day-year":[860,420],
 ...QR_FOOTPRINT,...NET_FOOTPRINT,...TUNNEL_FOOTPRINT,...MEDIA_FOOTPRINT,...FACEID_FOOTPRINT,...PW_FOOTPRINT,...SHAZAM_FOOTPRINT,...MINUTE_FOOTPRINT,
};
export const KIND_GUIDE:Record<IllustratedKind,string>={
 "lava-lamp":"одна крупная лавовая лампа; воск всегда медленно течёт, active усиливает свечение и скорость течения",
 "lamp-wall":"стена из rows×cols лавовых ламп на полках; active = свет и течение во всех лампах",
 camera:"камера на штативе, смотрит на aim; active = запись: красная точка и световой конус к aim, вспышка при включении; в режиме xray виден шумящий сенсор",
 monitor:"компьютерный монитор; active 0 = серая повторяющаяся предсказуемая последовательность, 1 = цветной хаос чисел",
 server:"серверная стойка; active = фиолетовые индикаторы собственной случайности сервера",
 "pixel-grid":"кадр с камеры; active 0 = картинка ламп, 1 = та же картинка рассыпалась на сетку чисел пикселей",
 "hash-press":"пресс-хэш; active опускает пресс, на выходе появляется короткая полоска байтов",
 mixer:"смеситель-воронка; active = вращающийся вихрь и свечение",
 seed:"жёлтое зерно; active 0 = тусклое пунктирное «нужно/прошлое» зерно, 1 = яркое новое зерно",
 generator:"генератор с шестернями; active = шестерни крутятся, выходное окно светится",
 "number-stream":"лента бегущих чисел слева направо; active = скорость и длина потока",
 key:"ключ цвета слоновой кости; active = блеск и веер из трёх ключей",
 browser:"окно браузера с замком в адресной строке; active ≥ 0.5 = замок закрыт, строка зелёная",
 padlock:"крупный замок; active ≥ 0.5 = дужка закрыта и замок зеленеет",
 plaque:"табличка с текстом label",
 "cloud-sign":"вывеска: обобщённое облако и название label (не официальный логотип)",
 person:"силуэт посетителя; перемещается ключами moves",
 "cosmic-ray":"космическая частица: вверху далёкая звезда, ниже дуга атмосферы; active 0 = только звезда и атмосфера, 0→0.4 первичная частица летит до атмосферы, 0.4→0.85 рождается ливень вторичных частиц, 1 = розовая частица бьёт в нижний край предмета. Ставь предмет прямо над целью с тем же x и тем же scale: нижний край луча = y+410·scale; над memory-chip — y луча = y чипа − 610·scale",
 "memory-chip":"микросхема памяти (верхний край y−200·scale — сюда бьёт частица) и под ней увеличенная строка из 16 битов 0/1; active 0 = биты в норме, 0.5 = один бит (13-й справа, разряд 2¹²) перевернулся 0→1 и горит розовым, 1 = появились зелёные контрольные биты коррекции ошибок и вернули бит в 0. В режиме xray под ячейками видны веса 1·2·4·8 … 4096, а 13-я ячейка обведена жёлтым. Выноски о битах и весах ставь side='bottom': нижний край — у строки битов",
 "voting-booth":"кабина электронного голосования: экран со списком, световое перо и щель для магнитной карты; active 0 = экран тусклый, 0.5 = перо выбирает строку, 1 = из щели выходит записанная магнитная карта (до active 1 карты не видно — выноска о карте должна идти не раньше)",
 "ballot-box":"электронная урна для магнитных карт со считывателем; active 0 = пустая, 1 = карты падают внутрь, зелёная линия считывателя сканирует; повторный подъём active после спада = повторное считывание",
 "tally-board":"табло итогов: левый столбец — целое, голоса за список (значок списка); правый — часть, голоса кандидата (значок человека); label — заголовок табло или ''; active 0 = правый ниже левого (норма), 1 = правый вырос выше левого — невозможно, горит розовая линия предела. Спад active виден зрителю: сбрасывай табло только когда оно вне кадра",
 cat:"low-poly рыжая кошка в профиле мордой вправо, собрана из настоящих 3D-граней; active — ход рефлекса выпрямления: 0 = спиной вниз, лапы вверх (падает перевёрнутой); 0.03 = падает перевёрнутой (линии воздуха); 0.07 = согнулась в поясе; 0.13 = поджала передние лапы; 0.45 = передняя половина (голова первой) повернулась лапами вниз, задняя ещё перевёрнута и чуть повернулась в обратную сторону, задние лапы вытянуты; 0.55 = передние лапы вытянулись, задние поджаты; 0.85 = задняя половина довернулась; 1 = все четыре лапы вниз, спина чуть выгнута, тень на полу — готова приземлиться. Пока 0<active<1, вокруг бегут линии воздуха (падение). Переход к новому значению идёт 1,4 с (замедленная съёмка); ступени 0→0.45→1 на двух словах показывают сначала переднюю, потом заднюю половину. xray: позвоночник, кости лап и две оси вращения — передняя (лаванда) и задняя (жёлтая); ярче та половина, что сейчас поворачивается. scale 0.5 — котёнок. Спад active зритель увидит как обратный переворот: сбрасывай только вне кадра",
 "chrono-strip":"плёнка хронофотографии: шесть кадров одного падения кошки — от спины вниз до лап вниз; active 0 = пустые кадры, кадры проявляются слева направо за 1,6 с, 1 = все шесть. Условная реконструкция, а не копия исторических снимков",
 "inner-ear":"внутреннее ухо: три полукружных канала с жидкостью, преддверие с волосковыми клетками и улитка; active = жидкость течёт по каналам (жёлтые штрихи), волоски гнутся, по нерву вправо бежит импульс",
 ship:"парусный корабль на подставке-волне (диорама), нос вправо; active 0 = спокойный ход, 0.5 = сильная качка в шторм (дождь, крен), 1 = налетел на скалы у носа: крен, осадка, розовые волны удара. Спад active зритель увидит — не откатывай в кадре",
 globe:"глобус на подставке; active 0 = просто глобус, 0.5 = светятся линии долготы (меридианы через 15°), 1 = жёлтый клин 15° между домашним меридианом (белая точка) и меридианом корабля (розовый треугольник). Выноски о долготе ставь side='top'",
 "clock-face":"часы с циферблатом и латунным ободом; active 0 = 12:00, 1 = 1:00 (минутная стрелка делает полный круг, часовая сдвигается на час), секундная тикает всегда; label — подпись под часами из текста или ''. Две такие часы рядом показывают разницу времени",
 "pendulum-clock":"напольные маятниковые часы; active 0 = маятник качается ровно; 1 = корпус раскачивается как на палубе, маятник сбивается, стрелки уходят, розовое свечение — часы врут на качке",
 "sea-clock":"морские часы в духе Харрисона: латунная рама, две гантели-балансира сверху качаются навстречу друг другу, связаны пружинами, внутри колёса; active = ход; xray подсвечивает пружины и колёса",
 "pocket-watch":"большие карманные морские часы (хронометр) на подставке; active = ход и тёплое свечение; xray открывает балансовое колесо со спиралью и колёса механизма",
 "leaning-tower":"Пизанская башня на срезе грунта (диорама: внизу блок с тремя слоями, мягкая глина справа подсвечивается розовым, когда башня оседает). Наклон вправо (на юг). active — ход истории: 0 = только фундамент; 0.3 = построены три этажа, наклон начался; 0.5 = семь этажей, верхние этажи загнуты обратно (поправка строителей); 0.62 = колокольня достроена; 0.66 = наклон максимальный; 0.74 = тросы стабилизации, обхватившие третий ярус и уходящие на север (влево); 0.84 = под северной стороной бурят и вынимают грунт (жёлтые керны идут наружу); 0.96–1 = башня выпрямилась частично, работы убраны. xray: слои грунта и жёлтый отвес с верха башни, смещение у основания. Углы условные. Высокий предмет: при выноске держи камеру так, чтобы центр (середина башни) был в кадре",
 "spin-stool":"человек на вращающемся стуле с двумя гантелями; active 0 = руки широко, медленное вращение; 1 = руки прижаты к груди, вращение быстрое; скорость меняется плавно, поза не прыгает — иллюстрация сохранения вращения",
 sun:"Солнце: гранёный диск с мерцающей грануляцией, вращающейся короной и двумя протуберанцами, тёплое свечение; active 0 = светит; 0.5 = сжалось в яркую точку; 1 = исчезло, на его месте пунктирное кольцо-призрак и крестик «здесь было Солнце». Обратно к 0 = Солнце вспыхивает и возвращается (зритель видит возврат — используй его только для возвращения). Свет в сцене идёт слева: ставь Солнце левее Земли и планет",
 earth:"планета Земля из гранёных треугольников: океаны, материки (условная карта), облака, атмосфера, свет слева; active 0 = обычные день и ночь (дневная половина слева, на ночной огни городов); 0.5 = солнечный свет пропал — вся планета в ночи, огни городов по всей суше; 1 = иней ползёт по суше от полюсов, океаны остаются тёмно-синими. В режиме xray — тепловая карта: океаны жёлтые (держат тепло), суша синеет по мере остывания",
 moon:"Луна: гранёный серый шар с кратерами, свет слева; active 0 = светит отражённым светом; 1 = погасла, виден только тусклый пунктирный контур",
 orbit:"схема орбиты Земли (не в масштабе): центр предмета — Солнце, ставь его в те же x/y, что и sun; пунктирный эллипс 1200×600·scale, маленькая Земля со стрелкой скорости и лавандовой линией притяжения к центру; active 0→0.3 = Земля идёт по орбите; 0.27→0.3 = Земля темнеет (последний свет прошёл); 0.3→0.4 = гаснет линия притяжения; 0.3→0.75 = Земля летит прямо по касательной (розовый путь с отметками, пунктир прямой вперёд и призрак Земли на старой орбите); 0.75→0.85 = свет и притяжение вернулись, появляется новая чуть большая жёлтая орбита через Землю; 0.85→1 = Земля идёт по новой орбите. Не откатывай назад в кадре. Чтобы Земля двигалась непрерывно, ставь ключи не реже чем раз в 2 с. Выноска side=top указывает вперёд на прямую по касательной, side=bottom — на линию притяжения",
 "light-front":"фронт света: кольцо, расходящееся от центра предмета (ставь в x/y Солнца и раньше Земли и орбиты в списке objects — кольцо рисуется под ними); active 0..1 = радиус от Солнца до орбиты Земли (≈ 0.73) и дальше (1 ≈ 820·scale); rows 1 = последний свет уходит, внутри кольца темнота и лавандовая рябь гравитации; rows 2 = свет возвращается, внутри кольца тёплое свечение",
 "planet-row":"восемь планет в ряд слева направо от Меркурия до Нептуна (размеры условные, свет слева); active 0 = все освещены; 1 = темнота прошла волной наружу — планеты гаснут по очереди, от ближней к дальней",
 "night-sky":"город на круглом постаменте под стеклянным куполом неба; active 0 = голубое дневное небо с Солнцем; 1 = полдень, но небо чёрное: звёзды и Млечный Путь, Луны нет, горят все окна и фонари",
 thermometer:"стеклянный термометр на подставке; active 0 = тепло, столбик высоко; 1 = холодно, столбик низко и синий, на стекле иней",
 "spin-earth":"Земля, которая перестаёт вращаться (ось, экватор, свет слева); active 0 = крутится на восток, по экватору бегут жёлтые шевроны скорости; 0→0.4 = вращение плавно замедляется до полной остановки (угол интегрируется, без скачков); 0.4→0.58 = дневная сторона раскаляется оранжевым, ночная леденеет, через границу дня и ночи дуют белые стрелки ветра (с дневной стороны на ночную); 0.6→0.67 = оттенки уходят, видна обычная карта и подсвечен водяной горб у экватора (бледная пунктирная оболочка, сильно преувеличена); 0.68→1 = океаны уходят к полюсам: у экватора поднимается новый материк, высокие широты заливает водой, горб переходит к полюсам, шар выравнивается, видны оба полярных океана. Выноска side=right указывает на горб у экватора. Не откатывай назад в кадре",
 "wind-surface":"городок на постаменте (дома, деревья, флаг, машина); active 0 = тихо; 0→0.5 = резкая остановка: всё незакреплённое продолжает лететь на восток (вправо) — полосы ветра, деревья гнутся, машина и черепица улетают за край, флаг рвётся; 0.5→1 = слева накатывает огромная волна. Не откатывай назад в кадре",
 "day-year":"год вокруг Солнца для невращающейся Земли (схема, не в масштабе): Солнце в центре, пунктирная орбита, маленькая Земля с жёлтой меткой-городом, которая всегда смотрит в одну сторону; active 0..1 = доля года: 0→0.5 = полгода метка на дневной стороне (след на орбите жёлтый), 0.5→1 = полгода на ночной (след синий)",
 leaf:"крупный зелёный лист под лучами; active 0 = фотосинтез: свет падает на лист, жилки светятся, жёлтые капли сахара текут к черешку; 1 = света нет: лист потемнел, поток остановился",
 ...QR_GUIDE,...NET_GUIDE,...TUNNEL_GUIDE,...MEDIA_GUIDE,...FACEID_GUIDE,...PW_GUIDE,...SHAZAM_GUIDE,...MINUTE_GUIDE,
};
const id=z.string().regex(/^[a-z][a-z0-9-]{0,23}$/);
const short=z.string().min(1).max(26);
const coord={x:z.number().min(0).max(4000),y:z.number().min(0).max(2400)};
// Upper limits leave room for explicit long films (up to 180 s); short plans are unaffected.
export const illustratedSchema=z.object({
 version:z.literal(1),
 concept:z.string().min(5).max(400),
 floorY:z.number().min(200).max(2400),
 /** Optional world backdrop (2026-10-20): "space" replaces the wall and floor with a parallax star field; absent = room. */
 backdrop:z.enum(["room","space"]).optional(),
 objects:z.array(z.object({
  id,kind:z.enum(ILLUSTRATED_KINDS),...coord,scale:z.number().min(.3).max(3),
  label:z.string().max(28),aim:z.string().max(24),rows:z.number().int().min(1).max(4),cols:z.number().int().min(2).max(8),
  enter:anchor3dSchema,exit:anchor3dSchema.nullable(),
  active:z.array(z.object({at:anchor3dSchema,value:z.number().min(0).max(1)})).max(12),
  moves:z.array(z.object({at:anchor3dSchema,...coord,scale:z.number().min(.3).max(3)})).max(8),
 })).min(3).max(32),
 flows:z.array(z.object({from:id,to:id,tone:z.enum(["info","ok","warn","number"]),style:z.enum(["solid","dotted"]),enter:anchor3dSchema,exit:anchor3dSchema.nullable()})).max(20),
 callouts:z.array(z.object({target:id,text:short,tone:z.enum(["info","ok","warn","number"]),side:z.enum(["top","bottom","left","right"]),enter:anchor3dSchema,exit:anchor3dSchema.nullable()})).max(40),
 camera:z.array(z.object({at:anchor3dSchema,...coord,zoom:z.number().min(.5).max(2.6)})).min(1).max(64),
 mode:z.array(z.object({at:anchor3dSchema,value:z.enum(["lit","xray"])})).max(16),
 bigWords:z.array(z.object({text:z.string().min(1).max(14),enter:anchor3dSchema,exit:anchor3dSchema})).max(4),
 notes:z.array(z.string().max(300)).max(8),
});
export type IllustratedPlan=z.infer<typeof illustratedSchema>;
export type IllustratedObject=IllustratedPlan["objects"][number];
type Clock={seconds:number;narration?:string;title?:string;subtitle?:string;items?:string[]}[];
type Alignment={words?:{text:string;start:number;end:number}[]}[];
export const VIEW={width:1080,height:900};
/** Instagram keeps buttons on the right: attention must stay inside x 78..938 of the 1080 frame. */
export const SAFE={left:78,right:938};
const FOCUS={left:SAFE.left+60,right:SAFE.right-60,top:70,bottom:VIEW.height-70};
export const typingSeconds=(text:string)=>.15+.035*text.length;
const word=(s:string)=>s.toLowerCase().replace(/ё/g,"е").replace(/[^\p{L}\p{N}]/gu,"");
const stem=(s:string)=>word(s).slice(0,5);
// Decorative glyphs and neutral UI words that carry no factual claim.
const NEUTRAL=new Set(["ок","да","нет","вход","выход","байты","числа","кадр","шум","хаос","случайно","предсказуемо"].map(stem));

/** The script and the screen are cut the same way. A comma between digits is a thousands separator (English «4,096»),
 *  not a word break. A hyphen joins a compound («Сан-Франциско», «Wi-Fi», «e-mail»): it counts whole and by its parts. */
const compounds=(text:string)=>text.split(/[\s·•:→+=/|]+|,(?!\d)/).map(whole=>({whole,parts:whole.split(/[-‐‑]+/)}));
export function corpus(plan:{title:string;summary?:string;scenes:Clock}){
 const text=[plan.title,plan.summary??"",...plan.scenes.flatMap(s=>[s.narration??"",s.title??"",s.subtitle??"",...(s.items??[])])].join(" ");
 // Whitespace words stay whole as well («TCP/IP» → «tcpip»), so the vocabulary only grows.
 return new Set([...text.split(/\s+/),...compounds(text).flatMap(c=>[c.whole,...c.parts])].map(stem).filter(Boolean));
}
/** On-screen words must come from the checked script; numbers must appear in it verbatim. `skip` holds whole
 *  interface words that carry no claim (the isometric map pins). */
export function grounded(text:string,vocabulary:Set<string>,skip:ReadonlySet<string>=new Set()){
 const known=(w:string)=>skip.has(w)||vocabulary.has(stem(w))||NEUTRAL.has(stem(w));
 const ok=(raw:string)=>{
  const w=word(raw);if(!w||skip.has(w)||/^[^\p{L}\p{N}]*$/u.test(raw)||w.length<3&&!/\d/.test(w))return true;
  return /^\d+$/.test(w)?vocabulary.has(stem(w)):known(w);
 };
 for(const {whole,parts} of compounds(text)){
  // A compound with a number is checked only by parts, so «COVID-20» never passes on the prefix of «COVID-19».
  const w=word(whole);if(parts.length>1&&!/\d/.test(w)&&known(w))continue;
  if(!parts.every(ok))return false;
 }
 return true;
}
export const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};
export const easeOut=(v:number)=>{const t=Math.max(0,Math.min(1,v));return 1-Math.pow(1-t,3);};
/** Piecewise state: each key eases from the previous value over `dur` seconds, starting on its word. */
export function keyed(t:number,keys:{at:number;value:number}[],initial=0,dur=.45,curve:(v:number)=>number=ease){
 let v=initial;for(const k of keys){if(t<k.at)break;const prev=v;v=prev+(k.value-prev)*curve((t-k.at)/dur);}return v;
}
/** Gentler in-out (peak slope π/2 instead of 3): for states whose own motion already eases, such as the cat's turn. */
export const easeSine=(v:number)=>{const t=Math.max(0,Math.min(1,v));return .5-.5*Math.cos(Math.PI*t);};
export type Pose={x:number;y:number;zoom:number};
export function cameraAt(t:number,keys:{at:number;pose:Pose}[]){
 if(!keys.length)return {x:2000,y:1200,zoom:1};
 let pose=keys[0].pose;
 for(let i=1;i<keys.length;i++){const k=keys[i];if(t<k.at)break;
  // Longer travel takes longer, so a far pan never smears across frames; it still lands before the next key.
  const travel=Math.hypot(k.pose.x-pose.x,k.pose.y-pose.y)/900+Math.abs(k.pose.zoom-pose.zoom)*.8;
  const dur=Math.max(.6,Math.min(.8+travel,2.2,(keys[i+1]?.at??Infinity)-k.at-.1)),m=ease((t-k.at)/dur);pose={x:pose.x+(k.pose.x-pose.x)*m,y:pose.y+(k.pose.y-pose.y)*m,zoom:pose.zoom+(k.pose.zoom-pose.zoom)*m};}
 return pose;
}
export function placeAt(t:number,o:{x:number;y:number;scale:number},moves:{at:number;x:number;y:number;scale:number}[]){
 let p={x:o.x,y:o.y,scale:o.scale};
 for(const m of moves){if(t<m.at)break;const k=ease((t-m.at)/.9);p={x:p.x+(m.x-p.x)*k,y:p.y+(m.y-p.y)*k,scale:p.scale+(m.scale-p.scale)*k};}
 return p;
}
export function footprint(o:Pick<IllustratedObject,"kind"|"rows"|"cols">,scale:number):[number,number]{
 if(o.kind==="lamp-wall")return [Math.max(2,o.cols)*120*scale,Math.max(1,o.rows)*330*scale];
 const [w,h]=FOOTPRINT[o.kind];return [w*scale,h*scale];
}
export function toScreen(p:{x:number;y:number},cam:Pose){return {x:VIEW.width/2+(p.x-cam.x)*cam.zoom,y:VIEW.height/2+(p.y-cam.y)*cam.zoom};}
export function timeline(plan:IllustratedPlan,scenes:Clock,alignment:Alignment=[]){
 const at=(a:Anchor3D)=>anchorTime(a,scenes,alignment);
 return {
  objects:plan.objects.map(o=>({...o,enterAt:at(o.enter),exitAt:o.exit?at(o.exit):Infinity,activeKeys:o.active.map(k=>({at:at(k.at),value:k.value})).sort((a,b)=>a.at-b.at),moveKeys:o.moves.map(m=>({...m,at:at(m.at)})).sort((a,b)=>a.at-b.at)})),
  flows:plan.flows.map(f=>({...f,enterAt:at(f.enter),exitAt:f.exit?at(f.exit):Infinity})),
  callouts:resolveCallouts(plan.callouts.map(c=>({...c,enterAt:at(c.enter),exitAt:c.exit?at(c.exit):Infinity}))),
  camera:plan.camera.map(c=>({at:at(c.at),pose:{x:c.x,y:c.y,zoom:c.zoom}})).sort((a,b)=>a.at-b.at),
  mode:plan.mode.map(m=>({at:at(m.at),value:m.value==="xray"?1:0})).sort((a,b)=>a.at-b.at),
  bigWords:plan.bigWords.map(b=>({...b,enterAt:at(b.enter),exitAt:at(b.exit)})),
 };
}
export type IllustratedTimeline=ReturnType<typeof timeline>;
const FADE=.3;
/** Deterministic callout traffic: one at a time per object, at most two on screen, typing fits the window.
 *  Only a conflicting callout is shifted, by the fade length; every other one keeps its word timing. */
export function resolveCallouts<T extends {target:string;text:string;enterAt:number;exitAt:number}>(list:T[]){
 const r=list.map(c=>({...c,from:c.enterAt,to:c.exitAt})),order=r.map((_,i)=>i).sort((a,b)=>r[a].from-r[b].from);
 const close=(p:typeof r[number],c:typeof r[number])=>{p.to=Math.max(p.from+.6,c.from-FADE);if(p.to+FADE>c.from)c.from=p.to+FADE;};
 for(let k=0;k<order.length;k++){
  const c=r[order[k]],before=order.slice(0,k).map(j=>r[j]);
  for(const p of before)if(p.target===c.target&&p.to+FADE>c.from)close(p,c);
  const open=before.filter(p=>p.to+FADE>c.from).sort((a,b)=>a.from-b.from);
  while(open.length>=2)close(open.shift()!,c);
  if(c.to<c.from+.6)c.to=c.from+.6;
 }
 return r.map(c=>({...c,typing:Math.min(typingSeconds(c.text),Math.max(.25,(Math.min(c.to,c.from+10)-c.from)*.45))}));
}
/** Moment a viewer reads something shown from..to: settled after it appears, never past the middle of its window. */
export const focusTime=(from:number,to:number,lead:number)=>Math.min(from+lead,(from+Math.min(to,from+20))/2);
/** Pose the camera settles into for time t: the latest key at or before t. */
export function poseAt(t:number,keys:{at:number;pose:Pose}[]){let pose=keys[0]?.pose??{x:2000,y:1200,zoom:1};for(const k of keys){if(k.at>t)break;pose=k.pose;}return pose;}
const centre=(z:number,lo:number,hi:number,mid:number)=>({min:(mid-lo)/z,max:(hi-mid)/z});
/** Minimal deterministic framing: move (and if needed widen) each camera key so the objects that appear or are
 *  called out during its interval sit inside the safe focus area. Returns how many keys changed. */
export function solveCamera(p:IllustratedPlan,scenes:Clock,alignment:Alignment=[]){
 const tl=timeline(p,scenes,alignment),total=scenes.reduce((n,s)=>n+s.seconds,0);
 const keys=p.camera.map((c,i)=>({i,at:anchorTime(c.at,scenes,alignment)})).sort((a,b)=>a.at-b.at);
 const groups=new Map<number,{x:number;y:number}[]>();
 const add=(t:number,pt:{x:number;y:number})=>{if(t>total)return;let k=keys[0];for(const key of keys){if(key.at>t)break;k=key;}groups.set(k.i,[...(groups.get(k.i)??[]),pt]);};
 for(const o of tl.objects){if(o.kind==="seed"||o.kind==="number-stream")continue;const t=focusTime(o.enterAt,o.exitAt,1.3);add(t,placeAt(t,o,o.moveKeys));}
 for(const c of tl.callouts){const o=tl.objects.find(x=>x.id===c.target);if(!o)continue;const t=focusTime(c.from,c.to,1.2);add(t,placeAt(t,o,o.moveKeys));}
 let changed=0;const M=20,X=centre(1,FOCUS.left+M,FOCUS.right-M,VIEW.width/2),Y=centre(1,FOCUS.top+M,FOCUS.bottom-M,VIEW.height/2);
 for(const [i,pts] of groups){
  const cam=p.camera[i],xs=pts.map(q=>q.x),ys=pts.map(q=>q.y),spanX=Math.max(...xs)-Math.min(...xs),spanY=Math.max(...ys)-Math.min(...ys);
  const zoom=Math.max(.5,Math.min(cam.zoom,spanX?(X.min+X.max)/spanX:9,spanY?(Y.min+Y.max)/spanY:9));
  const fit=(v:number,lo:number,hi:number)=>lo>hi?(lo+hi)/2:Math.max(lo,Math.min(hi,v));
  const x=fit(cam.x,Math.max(...xs)-X.max/zoom,Math.min(...xs)+X.min/zoom),y=fit(cam.y,Math.max(...ys)-Y.max/zoom,Math.min(...ys)+Y.min/zoom);
  const next={x:Math.round(Math.max(0,Math.min(4000,x))),y:Math.round(Math.max(0,Math.min(2400,y))),zoom:Math.round(zoom*100)/100};
  if(Math.abs(next.x-cam.x)>1||Math.abs(next.y-cam.y)>1||Math.abs(next.zoom-cam.zoom)>.005){Object.assign(cam,next);changed++;}
 }
 return changed;
}

/** opts.coverage=1 — the experimental coverage mode (opt-in per project): every sentence shown, no long still stretches. */
export function validateIllustrated(raw:unknown,plan:{title:string;summary?:string;scenes:Clock;media?:readonly MediaAsset[];creatorOutro?:{sceneId:string}|null;loopEnding?:{version:1}|null},alignment:Alignment=[],opts:{coverage?:number}={}):IllustratedPlan{
 const prepared=raw&&typeof raw==="object"&&Array.isArray((raw as any).camera)?{...(raw as any),camera:(raw as any).camera.map((c:any)=>({...c,zoom:typeof c?.zoom==="number"?Math.max(.5,c.zoom):c?.zoom}))}:raw;
 const result=illustratedSchema.parse(prepared),scenes=plan.scenes,total=scenes.reduce((n,s)=>n+s.seconds,0),vocabulary=corpus(plan);
 const check=(a:Anchor3D,what:string)=>{
  if(!scenes[a.scene-1])throw new Error(`Иллюстрация: ${what} ссылается на несуществующую главу ${a.scene}.`);
  if(a.cue&&!(scenes[a.scene-1].narration||"").split(/\s+/).some(s=>word(s)===word(a.cue)))throw new Error(`Иллюстрация: слова «${a.cue}» нет в главе ${a.scene} (${what}).`);
  const t=anchorTime(a,scenes,alignment);if(t<0||t>total+.01)throw new Error(`Иллюстрация: ${what} за пределами ролика.`);return t;
 };
 const ids=new Set<string>();
 for(const o of result.objects){if(ids.has(o.id))throw new Error(`Иллюстрация: id ${o.id} повторяется.`);ids.add(o.id);}
 for(const o of result.objects){if(o.kind==="camera"&&o.aim&&!ids.has(o.aim))throw new Error(`Иллюстрация: камера ${o.id} смотрит на неизвестный ${o.aim}.`);}
 for(const c of result.callouts)if(!ids.has(c.target))throw new Error(`Иллюстрация: выноска «${c.text}» ссылается на неизвестный ${c.target}.`);
 const framed=solveCamera(result,scenes,alignment);
 if(framed&&!result.notes.some(n=>n.startsWith("Кадрирование")))result.notes=[...result.notes.slice(0,7),`Кадрирование ${framed} ключей камеры автоматически подогнано под безопасную зону кадра.`];
 const tl=timeline(result,scenes,alignment);
 for(const o of result.objects){
  const enter=check(o.enter,`${o.id}.enter`),exit=o.exit?check(o.exit,`${o.id}.exit`):Infinity;
  if(exit-enter<.6)throw new Error(`Иллюстрация: ${o.id} должен быть виден не меньше 0,6 с.`);
  o.active.forEach((k,i)=>check(k.at,`${o.id}.active[${i}]`));o.moves.forEach((k,i)=>check(k.at,`${o.id}.moves[${i}]`));
  if(o.kind==="camera"&&o.aim&&!ids.has(o.aim))throw new Error(`Иллюстрация: камера ${o.id} смотрит на неизвестный ${o.aim}.`);
  if(["plaque","cloud-sign","logo-tile","person-tile","counter","money-stack"].includes(o.kind)&&!o.label)throw new Error(`Иллюстрация: ${o.id} требует label.`);
  // «One minute on Earth» catalog (2026-10-22): counters and money stacks show a number from the checked script.
  if((o.kind==="counter"||o.kind==="money-stack")&&parseAmount(o.label)===null)throw new Error(`Иллюстрация: ${o.id} (${o.kind}) — в label нужно число из текста, например «250» или «$88,000».`);
  if(o.kind==="counter"&&!(COUNTER_ICONS as readonly string[]).includes(o.aim))throw new Error(`Иллюстрация: значок счётчика ${o.id} — aim из ${COUNTER_ICONS.join(", ")}.`);
  // Real logos/photos only from the project's media snapshot (source, licence, SHA-256): never drawn or guessed.
  if((o.kind==="logo-tile"||o.kind==="person-tile")&&!findMedia(plan.media,o.label,o.kind==="logo-tile"?"logo":"person"))throw new Error(`Иллюстрация: для ${o.kind} «${o.label}» нет снимка в media проекта (доступны: ${(plan.media??[]).filter(m=>m.kind===(o.kind==="logo-tile"?"logo":"person")).map(m=>m.subject).join(", ")||"нет"}).`);
  if(o.label&&!grounded(o.label,vocabulary))throw new Error(`Иллюстрация: подпись «${o.label}» не опирается на проверенный текст.`);
 }
 for(const f of result.flows){
  if(!ids.has(f.from)||!ids.has(f.to)||f.from===f.to)throw new Error(`Иллюстрация: поток ${f.from}→${f.to} ссылается на неизвестные объекты.`);
  const enter=check(f.enter,"поток"),exit=f.exit?check(f.exit,"поток"):Infinity;if(exit-enter<.6)throw new Error("Иллюстрация: поток короче 0,6 с.");
 }
 const cams=tl.camera;
 if(cams[0].at>.05)throw new Error("Иллюстрация: первый ключ камеры должен стоять в начале ролика (scene 1, progress 0, cue '').");
 for(let i=1;i<cams.length;i++)if(cams[i].at-cams[i-1].at<1)throw new Error("Иллюстрация: между ключами камеры нужно не меньше 1 с.");
 result.camera.forEach((c,i)=>check(c.at,`camera[${i}]`));result.mode.forEach((m,i)=>check(m.at,`mode[${i}]`));
 for(const c of result.callouts){
  if(!ids.has(c.target))throw new Error(`Иллюстрация: выноска «${c.text}» ссылается на неизвестный ${c.target}.`);
  if(!grounded(c.text,vocabulary))throw new Error(`Иллюстрация: выноска «${c.text}» не опирается на проверенный текст.`);
  const enter=check(c.enter,"выноска"),exit=c.exit?check(c.exit,"выноска"):Infinity;if(exit-enter<.8)throw new Error(`Иллюстрация: выноска «${c.text}» короче 0,8 с.`);
  const o=tl.objects.find(x=>x.id===c.target)!;if(enter<o.enterAt-.05||enter>o.exitAt)throw new Error(`Иллюстрация: выноска «${c.text}» появляется, когда ${c.target} не виден.`);
  const r=tl.callouts.find(x=>x.text===c.text&&x.target===c.target&&x.enterAt===enter)!,settle=focusTime(r.from,r.to,1.2),p=placeAt(settle,o,o.moveKeys),s=toScreen(p,poseAt(settle,cams));
  if(s.x<FOCUS.left||s.x>FOCUS.right||s.y<FOCUS.top||s.y>FOCUS.bottom)throw new Error(`Иллюстрация: при выноске «${c.text}» центр ${c.target} (${Math.round(s.x)},${Math.round(s.y)}) вне безопасной зоны x ${FOCUS.left}..${FOCUS.right}, y ${FOCUS.top}..${FOCUS.bottom}. Сдвиньте камеру к нему.`);
 }
 for(const o of tl.objects){
  if(o.kind==="seed"||o.kind==="number-stream")continue;
  const t=focusTime(o.enterAt,o.exitAt,1.3);if(t>total)continue;
  const s=toScreen(placeAt(t,o,o.moveKeys),poseAt(t,cams));
  if(s.x<FOCUS.left-40||s.x>FOCUS.right+40||s.y<FOCUS.top-40||s.y>FOCUS.bottom+40)throw new Error(`Иллюстрация: ${o.id} появляется вне безопасной зоны кадра (${Math.round(s.x)},${Math.round(s.y)}). Поставьте камеру на него к моменту появления.`);
 }
 if(opts.coverage){
  const skip=plan.creatorOutro?.sceneId?[plan.creatorOutro.sceneId]:[];
  const message=coverageError(coverageReport(sentences(scenes as any,alignment as any,skip),anchoredTimes(result,a=>anchorTime(a,scenes,alignment))),"Иллюстрация");
  if(message)throw new Error(message);
 }
 for(const b of result.bigWords){if(!grounded(b.text,vocabulary))throw new Error(`Иллюстрация: крупное слово «${b.text}» не из проверенного текста.`);if(check(b.exit,"bigWord")-check(b.enter,"bigWord")<.8)throw new Error("Иллюстрация: крупное слово короче 0,8 с.");}
 if(plan.loopEnding)loopSeamError(result,timeline(result,scenes,alignment),total);
 return result;
}
/** Loop ending (2026-10-22): the last frame must be the first frame. The renderer shows objects present at t≈0 without
 *  their entrance; the plan must bring the camera, those objects and the x-ray back and clear everything else. */
export const LOOP_START=.05;
function loopSeamError(p:IllustratedPlan,tl:IllustratedTimeline,end:number){
 const r=(v:number)=>Math.round(v*100)/100,first=tl.camera[0].pose,last=cameraAt(end-1/30,tl.camera);
 if(Math.abs(last.x-first.x)>2||Math.abs(last.y-first.y)>2||Math.abs(last.zoom-first.zoom)>.01)throw new Error(`Петля: к последнему кадру камера должна вернуться в первый ключ (x ${first.x}, y ${first.y}, zoom ${first.zoom}), сейчас x ${r(last.x)}, y ${r(last.y)}, zoom ${r(last.zoom)}. Поставь последний ключ с теми же x/y/zoom не позже чем за 2,4 с до конца.`);
 const initial=(keys:{at:number;value:number}[])=>keys.filter(k=>k.at<=LOOP_START).at(-1)?.value??0;
 const pose=STAGE_VIEW;
 for(const o of tl.objects){
  if(o.enterAt<=LOOP_START){
   if(o.exitAt!==Infinity)throw new Error(`Петля: ${o.id} виден в первом кадре, поэтому остаётся до конца (exit=null).`);
   const lastKey=o.activeKeys.at(-1);
   if(lastKey&&lastKey.at>LOOP_START&&(Math.abs(lastKey.value-initial(o.activeKeys))>.001||lastKey.at>end-2.4))throw new Error(`Петля: ${o.id} должен вернуться к начальному active ${initial(o.activeKeys)} не позже чем за 2,4 с до конца (последний ключ ${lastKey.value} на ${r(lastKey.at)} с).`);
   const a=placeAt(0,o,o.moveKeys),b=placeAt(end,o,o.moveKeys),m=o.moveKeys.at(-1);
   if(Math.abs(a.x-b.x)>1||Math.abs(a.y-b.y)>1||Math.abs(a.scale-b.scale)>.005||m&&m.at>end-1.2)throw new Error(`Петля: ${o.id} к концу должен стоять там же и в том же масштабе, что в первом кадре (последний moves не позже чем за 1,2 с до конца).`);
  }else if(o.exitAt>end-.5){
   const at=placeAt(end,o,o.moveKeys),[w,h]=footprint(o,at.scale),s=toScreen(at,last),hw=w*last.zoom/2,hh=h*last.zoom/2;
   if(s.x+hw>pose.left&&s.x-hw<pose.right&&s.y+hh>pose.top&&s.y-hh<pose.bottom)throw new Error(`Петля: ${o.id} появился позже первого кадра, но виден в последнем. Убери его через exit не позже чем за 0,5 с до конца или держи вне кадра.`);
  }
 }
 for(const c of tl.callouts)if(c.to>end-.35)throw new Error(`Петля: выноска «${c.text}» должна закрыться не позже чем за 0,35 с до конца.`);
 for(const f of tl.flows)if(f.exitAt>end-.5)throw new Error(`Петля: поток ${f.from}→${f.to} должен закрыться не позже чем за 0,5 с до конца.`);
 for(const b of tl.bigWords)if(b.exitAt>end-.5)throw new Error(`Петля: крупное слово «${b.text}» должно уйти не позже чем за 0,5 с до конца.`);
 if(keyed(end,tl.mode,0,.6)>.001!==keyed(0,tl.mode,0,.6)>.001)throw new Error("Петля: режим рентгена в конце должен совпасть с первым кадром.");
}
/** The visible stage around the 1080×900 director view (overlay v2 shows ~40 px more above and below). */
const STAGE_VIEW={left:0,right:VIEW.width,top:-60,bottom:VIEW.height+60};
/** On-screen texts for the independent fact check. */
export function illustratedTexts(p?:IllustratedPlan){return p?[...p.objects.map(o=>o.label).filter(Boolean),...p.callouts.map(c=>c.text),...p.bigWords.map(b=>b.text)]:[];}
