import {safeZones,zonesHit,inMain,LEVEL_LABEL,type Box,type SafeZones,type ZoneLevel} from "./safe-zones";
import {timeline as illustratedTimeline,focusTime,placeAt,cameraAt,toScreen,footprint,VIEW,SAFE,type IllustratedPlan} from "./illustrated";
import {illustratedLayout,type PortraitLayout,type OverlayVersion} from "./illustrated-layout";
import {QR_CALLOUT_ANCHOR} from "./illustrated-catalog-qr";
import {NET_CALLOUT_ANCHOR} from "./illustrated-catalog-net";
import {TUNNEL_CALLOUT_ANCHOR} from "./illustrated-catalog-tunnel";
import {FACEID_CALLOUT_ANCHOR} from "./illustrated-catalog-faceid";
import {PW_CALLOUT_ANCHOR} from "./illustrated-catalog-passwords";
import {SHAZAM_CALLOUT_ANCHOR} from "./illustrated-catalog-shazam";
import {MINUTE_CALLOUT_ANCHOR} from "./illustrated-catalog-minute";
import {isoWorld,isoTimeline,isoLayout,focusPoints,project as isoProject,cameraAt as isoCameraAt,MARKER_TOP,type IsometricPlan} from "./isometric";
import {anchorTime} from "./scene3d";
import type {Storyboard,StyleProfile} from "./model";
/**
 * Safe zones v1 on the director's plan (docs/safe-zones.md): before the render, warn where a callout, big word, labelled
 * object, logo/photo tile, marker tag or card lands in a zone the platform covers, and where an object comes to rest
 * outside the main zone. Warnings only — nothing is blocked or moved; the final-MP4 OCR review stays the check.
 * Screen boxes mirror the renderers (renderer/IllustratedFilm.tsx Callout and big words, IllustratedMedia.tsx tiles,
 * IsometricFilm.tsx Tag and Card); they are estimates of where the text sits, not measurements of the frame.
 */
export type PlanZoneWarning={at:number;kind:"callout"|"big-word"|"label"|"tile"|"landing"|"marker-tag"|"card";what:string;zone:string|null;level:ZoneLevel|"outside-main";box:Box};
export type PlanZoneReport={version:number;renderer:string;checked:boolean;warnings:PlanZoneWarning[];note?:string};
type Clock={seconds:number;narration?:string}[];
type Alignment={words?:{text:string;start:number;end:number}[]}[];
const r2=(v:number)=>Math.round(v*100)/100,rb=(b:Box):Box=>({x0:Math.round(b.x0),y0:Math.round(b.y0),x1:Math.round(b.x1),y1:Math.round(b.y1)});
const point=(x:number,y:number):Box=>({x0:x,y0:y,x1:x,y1:y});
const onFrame=(x:number,y:number,Z:SafeZones)=>x>=0&&x<=Z.frame.width&&y>=0&&y<=Z.frame.height;

// Callout anchors of tall objects (copy of the renderer's table: catalog anchors plus the three drawn in IllustratedFilm.tsx).
const CALLOUT_ANCHOR:Record<string,Partial<Record<string,readonly [number,number]>>>={"leaning-tower":{left:[-150,345],right:[150,345]},orbit:{top:[481,-445],bottom:[300,-21]},"spin-earth":{right:[233,-58]},
 ...QR_CALLOUT_ANCHOR,...NET_CALLOUT_ANCHOR,...TUNNEL_CALLOUT_ANCHOR,...FACEID_CALLOUT_ANCHOR,...PW_CALLOUT_ANCHOR,...SHAZAM_CALLOUT_ANCHOR,...MINUTE_CALLOUT_ANCHOR};
