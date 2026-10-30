// «Иллюстрированная сцена 2.0» — scene data, layout, paths and the deterministic timeline.
// Anime.js v4 is used ONLY as a paused timeline/easing engine: the timeline is built once,
// never played, and every frame resets it to 0 and seeks forward to frame/fps (order-independent).
import {createTimeline,eases,type EasingFunction} from "animejs";

export const FPS=30;
export type P={x:number;y:number};
export const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
export const lerp=(a:number,b:number,f:number)=>a+(b-a)*f;
export const mix=(a:P,b:P,f:number):P=>({x:lerp(a.x,b.x,f),y:lerp(a.y,b.y,f)});
export const smooth=(v:number)=>{const x=clamp01(v);return x*x*(3-2*x);};
export const hash=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};

/* ── World layout (world units; the camera maps them to the 1080×1920 frame) ── */
export const LAP={x:250,y:1170};               // laptop pedestal top centre
export const SRV={x:800,y:560};                // server rack bottom centre
export const ROUTERS=[{x:260,y:560},{x:540,y:820},{x:870,y:1060}]; // RA, RB, RC pedestal tops
export const ROW_Y=860;                        // packets wait above the laptop
export const rowX=(i:number)=>LAP.x+(i-1.5)*105;
export const SLOT_Y=650;                       // arrival tray in front of the server
export const slotX=(s:number)=>SRV.x+(s-1.5)*104;
export const ORB={x:800,y:195};
export const routerNode=(r:number):P=>({x:ROUTERS[r].x,y:ROUTERS[r].y-58});
export const SCREEN={x:LAP.x,y:LAP.y-139};     // laptop display centre
export const BUTTON={x:LAP.x+104,y:LAP.y-72};  // send button (world)

/* ── Message text: «Привет!» split into «Пр» «ив» «ет» «!» ── */
export const PIECES=["Пр","ив","ет","!"];
// Manrope 800 advance widths in em (estimated, checked on stills).
const ADV:Record<string,number>={"П":.735,"р":.63,"и":.625,"в":.6,"е":.59,"т":.54,"!":.3};
export function wordLayout(fs:number){
 const pad=.62*fs,widths=PIECES.map(p=>[...p].reduce((s,c)=>s+(ADV[c]??.6)*fs,0));
 const total=widths.reduce((a,b)=>a+b,0),w=total+2*pad,h=1.62*fs;
 let x=-total/2;const centers:number[]=[],spans:number[]=[],textOff:number[]=[];
 widths.forEach((wd,i)=>{const lpad=i===0?pad:0,rpad=i===3?pad:0;centers.push(x+wd/2+(rpad-lpad)/2);textOff.push((lpad-rpad)/2);spans.push(wd+lpad+rpad);x+=wd;});
 return {w,h,centers,spans,widths,textOff,total};
}

/* ── Easing ── */
const E={
 linear:eases.linear,inOutSine:eases.inOutSine,outCubic:eases.outCubic,inOutCubic:eases.inOutCubic,
 inOutQuart:eases.inOutQuart,outQuart:eases.outQuart,inQuad:eases.inQuad,outQuad:eases.outQuad,outExpo:eases.outExpo,
 outBack:(s=1.7)=>eases.outBack(s),inBack:(s=1.7)=>eases.inBack(s),inOutBack:(s=1.7)=>eases.inOutBack(s),
};
export {E};
type Key=[number,number,EasingFunction?];
/** Pure keyframe evaluation with anime.js easing functions (used where a value is needed at several times, e.g. trails). */
export function kf(t:number,keys:Key[]){
 if(t<=keys[0][0])return keys[0][1];
 for(let i=1;i<keys.length;i++){const [t1,v1,e]=keys[i],[t0,v0]=keys[i-1];if(t<t1){const p=(t-t0)/(t1-t0);return v0+(v1-v0)*(e??E.inOutSine)(p);}}
 return keys[keys.length-1][1];
}

