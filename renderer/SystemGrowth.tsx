import React from "react";
import { interpolateColors } from "remotion";
import type { Storyboard } from "../src/lib/model";
import type { SpeechAlignment } from "./Explainer";
import { growthState, systemCues } from "./system-growth";
import brand from "../video-design/brand.json";
import { smooth } from "./motion";

const C = brand.colors;
function Text({x = 0, y = 0, children, size = 28, color = C.text, opacity = 1}: {
  x?: number; y?: number; children: React.ReactNode; size?: number; color?: string; opacity?: number;
}) {
  return <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={700} fill={color} opacity={opacity}>{children}</text>;
}
function Block({x, y, w, h, show, children, stroke = C.purple, fill = C.card, originX = x, originY = y}: {
  x: number; y: number; w: number; h: number; show: number; children: React.ReactNode;
  stroke?: string; fill?: string; originX?: number; originY?: number;
}) {
  const scale = .68 + .32 * show;
  const position = 1 - (1-show)**3;
  const opacity = smooth(show,.12,1);
  return <g opacity={opacity} transform={`translate(${originX + (x-originX)*position} ${originY + (y-originY)*position + (1-show)*10}) scale(${scale})`}>
    <rect x={-w/2} y={-h/2} width={w} height={h} rx={20} fill={fill} stroke={stroke} strokeWidth={2.3}/>
    {children}
  </g>;
}
function Wire({x1,y1,x2,y2,show,t,color=C.yellow,trace=0}: {
  x1:number;y1:number;x2:number;y2:number;show:number;t:number;color?:string;trace?:number;
}) {
  const mid=(y1+y2)/2;
  const d=`M${x1} ${y1}C${x1} ${mid} ${x2} ${mid} ${x2} ${y2}`;
  return <g opacity={show}>
    <path d={d} fill="none" stroke={C.purple} strokeWidth={2.5} strokeOpacity={.4}/>
    <path d={d} fill="none" stroke={color} strokeWidth={2.5+trace*2} pathLength={1} strokeDasharray=".025 .11" strokeDashoffset={-t*.075} strokeOpacity={.72}/>
  </g>;
}
function Server({x,y,show,failed=0,reserve=0,number,multi=1}: {x:number;y:number;show:number;failed?:number;reserve?:number;number:number;multi?:number}) {
  const stroke=interpolateColors(reserve,[0,1],[interpolateColors(failed,[0,1],[C.purple,C.pink]),C.green]);
  return <Block x={x} y={y} w={242-58*multi} h={104-12*multi} show={show} stroke={stroke} originX={430} originY={y}>
    <g opacity={1-smooth(failed,0,.48)}>
      {[0,1,2].map(n=><g key={n}><rect x={-35} y={-29+n*9} width={70} height={5} rx={2} fill={C.purple} opacity={.45}/><circle cx={47} cy={-27+n*9} r={2.5} fill={C.yellow}/></g>)}
      <Text y={26} size={30} opacity={(1-smooth(reserve,0,.48))*smooth(multi,.45,1)}>Сервер {number}</Text>
      <Text y={26} size={30} opacity={1-smooth(multi,0,.45)}>Приложение</Text>
      <Text y={26} size={30} color={C.green} opacity={smooth(reserve,.48,1)}>Резерв</Text>
    </g>
    <g opacity={smooth(failed,.48,1)}><path d="M-23-29 23 11M23-29-23 11" stroke={C.pink} strokeWidth={4.5} strokeLinecap="round"/><Text y={32} size={25} color={C.pink}>Сбой</Text></g>
  </Block>;
}

