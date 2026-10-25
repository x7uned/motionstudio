import fs from "node:fs";
import path from "node:path";
import type {z} from "zod";
import type {qualityFindingSchema} from "./quality-contract";
/**
 * Safe zones of the 9:16 frame (user decision 2026-10-25; docs/safe-zones.md, numbers in video-design/safe-zones.json).
 * New 9:16 projects carry production.safeZonesVersion=1: the review of their final MP4 checks every OCR line outside the
 * caption row against the background-only zones. Projects without the field keep the earlier OCR rule byte for byte.
 * Coordinates are 1080×1920 frame pixels; other 9:16 sizes scale by width.
 */
export const SAFE_ZONES_VERSION=1 as const;
export type ZoneLevel="ui"|"captions"|"caution"|"edge";
export type Box={x0:number;y0:number;x1:number;y1:number};
export type SafeZone=Box&{id:string;level:ZoneLevel;covers?:string};
export type SafeZones={version:number;date:string;frame:{width:number;height:number};zones:SafeZone[];main:Box[];focus:Box};
type Finding=z.infer<typeof qualityFindingSchema>;

const loaded=new Map<string,SafeZones>();
/** The zones of one version. A newer safe-zones.json is a new version (docs/safe-zones.md): v1 projects are never checked
 *  against other numbers silently — the check reports itself unavailable instead. */