/** The callout plate in the 1080×900 director view (renderer Callout: 58 px high, 110 px off the anchor, clamped to the safe column). */
export function calloutBox(text:string,side:string,anchor:{x:number;y:number}):Box{
 const w=Math.min(SAFE.right-SAFE.left,46+text.length*22.5),off=110;
 let x=side==="left"?anchor.x-off-w:side==="right"?anchor.x+off:anchor.x-w/2,y=side==="top"?anchor.y-off-58:side==="bottom"?anchor.y+off:anchor.y-29;
 x=Math.max(SAFE.left,Math.min(SAFE.right-w,x));y=Math.max(20,Math.min(VIEW.height-78,y));
 return {x0:x,y0:y,x1:x+w,y1:y+58};
}
/** The big word block in the view: centred in the safe column from y 70, Manrope ≈0.66 em per letter, line height 1.02. */
export function bigWordBox(text:string):Box{
 const longest=Math.max(...text.split(" ").map(w=>w.length),1),line=text.length<=9?text.length:longest,size=Math.floor(Math.min(150,(SAFE.right-SAFE.left)/(line*.66)));
 const perLine=Math.max(1,Math.floor((SAFE.right-SAFE.left)/(size*.66)));let lines=1,used=0;
 for(const w of text.split(" ")){const n=used?used+1+w.length:w.length;if(used&&n>perLine){lines++;used=w.length;}else used=n;}
 const width=Math.min(SAFE.right-SAFE.left,Math.min(text.length,perLine)*size*.66),mid=(SAFE.left+SAFE.right)/2;
 return {x0:mid-width/2,y0:70,x1:mid+width/2,y1:70+lines*size*1.02};
}

export function illustratedZoneWarnings(p:IllustratedPlan,scenes:Clock,alignment:Alignment,Z:SafeZones,layout?:PortraitLayout,overlay?:OverlayVersion):PlanZoneWarning[]{
 const tl=illustratedTimeline(p,scenes,alignment),dy=illustratedLayout(layout,overlay).viewTop,total=scenes.reduce((n,s)=>n+s.seconds,0),out:PlanZoneWarning[]=[];
 const inFrame=(b:Box):Box=>({x0:b.x0,y0:b.y0+dy,x1:b.x1,y1:b.y1+dy});
 const warn=(at:number,kind:PlanZoneWarning["kind"],what:string,box:Box,levels?:readonly ZoneLevel[])=>{const hit=zonesHit(box,Z,{levels});if(hit.length)out.push({at:r2(at),kind,what,zone:hit[0].id,level:hit[0].level,box:rb(box)});};
 for(const c of tl.callouts){
  const o=tl.objects.find(x=>x.id===c.target);if(!o)continue;const t=focusTime(c.from,c.to,1.2);if(t>total)continue;
  const cam=cameraAt(t,tl.camera),place=placeAt(t,o,o.moveKeys),[w,h]=footprint(o,place.scale),a=CALLOUT_ANCHOR[o.kind]?.[c.side];
  const edge=a?{x:place.x+a[0]*place.scale,y:place.y+a[1]*place.scale}:{top:{x:place.x,y:place.y-h/2},bottom:{x:place.x,y:place.y+h/2},left:{x:place.x-w/2,y:place.y},right:{x:place.x+w/2,y:place.y}}[c.side]!;
  const anchor=toScreen(edge,cam);if(Math.max(0,-anchor.x,anchor.x-VIEW.width,-anchor.y,anchor.y-VIEW.height)>=80)continue;
  warn(t,"callout",`выноска «${c.text}»`,inFrame(calloutBox(c.text,c.side,anchor)));
 }
 for(const b of tl.bigWords){const t=Math.min(b.enterAt+.6,(b.enterAt+b.exitAt)/2);if(t<=total)warn(t,"big-word",`крупное слово «${b.text}»`,inFrame(bigWordBox(b.text)));}
 for(const o of tl.objects){
  if(o.kind==="seed"||o.kind==="number-stream")continue;
  const tile=o.kind==="logo-tile"||o.kind==="person-tile",moments=[focusTime(o.enterAt,o.exitAt,1.3),...o.moveKeys.map(m=>m.at+.9)].filter(t=>t<=total&&t>=o.enterAt&&t<o.exitAt);
  for(const t of moments){
   const cam=cameraAt(t,tl.camera),place=placeAt(t,o,o.moveKeys),s=toScreen(place,cam),x=s.x,y=s.y+dy;
   if(!onFrame(x,y,Z))continue; // parked or passing outside the frame
   if(o.label||tile){const [w,h]=footprint(o,place.scale),hw=w*cam.zoom/2,hh=h*cam.zoom/2;
    // A tile carries a picture and a name (faces, logos): every zone counts. A labelled object is a large shape: only text-proof zones.
    warn(t,tile?"tile":"label",`${o.id} «${o.label}»`,{x0:x-hw,y0:y-hh,x1:x+hw,y1:y+hh},tile?undefined:["ui","captions"]);}
   if(!inMain(point(x,y),Z)){const hit=zonesHit(point(x,y),Z);out.push({at:r2(t),kind:"landing",what:`место остановки ${o.id}`,zone:hit[0]?.id??null,level:hit[0]?.level??"outside-main",box:rb(point(x,y))});}
  }
 }
 return out.sort((a,b)=>a.at-b.at);
}