/** One mounted topology for the entire film. Chapters never own or reset nodes. */
export function SystemGrowth({t,plan,alignment}: {t:number;plan:Storyboard;alignment:SpeechAlignment[]}) {
  const s=growthState(t,systemCues(plan,alignment));
  const dataTop=s.dbY-52;
  return <svg width={860} height={550} viewBox="0 0 860 550" style={{overflow:"visible"}} aria-label="Одна растущая архитектура соцсети">
    <Wire x1={430} y1={61} x2={430} y2={204} show={s.app*(1-s.balance)} t={t}/>
    <Wire x1={430} y1={61} x2={430} y2={96} show={s.balance} t={t}/>
    {[200,430,660].map((x,n)=><Wire key={`entry-${x}`} x1={430} y1={160} x2={x} y2={204} show={s.balance*(n===1?1:s.servers)*(n===0?1-s.failure*.94:1)} color={n===2?interpolateColors(s.reserve,[0,1],[C.yellow,C.green]):C.yellow} trace={n===2?s.traces:0} t={t}/>)}
    {[200,430,660].map((x,n)=><Wire key={`data-${x}`} x1={x} y1={296} x2={s.dbX} y2={dataTop} show={s.database*(n===1?1:s.servers)*(n===0?1-s.failure*.94:1)} trace={n===1?s.traces:0} t={t}/>)}
    <Wire x1={200} y1={296} x2={145} y2={386} show={s.cache} t={t}/>
    <Wire x1={536} y1={430} x2={620} y2={430} show={s.replica} color={C.lavender} t={t}/>
    <Wire x1={660} y1={296} x2={645} y2={355} show={s.files} t={t}/>
    <Wire x1={645} y1={431} x2={645} y2={457} show={s.cdn} t={t}/>
    <Wire x1={660} y1={296} x2={645} y2={345} show={s.queue} t={t}/>
    <Wire x1={645} y1={429} x2={645} y2={452} show={s.workers} t={t}/>
    <path d={`M${s.dbX} ${s.dbY+52}V476H690`} stroke={C.purple} strokeWidth={2} fill="none" opacity={s.observation*.35}/>

    <Block x={430} y={32} w={240} h={58} show={s.users} stroke={C.lavender}>
      <circle cx={-86} cy={-7} r={6} fill={C.lavender}/><path d="M-99 14q13-23 26 0" fill="none" stroke={C.lavender} strokeWidth={3}/>
      <Text x={15} y={10} size={30}>Пользователи</Text>
    </Block>
    <Block x={430} y={128} w={274} h={64} show={s.balance} originY={250}>
      <Text y={10} size={30} color={C.lavender}>Балансировщик</Text>
    </Block>
    <Server x={430} y={250} show={s.app} number={2} multi={s.servers}/>
    <Server x={200} y={250} show={s.servers} number={1} failed={s.failure}/>
    <Server x={660} y={250} show={s.servers} number={3} reserve={s.reserve}/>

    <Block x={145} y={430} w={190} h={88} show={s.cache} fill={C.lavender} stroke={C.lavender} originX={430} originY={430}>
      <Text y={8} size={32} color={C.background}>Кэш</Text><Text y={31} size={19} color={C.background}>Частые ответы</Text>
    </Block>
    <Block x={715} y={430} w={190} h={88} show={s.replica} originX={430} originY={430}>
      <Text y={6} size={29}>Реплика</Text><Text y={31} size={20} color={C.lavender}>Читаем копию</Text>
    </Block>

    {/* The same database panel widens, moves locally and divides into shards. */}
    <Block x={s.dbX} y={s.dbY} w={s.dbWidth} h={104} show={s.database}>
      <g opacity={1-smooth(s.shards,0,.45)}>
        <ellipse cx={0} cy={-24} rx={29} ry={7} fill="none" stroke={C.lavender} strokeWidth={2}/>
        <path d="M-29-24v18c0 12 58 12 58 0v-18" fill="none" stroke={C.lavender} strokeWidth={2}/>
        <Text y={32} size={30}>База данных</Text>
      </g>
      <g opacity={smooth(s.shards,.5,1)}>
        <path d={`M0 ${-40*s.shards}V${40*s.shards}`} stroke={C.purple} strokeWidth={2}/>
        <Text x={-88} y={-4} size={30} color={C.lavender}>Шард A</Text><Text x={88} y={-4} size={30} color={C.lavender}>Шард B</Text>
        <Text x={-88} y={28} size={20} color={C.muted}>Часть данных</Text><Text x={88} y={28} size={20} color={C.muted}>Часть данных</Text>
      </g>
    </Block>

    <Block x={645} y={393} w={224} h={76} show={s.files} originX={660} originY={250}>
      <Text y={-2} size={30}>Хранилище</Text><Text y={25} size={22} color={C.lavender}>Фото и видео</Text>
    </Block>
    <Block x={645} y={488} w={224} h={62} show={s.cdn} fill={C.lavender} stroke={C.lavender} originX={645} originY={393}>
      <Text y={9} size={30} color={C.background}>CDN</Text>
    </Block>
    <Block x={645} y={387} w={224} h={84} show={s.queue} originX={660} originY={250}>
      <Text y={-5} size={29}>Очередь</Text>
      {[0,1,2,3].map(n=><rect key={n} x={-67+n*37} y={12} width={25} height={13} rx={4} fill={n===0?C.yellow:C.purple}/>)}
    </Block>
    <Block x={645} y={487} w={244} h={70} show={s.workers} originX={645} originY={387}>
      <Text y={0} size={28}>Воркеры</Text><Text y={25} size={21} color={C.lavender}>Обработка в фоне</Text>
    </Block>

    <g opacity={s.lag}><rect x={228} y={168} width={404} height={36} rx={13} fill={C.card}/><Text x={430} y={193} size={23} color={C.yellow}>Реплика может отставать</Text></g>
    <g opacity={s.reserve*(1-s.observation)}><Text x={645} y={410} size={30} color={C.green}>Запрос продолжает путь</Text><Text x={645} y={447} size={24} color={C.lavender}>Копии данных + health check</Text></g>

    {[{label:"Логи",x:170,p:s.logs},{label:"Метрики",x:430,p:s.metrics},{label:"Трассировка",x:690,p:s.traces}].map(o=><Block key={o.label} x={o.x} y={515} w={224} h={56} show={o.p} originX={s.dbX} originY={s.dbY} stroke={C.lavender}><Text y={10} size={30} color={C.lavender}>{o.label}</Text></Block>)}
    <rect x={s.dbX-s.dbWidth/2+5} y={s.dbY-47} width={s.dbWidth-10} height={94} rx={16} fill="none" stroke={C.yellow} strokeWidth={3} opacity={s.final}/>
  </svg>;
}