/* ── Packet routes: Catmull-Rom splines through the routers, arc-length parametrised ── */
type Route={pts:P[];len:number[];total:number;knots:number[];keys:Key[];launch:number;arrive:number;slot:number;passes:{router:number;at:number}[]};
function catmull(points:P[]):P[]{
 const ext=[{x:points[0].x,y:points[0].y+150},...points,{x:points[points.length-1].x,y:points[points.length-1].y+150}],out:P[]=[];
 for(let s=1;s<ext.length-2;s++){const p0=ext[s-1],p1=ext[s],p2=ext[s+1],p3=ext[s+2];
  for(let k=0;k<60;k++){const u=k/60,u2=u*u,u3=u2*u;
   out.push({x:.5*((2*p1.x)+(-p0.x+p2.x)*u+(2*p0.x-5*p1.x+4*p2.x-p3.x)*u2+(-p0.x+3*p1.x-3*p2.x+p3.x)*u3),
    y:.5*((2*p1.y)+(-p0.y+p2.y)*u+(2*p0.y-5*p1.y+4*p2.y-p3.y)*u2+(-p0.y+3*p1.y-3*p2.y+p3.y)*u3)});}}
 out.push(points[points.length-1]);return out;
}
// packet index (0-based: 0 = «1») → routers, slot, launch, router pass times, arrival. Arrival order 3,1,4,2.
const PLAN=[
 {routers:[0],slot:1,launch:8.3,pass:[9.25],arrive:10.3},
 {routers:[1,2],slot:3,launch:8.6,pass:[9.45,10.35],arrive:11.3},
 {routers:[1],slot:0,launch:8.15,pass:[8.9],arrive:9.8},
 {routers:[2],slot:2,launch:8.45,pass:[9.7],arrive:10.8},
];
// Packets slow down through a router (handoff) without a dead stop.
const eStart=(p:number)=>.55*E.inOutSine(p)+.45*E.inQuad(p);
const eMid=(p:number)=>.5*p+.5*E.inOutSine(p);
const eEnd=(p:number)=>.5*E.outQuad(p)+.5*E.inOutSine(p);
export const ROUTES:Route[]=PLAN.map((p,i)=>{
 const nodes=[{x:rowX(i),y:ROW_Y},...p.routers.map(routerNode),{x:slotX(p.slot),y:SLOT_Y}];
 const pts=catmull(nodes),len=[0];for(let k=1;k<pts.length;k++)len.push(len[k-1]+Math.hypot(pts[k].x-pts[k-1].x,pts[k].y-pts[k-1].y));
 const total=len[len.length-1];
 const knots=p.routers.map((_,r)=>len[(r+1)*60]/total);
 const keys:Key[]=[[p.launch,0],...p.pass.map((at,r)=>[at,knots[r],r===0?eStart:eMid] as Key),[p.arrive,1,eEnd]];
 return {pts,len,total,knots,keys,launch:p.launch,arrive:p.arrive,slot:p.slot,passes:p.routers.map((router,r)=>({router,at:p.pass[r]}))};
});
export function routeAt(r:Route,u:number){
 const d=clamp01(u)*r.total;let lo=0,hi=r.len.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(r.len[m]<=d)lo=m;else hi=m;}
 const seg=r.len[hi]-r.len[lo]||1,f=(d-r.len[lo])/seg,a=r.pts[lo],b=r.pts[hi];
 return {x:lerp(a.x,b.x,f),y:lerp(a.y,b.y,f),angle:Math.atan2(b.y-a.y,b.x-a.x)};
}
export const routeU=(i:number,t:number)=>kf(t,ROUTES[i].keys);
export function routePath(r:Route,from:number,to:number){
 const idx=(u:number)=>{const d=clamp01(u)*r.total;let k=0;while(k<r.len.length-1&&r.len[k]<d)k++;return k;};
 const i0=idx(from),i1=idx(to);
 if(i1<=i0)return "";
 return r.pts.slice(i0,i1+1).map((p,k)=>`${k?"L":"M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");
}
// Order after sorting: slot of each packet in the final 1..4 row.
export const FINAL_SLOT=[0,1,2,3];

/* ── The paused master timeline ── */
const FIELDS={
 camX:250,camY:1075,camZ:1.8,
 pedLap:0,lapIn:0,scr:0,type:0,curIn:0,cur:0,press:0,dots:0,
 lift:0,cut0:0,cut1:0,cut2:0,sep:0,pk0:0,pk1:0,pk2:0,pk3:0,bd0:0,bd1:0,bd2:0,bd3:0,
 r0:0,r1:0,r2:0,srv:0,net:0,pv0:0,pv1:0,pv2:0,pv3:0,
 orb:0,scan:0,re0:0,re1:0,re2:0,re3:0,merge:0,check:0,tick:0,ok:0,
};
export type State=typeof FIELDS;
const S:State={...FIELDS};
const tl=createTimeline({autoplay:false});
/** Adds consecutive tweens for one field. Each key: [seconds, value, ease into this key]. */
function track(field:keyof State,keys:[number,number,(EasingFunction|string)?][]){
 S[field]=keys[0][1];FIELDS[field]=keys[0][1];
 for(let i=1;i<keys.length;i++){const [t0,v0]=keys[i-1],[t1,v1,e]=keys[i];if(t1<=t0)continue;
  tl.add(S,{[field]:[v0,v1],duration:Math.round((t1-t0)*1000),ease:(e??"inOutSine") as EasingFunction},Math.round(t0*1000));}
}
// Camera: position leads, zoom follows (overlap), long calm drifts between moves.
track("camX",[[0,250],[4.0,250],[4.9,250,"inOutCubic"],[7.2,262],[8.5,540,"inOutQuart"],[11.1,548],[11.95,800,"inOutCubic"],[14.4,800]]);
track("camY",[[0,1075],[4.0,1072],[4.9,1000,"inOutCubic"],[7.2,1000],[8.5,820,"inOutQuart"],[11.1,812],[11.95,470,"inOutCubic"],[14.4,478,"outCubic"]]);
track("camZ",[[0,1.8],[3.95,1.87,"inOutSine"],[5.0,1.55,"inOutCubic"],[7.3,1.52],[8.7,.9,"inOutQuart"],[11.15,.93],[12.05,1.45,"inOutCubic"],[14.3,1.53,"outCubic"]]);
// Send
track("pedLap",[[0,0],[.55,1,"outCubic"]]);
track("lapIn",[[.08,0],[.8,1,"outBack(1.5)"]]);
track("scr",[[.5,0],[1.0,1,"outQuad"]]);
track("type",[[.95,0],[1.85,7,"linear"]]);
track("curIn",[[1.65,0],[1.95,1,"outCubic"],[3.0,1],[3.4,0,"inOutSine"]]);
track("cur",[[1.75,0],[1.97,-.1,"inOutSine"],[2.5,1,"outBack(1.4)"]]);
track("press",[[2.55,0],[2.63,1,"outQuad"],[2.95,0,"outBack(2.2)"]]);
track("dots",[[3.1,0],[3.4,1,"outCubic"],[3.95,1],[4.2,0,"inOutSine"]]);
// Split
track("lift",[[4.0,0],[4.2,-.12,"inOutSine"],[5.0,1,"outBack(1.5)"]]);
track("cut0",[[5.0,0],[5.36,1,"inOutCubic"]]);
track("cut1",[[5.12,0],[5.48,1,"inOutCubic"]]);
track("cut2",[[5.24,0],[5.6,1,"inOutCubic"]]);
track("sep",[[5.62,0],[6.35,1,"outBack(1.8)"]]);
(["pk0","pk1","pk2","pk3"] as const).forEach((f,i)=>track(f,[[6.15+i*.09,0],[6.7+i*.09,1,"outBack(1.6)"]]));
(["bd0","bd1","bd2","bd3"] as const).forEach((f,i)=>track(f,[[6.45+i*.11,0],[6.85+i*.11,1,"outBack(2.4)"],[13.45+i*.04,1],[13.8+i*.04,0,"inBack(1.6)"]]));
// Network grows from the scene while the camera pulls back
track("r0",[[7.0,0],[7.6,1,"outBack(1.6)"]]);
track("r1",[[7.15,0],[7.75,1,"outBack(1.6)"]]);
track("r2",[[7.3,0],[7.9,1,"outBack(1.6)"]]);
track("srv",[[7.45,0],[8.1,1,"outBack(1.4)"]]);
track("net",[[7.6,0],[8.6,1,"inOutSine"]]);
// Path previews draw just before each launch: P3, P1, P4, P2
(["pv0","pv1","pv2","pv3"] as const).forEach((f,i)=>{const l=PLAN[i].launch;track(f,[[l-.45,0],[l+.25,1,"outCubic"],[PLAN[i].arrive,1],[PLAN[i].arrive+.55,0,"inOutSine"]]);});
// Think
track("orb",[[11.3,0],[11.85,1,"outBack(1.4)"],[13.5,1],[14.0,0,"inBack(1.4)"]]);
track("scan",[[11.7,0],[12.5,4,"linear"]]);
// Join: hops staggered, with anticipation + overshoot from inOutBack
(["re0","re1","re2","re3"] as const).forEach((f,i)=>{const at=12.5+[.1,0,.06,.16][i];track(f,[[at,0],[at+.7,1,"inOutBack(1.25)"]]);});
track("merge",[[13.45,0],[14.0,1,"inOutCubic"]]);
track("check",[[13.95,0],[14.35,1,"outBack(1.9)"]]);
track("tick",[[14.08,0],[14.4,1,"outCubic"]]);
track("ok",[[13.95,0],[14.5,1,"inOutSine"]]);

/** State at time t (seconds). Reset to 0 then seek forward: identical result for any render order. */
export function stateAt(t:number):State{
 tl.seek(0,true);tl.seek(Math.max(0,t*1000),true);
 return {...S};
}