export function isometricZoneWarnings(p:IsometricPlan,scenes:Clock,alignment:Alignment,Z:SafeZones,layout?:PortraitLayout,overlay?:OverlayVersion):PlanZoneWarning[]{
 const world=isoWorld(p),tl=isoTimeline(p,world,scenes,alignment),L=isoLayout(layout,overlay),out:PlanZoneWarning[]=[];
 const warn=(at:number,kind:PlanZoneWarning["kind"],what:string,box:Box)=>{const hit=zonesHit(box,Z);if(hit.length)out.push({at:r2(at),kind,what,zone:hit[0].id,level:hit[0].level,box:rb(box)});};
 for(const fp of focusPoints(p,world.routes,a=>anchorTime(a,scenes,alignment),tl.total)){
  const s=isoProject(fp.p,isoCameraAt(fp.t,tl.camera));if(!onFrame(s.x,s.y,Z)||inMain(point(s.x,s.y),Z))continue;
  const hit=zonesHit(point(s.x,s.y),Z);out.push({at:r2(fp.t),kind:"landing",what:fp.what,zone:hit[0]?.id??null,level:hit[0]?.level??"outside-main",box:rb(point(s.x,s.y))});
 }
 // Marker tags (renderer Tag): a 30 px uppercase plate with a 26 px stem above the marker top.
 for(const m of tl.markers){
  if(!m.text)continue;const t=Math.min(m.enterAt+1,(m.enterAt+Math.min(m.exitAt,m.enterAt+20))/2);if(t>tl.total)continue;
  const q=isoProject([m.point[0],m.point[1]+MARKER_TOP[m.kind]+(m.kind==="pin"?0:.1),m.point[2]],isoCameraAt(t,tl.camera));if(!onFrame(q.x,q.y,Z))continue;
  const w=44+m.text.length*21;warn(t,"marker-tag",`подпись ${m.id} «${m.text}»`,{x0:q.x-w/2,y0:q.y-86,x1:q.x+w/2,y1:q.y-26});
 }
 // The card is fixed by the layout (isoLayout), not by the director: reported once per card, moved only by a new layout version.
 for(const c of tl.cards)warn(c.enterAt,"card",`карточка ${c.id} «${c.label}» (раскладка y ${L.card}–${L.card+L.cardHeight} фиксирована)`,{x0:78,y0:L.card,x1:940,y1:L.card+L.cardHeight});
 return out.sort((a,b)=>a.at-b.at);
}

/** Plan warnings of a v1 project (9:16 with production.safeZonesVersion); null for every other project. */
export function planZoneReport(plan:Storyboard,alignment:Alignment,profile:StyleProfile,format:string,root?:string):PlanZoneReport|null{
 const version=format==="9:16"?profile.production?.safeZonesVersion:undefined;if(!version)return null;
 const Z=safeZones(version,root),layout=profile.production?.portraitLayout,overlay=profile.production?.overlayVersion;
 if(plan.filmKind==="illustrated"&&plan.illustrated)return {version,renderer:"illustrated",checked:true,warnings:illustratedZoneWarnings(plan.illustrated,plan.scenes,alignment,Z,layout,overlay)};
 if(plan.filmKind==="isometric"&&plan.isometric)return {version,renderer:"isometric",checked:true,warnings:isometricZoneWarnings(plan.isometric,plan.scenes,alignment,Z,layout,overlay)};
 return {version,renderer:plan.filmKind??"2d",checked:false,warnings:[],note:"У этого рендера нет экранных координат в плане: зоны проверяются только по кадрам готового MP4."};
}
/** One event line: how many warnings and the first few with second, zone and box. */
export function planZoneSummary(r:PlanZoneReport){
 if(!r.warnings.length)return `Безопасные зоны v${r.version}, план постановки: подписи, карточки и места остановки в главной зоне.`;
 const head=r.warnings.slice(0,4).map(w=>`${w.at.toFixed(2)} с — ${w.what}: ${w.zone??"вне главной зоны"}${w.level==="outside-main"?"":` (${LEVEL_LABEL[w.level]})`}, x ${w.box.x0}–${w.box.x1}, y ${w.box.y0}–${w.box.y1}`).join("; ");
 return `Безопасные зоны v${r.version}, план постановки: ${r.warnings.length} предупрежд. (не блокирует рендер; проверка — по кадрам MP4): ${head}${r.warnings.length>4?"; …":""}. Список — safe-zones-plan.json.`;
}
