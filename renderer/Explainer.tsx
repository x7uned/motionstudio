import {StudioBackground} from "./StudioBackground";
import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
  interpolateColors,
  Easing,
} from "remotion";
import {
  sceneClock,
  type Storyboard,
  type StyleProfile,
} from "../src/lib/model";
import { smooth, windowAt, sceneMotion } from "./motion";
import { resolveBeatAt } from "../src/lib/research-model";
import brand from "../video-design/brand.json";
import {PersistentDiagram} from "./PersistentDiagram";
import { SystemGrowth } from "./SystemGrowth";

export type Word = { text: string; start: number; end: number };
export type SpeechAlignment = {
  scene: number;
  start: number;
  end: number;
  sceneEnd: number;
  speed: number;
  text: string;
  words?: Word[];
};
const C = brand.colors;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const tween = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { ...clamp, easing: ease });
const line = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], clamp);

function Icon({
  kind,
  x = 0,
  y = 0,
  size = 80,
  color = C.lavender,
}: {
  kind: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
}) {
  const paths: Record<string, React.ReactNode> = {
    code: (
      <>
        <path d="M25 20 9 36l16 16M47 20l16 16-16 16M42 12 30 60" />
      </>
    ),
    box: (
      <>
        <path d="m8 21 28-14 28 14-28 15ZM8 21v31l28 15 28-15V21M36 36v31M22 14l28 15v16" />
      </>
    ),
    check: <path d="m13 36 16 16 31-33" />,
    shop: (
      <>
        <path d="M11 28v33h50V28M7 28l6-16h46l6 16M25 61V43h22v18M7 28q8 13 15 0 7 13 14 0 7 13 14 0 7 13 15 0" />
      </>
    ),
    commit: (
      <>
        <circle cx="36" cy="36" r="14" />
        <path d="M4 36h18M50 36h18" />
      </>
    ),
    eye: (
      <>
        <path d="M5 36q31-40 62 0Q36 76 5 36Z" />
        <circle cx="36" cy="36" r="10" />
      </>
    ),
    play: <path d="M24 12v48l35-24Z" />,
  };
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      stroke={color}
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[kind] ?? paths.code}
    </svg>
  );
}
function Label({
  x,
  y,
  children,
  size = 28,
  color = C.text,
  weight = 600,
  anchor = "start",
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill={color}
      fontWeight={weight}
      textAnchor={anchor}
    >
      {children}
    </text>
  );
}
function Panel({
  x = 0,
  y = 0,
  w = 860,
  h = 400,
  children,
}: {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  children?: React.ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={w}
        height={h}
        rx="36"
        fill={C.card}
        stroke={C.purple}
        strokeOpacity=".3"
        strokeWidth="2"
      />
      {children}
    </g>
  );
}
function Shop({
  x = 0,
  y = 0,
  scale = 1,
  active = true,
  staging = false,
}: {
  x?: number;
  y?: number;
  scale?: number;
  active?: boolean;
  staging?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect
        width="370"
        height="360"
        rx="28"
        fill={C.card}
        stroke={C.purple}
        strokeOpacity=".5"
        strokeWidth="2"
      />
      <path d="M0 64h370" stroke={C.purple} strokeOpacity=".3" />
      {[0, 1, 2].map((n) => (
        <circle
          key={n}
          cx={25 + n * 18}
          cy="33"
          r="4"
          fill={n === 0 ? C.yellow : C.purple}
        />
      ))}
      <Label x={345} y={40} size={19} color={C.muted} anchor="end">
        {staging ? "ТЕСТОВЫЙ СТЕНД" : "МАГАЗИН"}
      </Label>
      <rect x="28" y="92" width="118" height="124" rx="20" fill={C.surface} />
      <Icon x={50} y={118} size={76} kind="box" color={C.lavender} />
      <Label x={170} y={130} size={25}>
        Любимый товар
      </Label>
      <rect x="171" y="153" width="125" height="10" rx="5" fill={C.surface} />
      <rect x="171" y="177" width="80" height="10" rx="5" fill={C.surface} />
      <rect
        x="28"
        y="254"
        width="314"
        height="68"
        rx="19"
        fill={active ? C.purple : C.surface}
      />
      <Label
        x={185}
        y={298}
        anchor="middle"
        size={27}
        color={active ? C.ivory : C.muted}
      >
        Добавить в корзину
      </Label>
    </g>
  );
}
function Node({
  x,
  y,
  kind,
  label,
  active = true,
}: {
  x: number;
  y: number;
  kind: string;
  label: string;
  active?: boolean;
}) {
  return (
    <g opacity={active ? 1 : 0.35}>
      <rect
        x={x - 65}
        y={y - 65}
        width="130"
        height="130"
        rx="32"
        fill={C.card}
        stroke={active ? C.purple : C.muted}
        strokeWidth="2"
      />
      <Icon x={x - 39} y={y - 39} size={78} kind={kind} />
      <Label x={x} y={y + 110} anchor="middle" size={32}>
        {label}
      </Label>
    </g>
  );
}
function Wire({
  x1,
  x2,
  y,
  t,
  delay = 0,
}: {
  x1: number;
  x2: number;
  y: number;
  t: number;
  delay?: number;
}) {
  const p = line(t, delay, delay + 0.65);
  const travel = (Math.max(0, t - delay) * 0.6) % 1;
  return (
    <g opacity={p}>
      <path
        d={`M${x1} ${y}H${x2}`}
        stroke={C.purple}
        strokeOpacity=".5"
        strokeWidth="3"
        strokeDasharray="6 8"
      />
      <path
        d={`m${x2 - 10} ${y - 7} 10 7-10 7`}
        fill="none"
        stroke={C.lavender}
        strokeWidth="3"
      />
      <circle cx={x1 + (x2 - x1) * travel} cy={y} r="6" fill={C.yellow} />
    </g>
  );
}
export function captionEnvelope(t:number,start:number,end:number,qualityMode=false){
 if(qualityMode&&end<=start)return {enter:0,exit:1,opacity:0};
 const fade=qualityMode?Math.min(.16,(end-start)/2):.1;
 const enter=qualityMode?smooth(t,start,start+fade):smooth(t,start-.1,start+.1);
 const exit=qualityMode?smooth(t,end-fade,end):smooth(t,end-.1,end+.1);
 return {enter,exit,opacity:qualityMode?enter*(1-exit):windowAt(t,start,end,.2)};
}
// English captions keep articles, prepositions and conjunctions with the following word, like the Russian list below.
const EN_CARRY=["a","an","the","to","of","in","on","at","by","for","and","or","but","with","from","into","as","than","if","so","its","your","our","their"];
const RU_CARRY=["в","к","с","и","а","на","по","за","от","из","не","для","без","при","о","под","над"];
export const carryWord=(text:string,lang?:string)=>(lang==="en"?EN_CARRY:RU_CARRY).includes(text.toLowerCase());
/** Caption groups by real word timings: ≤5 words / ≤32 characters, short function words carried to the next group, a group ends at punctuation. */
export function captionChunks(words: Word[], lang?: string, maxWords = 5, maxChars = 32): Word[][] {
  const chunks: Word[][] = [];
  let chunk: Word[] = [];
  for (const w of words) {
    if (
      chunk.length &&
      (chunk.length >= maxWords ||
        [...chunk, w].map((x) => x.text).join(" ").length > maxChars)
    ) {
      const last = chunk.at(-1)!;
      const carry =
        chunk.length > 1 &&
        carryWord(last.text, lang)
          ? [chunk.pop()!]
          : [];
      chunks.push(chunk);
      chunk = carry;
    }
    chunk.push(w);
    if (/[.,!?;:]$/.test(w.text)) {
      chunks.push(chunk);
      chunk = [];
    }
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}
export function Captions({ a, t, qualityMode=false, nextStart, top=1124, lang }: { a?: SpeechAlignment; t: number; qualityMode?:boolean; nextStart?:number;top?:number;lang?:string }) {
  if (!a?.words?.length) return null;
  const chunks = captionChunks(a.words, lang);
  return (
    <div
      style={{
        position: "absolute",
        left: 78,
        right: 140,
        top,
        height: 145,
        overflow: "hidden",
      }}
    >
      {chunks.map((words, n) => {
        const start = words[0].start,
          end = qualityMode?Math.min(chunks[n+1]?.[0].start??nextStart??a.end+.18,a.sceneEnd):chunks[n + 1]?.[0].start ?? a.end + 0.18;
        const {opacity,enter,exit}=captionEnvelope(t,start,end,qualityMode);
        if (opacity === 0) return null;
        return (
          <div
            key={n}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              alignContent: "center",
              gap: "8px 9px",
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.3,
              letterSpacing: -1.5,
              opacity,
              transform: `translateY(${(1 - enter) * 64 - exit * 64}px) scale(${0.98 + 0.02 * enter})`,
            }}
          >
            {words.map((w, j) => {
              const highlight = windowAt(t, w.start, w.end + 0.025, 0.1);
              return (
                <span
                  key={j}
                  style={{
                    position: "relative",
                    padding: "0 7px",
                    borderRadius: 9,
                    color: C.text,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 9,
                      background: C.purple,
                      opacity: highlight,
                      transform: `scaleX(${0.9 + 0.1 * highlight})`,
                    }}
                  />
                  <span style={{ position: "relative" }}>{w.text}</span>
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
function Reveal({
  t,
  at = 0,
  children,
}: {
  t: number;
  at?: number;
  children: React.ReactNode;
}) {
  const p = tween(t, at, at + 0.5);
  return (
    <g
      opacity={p}
      style={{
        transformBox: "fill-box",
        transformOrigin: "center",
        transform: `translateY(${(1 - p) * 18}px) scale(${0.88 + 0.12 * p})`,
      }}
    >
      {children}
    </g>
  );
}
function Diagram({ t, children }: { t: number; children: React.ReactNode }) {
  return (
    <svg width="860" height="510" viewBox="0 0 860 510">
      {React.Children.toArray(children).map((child, n) => (
        <Reveal key={n} t={t} at={0.04 + n * 0.07}>
          {child}
        </Reveal>
      ))}
    </svg>
  );
}

function CIBody({
  i,
  t,
  event,
}: {
  i: number;
  t: number;
  event: (word: string, fallback: number) => number;
}) {
  const reveal = (a: number) => ({
    opacity: tween(t, a, a + 0.4),
    transform: `translate(0 ${(1 - tween(t, a, a + 0.4)) * 18})`,
  });
  if (i === 0)
    return (
      <svg width="860" height="510" viewBox="0 0 860 510">
        <Shop x={0} y={60} scale={0.95} active={false} />
        <Shop x={488} y={60} scale={0.95} />
        <Wire x1={365} x2={474} y={235} t={t} />
        <Label x={176} y={460} anchor="middle" color={C.muted}>
          Было
        </Label>
        <Label x={665} y={460} anchor="middle" color={C.lavender}>
          Одна новая кнопка
        </Label>
      </svg>
    );
  if (i === 1)
    return (
      <svg width="860" height="510">
        <Panel y={35} h={385}>
          <Label x={34} y={52} size={24} color={C.muted}>
            shop / Button.tsx
          </Label>
          <path d="M0 77H860" stroke={C.purple} strokeOpacity=".3" />
          <Label x={38} y={137} size={29} color={C.muted}>
            Сохраняем новое поведение
          </Label>
          <rect
            x="28"
            y="168"
            width="803"
            height="72"
            rx="17"
            fill={C.purple}
            fillOpacity=".2"
          />
          <Label x={50} y={214} size={33} color={C.lavender}>
            + кнопка добавляет товар в корзину
          </Label>
          <g {...reveal(event("коммит", 0.5))}>
            <Icon x={40} y={279} size={49} kind="commit" color={C.yellow} />
            <Label x={109} y={314} size={30}>
              Изменение сохранено
            </Label>
            <Label x={806} y={314} size={24} anchor="end" color={C.yellow}>
              COMMIT
            </Label>
          </g>
        </Panel>
        <Label x={430} y={480} size={27} anchor="middle" color={C.lavender}>
          Новый код → автоматический запуск
        </Label>
      </svg>
    );
  if (i === 2)
    return (
      <svg width="860" height="510">
        <Panel y={35} h={385}>
          <Wire x1={193} x2={350} y={175} t={t} />
          <Wire x1={510} x2={667} y={175} t={t} delay={0.8} />
          <Node x={120} y={175} kind="code" label="Исходники" />
          <g {...reveal(0.5)}>
            <Node x={430} y={175} kind="play" label="Сборка" />
          </g>
          <g {...reveal(1.2)}>
            <Node x={740} y={175} kind="box" label="Приложение" />
          </g>
        </Panel>
        <g {...reveal(event("собралось", 3))}>
          <Label x={430} y={480} anchor="middle" color={C.yellow}>
            Если ошибка — конвейер остановится
          </Label>
        </g>
      </svg>
    );
  if (i === 3)
    return (
      <svg width="860" height="510">
        {[
          "Кнопка добавляет товар",
          "Корзина сохраняет товар",
          "Сборка и тесты → часть CI",
        ].map((text, n) => (
          <g
            key={n}
            {...reveal(
              n === 0
                ? event("кнопка", 1)
                : n === 1
                  ? event("корзина", 2.5)
                  : event("си-ай", 5),
            )}
          >
            <Panel y={25 + n * 135} h={108}>
              <circle
                cx="58"
                cy="54"
                r="27"
                fill={n === 2 ? C.purple : C.surface}
              />
              <Icon
                kind="check"
                x={39}
                y={35}
                size={38}
                color={n === 2 ? C.ivory : C.yellow}
              />
              <Label x={112} y={66} size={33}>
                {text}
              </Label>
            </Panel>
          </g>
        ))}
      </svg>
    );
  if (i === 4)
    return (
      <svg width="860" height="510">
        <Panel x={215} y={15} w={430} h={352}>
          <Icon kind="box" x={146} y={36} size={138} />
          <Label x={215} y={229} size={37} anchor="middle">
            Образ приложения
          </Label>
          <rect
            x="90"
            y="264"
            width="250"
            height="49"
            rx="24"
            fill={C.lavender}
          />
          <Label x={215} y={296} size={24} anchor="middle" color={C.background}>
            проверенная версия
          </Label>
        </Panel>
        <g {...reveal(event("именно", 2.8))}>
          <path
            d="M200 408H660"
            stroke={C.yellow}
            strokeWidth="3"
            strokeDasharray="6 9"
          />
          <Label x={430} y={470} size={32} anchor="middle" color={C.ivory}>
            Дальше едет та же сборка
          </Label>
        </g>
      </svg>
    );
  if (i === 5)
    return (
      <svg width="860" height="510">
        <Shop x={0} y={40} scale={1} staging />
        <g {...reveal(event("покупку", 2))}>
          <Panel x={418} y={75} w={442} h={260}>
            <Label x={28} y={56} size={24} color={C.muted}>
              РЕПЕТИЦИЯ РЕЛИЗА
            </Label>
            <Icon x={26} y={93} size={42} kind="check" color={C.yellow} />
            <Label x={85} y={125} size={29}>
              Кнопка → корзина
            </Label>
            <Icon x={26} y={161} size={42} kind="check" color={C.yellow} />
            <Label x={85} y={193} size={29}>
              Заказ оформляется
            </Label>
          </Panel>
        </g>
        <g {...reveal(event("Ошибка", 4))}>
          <path
            d="M800 376v55H72"
            stroke={C.yellow}
            strokeWidth="3"
            fill="none"
            strokeDasharray="8 10"
          />
          <path
            d="m85 423-14 8 14 8"
            fill="none"
            stroke={C.yellow}
            strokeWidth="3"
          />
          <Label x={430} y={485} size={29} anchor="middle" color={C.yellow}>
            Ошибка → исправление → снова
          </Label>
        </g>
      </svg>
    );
  if (i === 6)
    return (
      <svg width="860" height="510">
        <Node x={95} y={195} kind="box" label="Образ" />
        <Wire x1={169} x2={244} y={195} t={t} />
        <path
          d="M300 139 356 195 300 251 244 195Z"
          fill={C.card}
          stroke={C.lavender}
          strokeWidth="2"
        />
        <Icon kind="check" x={278} y={173} size={44} color={C.yellow} />
        <Label x={300} y={300} size={28} anchor="middle">
          Допуск
        </Label>
        <Wire x1={356} x2={413} y={195} t={t} />
        <Shop x={455} y={45} scale={1} />
        <g {...reveal(event("ручн", 3.2))}>
          <rect x="0" y="435" width="410" height="70" rx="20" fill={C.card} />
          <Label x={205} y={478} size={26} anchor="middle" color={C.lavender}>
            Delivery: подтверждаем
          </Label>
        </g>
        <g {...reveal(event("автомат", 4.5))}>
          <rect x="430" y="435" width="430" height="70" rx="20" fill={C.card} />
          <Label x={645} y={478} size={26} anchor="middle" color={C.yellow}>
            Deployment: автоматически
          </Label>
        </g>
      </svg>
    );
  return (
    <svg width="860" height="510">
      <Panel y={5} h={248}>
        <Label x={30} y={47} size={25} color={C.muted}>
          ОШИБКИ ПОСЛЕ ВЫПУСКА · условная схема
        </Label>
        <path d="M32 190H828" stroke={C.muted} strokeOpacity=".2" />
        <path
          d="M32 178 95 180 157 169 220 180 283 174 345 170 408 181 471 160 520 70 575 93 635 172 700 176 760 170 828 180"
          fill="none"
          stroke={C.purple}
          strokeWidth="5"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - line(t, 0.3, 3)}
        />
        <g
          opacity={tween(
            t,
            event("Возвращаем", 3.5),
            event("Возвращаем", 3.5) + 0.3,
          )}
        >
          <circle cx="520" cy="70" r="9" fill={C.yellow} />
          <Label x={560} y={76} size={27} color={C.yellow}>
            Откат
          </Label>
        </g>
      </Panel>
      <g {...reveal(event("версию", 4.7))}>
        <rect
          x="120"
          y="286"
          width="620"
          height="75"
          rx="23"
          fill={C.lavender}
        />
        <Label x={430} y={335} size={31} anchor="middle" color={C.background}>
          Прошлая версия снова работает
        </Label>
      </g>
      <g {...reveal(event("смысл", 6))}>
        <Label x={430} y={438} size={43} weight={800} anchor="middle">
          Изменение → проверка
        </Label>
        <Label
          x={430}
          y={492}
          size={43}
          weight={800}
          anchor="middle"
          color={C.lavender}
        >
          → безопасная доставка
        </Label>
      </g>
    </svg>
  );
}

function DirectedBody({
  scene,
  t,
  start,
  words = [],
}: {
  scene: Storyboard["scenes"][number];
  t: number;
  start: number;
  words?: Word[];
}) {
  const graph = scene.diagram!,
    beats = scene.beats ?? [];
  const at = (b: (typeof beats)[number]) =>
    Math.min(scene.seconds - 0.35, resolveBeatAt(b, start, words));
  const nodeAt = (id: string) => {
    const b = beats.find((b) => b.target === id && b.action === "reveal");
    return b ? at(b) : 0.1;
  };
  const point = (id: string) => {
    const n = graph.nodes.find((n) => n.id === id)!;
    return { x: 140 + n.col * 290, y: 100 + n.row * 230 };
  };
  const visible = (id: string) => {
    const hide = beats.find((b) => b.target === id && b.action === "hide");
    return (
      tween(t, nodeAt(id), nodeAt(id) + 0.5) *
      (hide ? 1 - smooth(t, at(hide), at(hide) + 0.4) : 1)
    );
  };
  return (
    <svg width="860" height="510" viewBox="0 0 860 510">
      {graph.edges.map((e) => {
        const a = point(e.from),
          b = point(e.to),
          beat = beats.find((b) => b.target === e.id && b.action === "connect");
        const delay =
          Math.max(nodeAt(e.from), nodeAt(e.to), beat ? at(beat) : 0) + 0.12;
        const p = tween(t, delay, delay + 0.65),
          sign = b.y > a.y ? 1 : -1;
        const d =
          a.y === b.y
            ? `M${a.x + (b.x > a.x ? 120 : -120)} ${a.y}H${b.x + (b.x > a.x ? -120 : 120)}`
            : `M${a.x} ${a.y + sign * 80}V${(a.y + b.y) / 2}H${b.x}V${b.y - sign * 80}`;
        const dx = a.y === b.y ? (b.x > a.x ? 1 : -1) : 0,
          dy = a.y === b.y ? 0 : sign;
        const ex = a.y === b.y ? b.x - dx * 120 : b.x,
          ey = a.y === b.y ? b.y : b.y - dy * 80;
        return (
          <g key={e.id} opacity={Math.min(visible(e.from), visible(e.to))}>
            <path
              d={d}
              fill="none"
              stroke={C.purple}
              strokeWidth="4"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - p}
            />
            <path
              d={d}
              fill="none"
              stroke={C.yellow}
              strokeWidth="4.5"
              strokeDasharray="5 33"
              strokeDashoffset={-t * 32}
              opacity={smooth(p, 0.8, 1)}
            />
            <path
              d={`M${ex - dx * 14 - dy * 7} ${ey - dy * 14 + dx * 7}L${ex} ${ey}L${ex - dx * 14 + dy * 7} ${ey - dy * 14 - dx * 7}`}
              fill="none"
              stroke={C.yellow}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={smooth(p, 0.8, 1)}
            />
          </g>
        );
      })}
      {graph.nodes.map((n) => {
        const { x, y } = point(n.id),
          p = visible(n.id);
        const hi = Math.max(
          0,
          ...beats
            .filter((b) => b.target === n.id && b.action === "highlight")
            .map((b) => windowAt(t, at(b) + 0.1, at(b) + 0.9, 0.3)),
        );
        const label = n.label,
          space = label.lastIndexOf(" ", 14);
        const lines =
          label.length > 14 && space > 0
            ? [label.slice(0, space), label.slice(space + 1)]
            : [label];
        const profile = n.kind === "user" || /профиль/i.test(label),
          timer = /^TTL|срок/i.test(label);
        return (
          <g
            key={n.id}
            opacity={p}
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              transform: `translateY(${(1 - p) * 20}px) scale(${0.86 + 0.14 * p})`,
            }}
          >
            <rect
              x={x - 120}
              y={y - 80}
              width="240"
              height="160"
              rx="28"
              fill={C.card}
              stroke={interpolateColors(hi, [0, 1], [C.purple, C.yellow])}
              strokeWidth={2 + hi}
            />
            {n.kind === "database" ? (
              <g transform={`translate(${x} ${y - 38})`}>
                <ellipse
                  cx="0"
                  cy="-13"
                  rx="30"
                  ry="8"
                  fill={C.card}
                  stroke={C.lavender}
                  strokeWidth="2"
                />
                <path
                  d="M-30-13v27c0 16 60 16 60 0v-27"
                  fill="none"
                  stroke={C.lavender}
                  strokeWidth="2"
                />
              </g>
            ) : profile ? (
              <g>
                <circle
                  cx={x}
                  cy={y - 49}
                  r="10"
                  fill="none"
                  stroke={C.lavender}
                  strokeWidth="3"
                />
                <path
                  d={`M${x - 20} ${y - 20}q20-29 40 0`}
                  fill="none"
                  stroke={C.lavender}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>
            ) : timer ? (
              <g>
                <circle
                  cx={x}
                  cy={y - 38}
                  r="20"
                  fill="none"
                  stroke={C.lavender}
                  strokeWidth="3"
                />
                <path
                  d={`M${x} ${y - 51}v14l10 6`}
                  fill="none"
                  stroke={C.yellow}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>
            ) : n.kind === "queue" ? (
              <g>
                {[0, 1, 2].map((j) => (
                  <circle
                    key={j}
                    cx={x - 40 + j * 40}
                    cy={y - 38}
                    r="9"
                    fill={j === 0 ? C.yellow : C.purple}
                  />
                ))}
              </g>
            ) : (
              <Icon
                x={x - 22}
                y={y - 60}
                size={44}
                kind={
                  n.kind === "storage" || n.kind === "cache"
                    ? "box"
                    : n.kind === "log"
                      ? "eye"
                      : n.kind === "card"
                        ? "check"
                        : "code"
                }
              />
            )}
            {label.includes(":") && label.split(":").length === 2 ? (
              <>
                <Label
                  x={x}
                  y={y + 12}
                  anchor="middle"
                  size={23}
                  color={C.lavender}
                >
                  {label.split(":")[0]}
                </Label>
                <Label
                  x={x}
                  y={y + 59}
                  anchor="middle"
                  size={Math.min(
                    44,
                    220 / (label.split(":")[1].trim().length * 0.52),
                  )}
                  weight={800}
                >
                  {label.split(":")[1].trim()}
                </Label>
              </>
            ) : (
              lines.map((line, j) => (
                <Label
                  key={j}
                  x={x}
                  y={y + (lines.length > 1 ? 17 : 38) + j * 38}
                  anchor="middle"
                  size={Math.min(34, 220 / (line.length * 0.52))}
                  color={C.text}
                >
                  {line}
                </Label>
              ))
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Portrait header insets. Legacy keeps the original geometry; quality-v2 moves text ~20 px inside the safe-zone. */
export const LEGACY_HEADER = {left: 78, right: 140, title: 0};
export const SAFE_HEADER = {left: 98, right: 164, title: 18};
export function ExplainerFilm({
  plan,
  profile,
  format,
  audio,
  alignment = [],
}: {
  plan: Storyboard;
  profile: StyleProfile;
  format: string;
  audio?: string;
  alignment?: SpeechAlignment[];
}) {
  const t = useCurrentFrame() / 30,
    clock = sceneClock(plan),
    chapters = clock.slice(1);
  const cicd = /CI\/CD/i.test(plan.title) && clock.length === 8;
  const persistent=profile.production?.version===2;
  const system = !persistent && /System Design/i.test(plan.title) && clock.length === 8;
  // Quality-v2 header, chapter counter, bars and titles sit inside the portrait OCR safe-zone x 75–940 with margin for glyph boxes.
  const inset = persistent ? SAFE_HEADER : LEGACY_HEADER;
  return (
    <AbsoluteFill
      style={{
        background: profile.background,
        color: profile.foreground,
        fontFamily: `'${profile.font} Variable',sans-serif`,
        overflow: "hidden",
      }}
    >
      <StudioBackground design={profile.backgroundDesign}/>
      {audio && <Audio src={staticFile(audio)} />}
      <div
        style={{
          position: "absolute",
          left: 52,
          right: 106,
          top: 74,
          height: 1356,
          borderRadius: 55,
          background: `linear-gradient(180deg, ${C.card}88, ${C.background}00 60%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: inset.left,
          right: inset.right,
          top: 108,
          display: "flex",
          alignItems: "center",
          gap: 19,
        }}
      >
        <div
          style={{
            width: 66,
            height: 66,
            borderRadius: 40,
            background: C.background,
            border: `2px solid ${C.purple}`,
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontSize: 29, fontWeight: 750 }}>
            {profile.username ?? brand.username}
          </div>
          <div style={{ fontSize: 23, color: C.muted, marginTop: 3 }}>
            {cicd
              ? "CI/CD · от кода до релиза"
              : system
                ? "System Design · по шагам"
                : plan.title}
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            position: "relative",
            width: 115,
            height: 38,
            fontSize: 25,
            fontWeight: 700,
            color: C.lavender,
          }}
        >
          {clock.map((s, i) => {
            const o = persistent
              ? smooth(t,s.start,s.start+.27)*(i===clock.length-1?1:1-smooth(t,s.end-.27,s.end))
              : windowAt(t,i===0?-1:s.start,i===clock.length-1?s.end+1:s.end,.3);
            return (
              o > 0 && (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    inset: 0,
                    textAlign: "right",
                    opacity: o,
                    transform: `translateY(${(1 - smooth(t, s.start - 0.15, s.start + 0.15)) * 9}px)`,
                  }}
                >
                  {i === 0
                    ? (profile.production?.language==="en"?"BASICS":"С НУЛЯ")
                    : `${String(i).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`}
                </span>
              )
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: inset.left,
          right: inset.right,
          top: 210,
          display: "flex",
          gap: 12,
        }}
      >
        {chapters.map((s, n) => {
          const progress = line(t, s.start, s.end - 1 / 30),
            done = smooth(t, s.end - 0.2, s.end + 0.2);
          return (
            <div
              key={n}
              style={{
                flex: 1,
                height: 10,
                borderRadius: 7,
                background: C.surface,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: "100%",
                  background: interpolateColors(
                    done,
                    [0, 1],
                    [C.yellow, profile.accent],
                  ),
                  borderRadius: 7,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 78,
          top: 270,
          width: 860,
          height: 950,
          overflow: "hidden",
        }}
      >
        {persistent && <div style={{position:"absolute",top:265,width:860,height:510}}><PersistentDiagram plan={plan} alignment={alignment} t={t}/></div>}
        {system && <div style={{position: "absolute", top: 265, width: 860, height: 550}}><SystemGrowth t={t} plan={plan} alignment={alignment}/></div>}
        {clock.map((s, i) => {
          const m = (system || persistent) ? {
            opacity: smooth(t, i === 0 ? 0 : s.start, (i === 0 ? 0 : s.start) + .27) * (i === clock.length-1 ? 1 : 1-smooth(t,s.end-.27,s.end)),
            x: 0, y: 0, scale: 1,
          } : sceneMotion(t, s.start, s.end, i === 0, i === clock.length - 1);
          if (m.opacity === 0) return null;
          const local = t - s.start,
            a = alignment[i];
          const event = (word: string, fallback: number) => {
            const w = a?.words?.find((w) =>
              w.text
                .toLocaleLowerCase("ru")
                .includes(word.toLocaleLowerCase("ru")),
            );
            return w ? Math.max(0, w.start - s.start) : fallback;
          };
          return (
            <div
              key={s.id}
              style={{
                position: "absolute",
                inset: 0,
                opacity: m.opacity,
                transform: `translate(${m.x}px,${m.y}px) scale(${m.scale})`,
              }}
            >
              <div style={{ position: "absolute", top: 10, width: 860, ...(persistent ? {paddingLeft: inset.title, paddingRight: inset.title, boxSizing: "border-box" as const} : {}) }}>
                <div
                  style={{
                    fontSize: 66,
                    fontWeight: 800,
                    letterSpacing: -2.7,
                    lineHeight: 1.09,
                    minHeight: 145,
                    textWrap: "balance",
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 32,
                    lineHeight: 1.35,
                    color: C.muted,
                    marginTop: 15,
                    height: 80,
                  }}
                >
                  {s.subtitle}
                </div>
              </div>
              {!system && !persistent && <div
                style={{
                  position: "absolute",
                  top: 265,
                  width: 860,
                  height: 510,
                }}
              >
                {s.diagram ? (
                  <DirectedBody
                    scene={s}
                    t={local}
                    start={s.start}
                    words={a?.words}
                  />
                ) : cicd ? (
                  <CIBody i={i} t={local} event={event} />

                ) : (
                  <Diagram t={local}>
                    {s.items.map((item, n) => (
                      <Panel key={n} y={n * 122} h={104}>
                        <Label x={35} y={65} size={31} color={C.lavender}>
                          {String(n + 1).padStart(2, "0")}
                        </Label>
                        <Label x={100} y={65} size={31}>
                          {item}
                        </Label>
                      </Panel>
                    ))}
                  </Diagram>
                )}
              </div>}
            </div>
          );
        })}
      </div>
      {alignment.map((a, i) => (
        <Captions key={i} a={a} t={t} qualityMode={profile.production?.version===2} lang={profile.production?.language} nextStart={alignment[i+1]?.words?.[0]?.start??alignment[i+1]?.start}/>
      ))}
    </AbsoluteFill>
  );
}

/** Same caption component, isolated for lossless-timing subtitle correction. */
export function CaptionBand({
  alignment = [],
}: {
  alignment?: SpeechAlignment[];
}) {
  const t = useCurrentFrame() / 30;
  return (
    <AbsoluteFill
      style={{
        background: C.background,
        fontFamily: "'Manrope Variable',sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -78,
          top: -1124,
          width: 1080,
          height: 1920,
        }}
      >
        {alignment.map((a, i) => (
          <Captions key={i} a={a} t={t} />
        ))}
      </div>
    </AbsoluteFill>
  );
}