export function safeZones(version:number=SAFE_ZONES_VERSION,root=process.cwd()):SafeZones{
 const file=path.join(root,"video-design","safe-zones.json");
 let zones=loaded.get(file);
 if(!zones){zones=JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/file,"utf8")) as SafeZones;loaded.set(file,zones);}
 if(zones.version!==version)throw new Error(`video-design/safe-zones.json — версия ${zones.version}, проект проверяется по безопасным зонам v${version}: числа v${version} нужно сохранить отдельным файлом.`);
 return zones;
}
/** Most severe first: the interface is background only, then the subtitle row, the cropped edges, the caution strips. */
export const LEVEL_RANK:Record<ZoneLevel,number>={ui:4,captions:3,edge:2,caution:1};
export const LEVEL_LABEL:Record<ZoneLevel,string>={ui:"интерфейс платформы — только фон",captions:"строка субтитров — только субтитры",edge:"край кадра — без текста",caution:"полоса «осторожно» — не для текста"};
const ADVICE:Record<ZoneLevel,string>={
 ui:"Перенесите в главную зону x 70–880 (выше y 800 — до x 1010), y 300–1250: сдвиг камеры, объекта или карточки; часы озвучки не меняются.",
 captions:"В полосе y 1360–1500 — только субтитры: поднимите надпись выше y 1250.",
 edge:"Отодвиньте текст от края кадра не меньше чем на 70 px.",
 caution:"Здесь интерфейс закрывает кадр на части телефонов и при длинном описании: текст, который нужно прочитать, — в главную зону.",
};
const overlap=(a:Box,b:Box)=>({x:Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0),y:Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)});
/** Zones a box enters deeper than `tolerance` px on both axes, most severe first. A point is a box with x0=x1, y0=y1. */
export function zonesHit(box:Box,zones:SafeZones,opts:{tolerance?:number;levels?:readonly ZoneLevel[]}={}):SafeZone[]{
 const tol=opts.tolerance??4,point=box.x0===box.x1&&box.y0===box.y1;
 return zones.zones.filter(z=>(!opts.levels||opts.levels.includes(z.level))&&(point?box.x0>=z.x0&&box.x0<z.x1&&box.y0>=z.y0&&box.y0<z.y1:(({x,y})=>x>tol&&y>tol)(overlap(box,z))))
  .sort((a,b)=>LEVEL_RANK[b.level]-LEVEL_RANK[a.level]);
}
/** Inside the main zone (everything important): text, numbers, faces, the hero's landing. */
export function inMain(box:Box,zones:SafeZones,tolerance=0){
 const t=tolerance,parts=zones.main;
 if(box.y0===box.y1)return parts.some(m=>box.y0>=m.y0-t&&box.y0<=m.y1+t&&box.x0>=m.x0-t&&box.x1<=m.x1+t);
 // The main zone is two stacked rectangles: a box may span both when it fits the narrower one where they meet.
 if(box.y0<Math.min(...parts.map(m=>m.y0))-t||box.y1>Math.max(...parts.map(m=>m.y1))+t)return false;
 return parts.every(m=>overlap(box,m).y<=t||box.x0>=m.x0-t&&box.x1<=m.x1+t);
}
/** A subtitle line: wholly inside the caption row (small OCR slack). Only such lines are exempt from the check. */
export function inCaptionRow(box:Box,zones:SafeZones,tolerance=6){
 const c=zones.zones.find(z=>z.level==="captions");
 return !!c&&box.x0>=c.x0-tolerance&&box.x1<=c.x1+tolerance&&box.y0>=c.y0-tolerance&&box.y1<=c.y1+tolerance;
}
export type OcrLine={at:number;text:string;confidence:number;x:number;y:number;width:number;height:number};
export type ZoneViolation={at:number;frame:number;text:string;zone:string;level:ZoneLevel;zones:string[];box:Box};
const round=(b:Box):Box=>({x0:Math.round(b.x0),y0:Math.round(b.y0),x1:Math.round(b.x1),y1:Math.round(b.y1)});
/** OCR lines of the final MP4 (normalised, y from the top) that enter a background-only, caption, edge or caution zone. */
export function ocrZoneViolations(lines:readonly OcrLine[],zones:SafeZones,opts:{minConfidence?:number;fps?:number}={}):ZoneViolation[]{
 const W=zones.frame.width,H=zones.frame.height,fps=opts.fps??30,out:ZoneViolation[]=[];
 for(const r of lines){
  if(!(r.confidence>=(opts.minConfidence??.7))||!r.text?.trim())continue;
  const box={x0:r.x*W,y0:r.y*H,x1:(r.x+r.width)*W,y1:(r.y+r.height)*H};
  if(inCaptionRow(box,zones))continue;
  const hit=zonesHit(box,zones);if(!hit.length)continue;
  out.push({at:r.at,frame:Math.round(r.at*fps),text:r.text.trim(),zone:hit[0].id,level:hit[0].level,zones:hit.map(z=>z.id),box:round(box)});
 }
 return out.sort((a,b)=>a.at-b.at||a.box.y0-b.box.y0);
}
const norm=(s:string)=>s.toLowerCase().replace(/\s+/g," ").trim();
/** One review finding per text and zone: the first second and frame with its box, plus how often it repeats. */
export function zoneFindings(violations:readonly ZoneViolation[],duration:number,limit=30):Finding[]{
 const groups=new Map<string,ZoneViolation[]>();
 for(const v of violations){const key=`${v.zone}|${norm(v.text)}`;groups.set(key,[...(groups.get(key)??[]),v]);}
 const list=[...groups.values()].sort((a,b)=>LEVEL_RANK[b[0].level]-LEVEL_RANK[a[0].level]||a[0].at-b[0].at).slice(0,limit);
 return list.map(g=>{
  const v=g[0],last=g.at(-1)!,b=v.box,text=v.text.length>80?v.text.slice(0,79)+"…":v.text;
  const more=g.length>1?`; ещё ${g.length-1} в проверенных кадрах до ${last.at.toFixed(2)} с`:"";
  return {kind:"safe-zone" as const,start:v.at,end:Math.min(duration,Math.max(v.at,last.at)+.1),severity:v.level==="ui"||v.level==="captions"?"error" as const:"warning" as const,
   detail:`Безопасные зоны v1: «${text}» в зоне ${v.zone} (${LEVEL_LABEL[v.level]}) на ${v.at.toFixed(2)} с, кадр ${v.frame}: рамка x ${b.x0}–${b.x1}, y ${b.y0}–${b.y1} (кадр 1080×1920)${more}. ${ADVICE[v.level]}`};
 }).sort((a,b)=>a.start-b.start);
}
/** Frame-review note for the model reviewer of a v1 project: what OCR cannot read (faces, landings, accents). */
export function zoneReviewNote(zones:SafeZones){
 const top=zones.zones.find(z=>z.id==="top-ui")!,bottom=zones.zones.find(z=>z.id==="bottom-ui")!,right=zones.zones.find(z=>z.id==="right-buttons")!,cap=zones.zones.find(z=>z.level==="captions")!,[upper,lower]=zones.main;
 return ` Безопасные зоны v${zones.version} (кадр ${zones.frame.width}×${zones.frame.height}; на листе кадр уменьшен в 4 раза): верх y 0–${top.y1}, низ y ${bottom.y0}–${bottom.y1} и колонка кнопок x ${right.x0}–${right.x1} ниже y ${right.y0} закрыты интерфейсом платформы — там только фон; y ${cap.y0}–${cap.y1} — только субтитры. Лицо, глаза, логотип, карточка, призыв, место остановки героя, вспышка или главное действие вне главной зоны x ${upper.x0}–${lower.x1} (выше y ${upper.y1} — до x ${upper.x1}), y ${upper.y0}–${lower.y1} — замечание kind safe-zone с секундой. Предметы могут проходить через края, но не останавливаться и не срабатывать там. Текст уже проверен OCR отдельно.`;
}
