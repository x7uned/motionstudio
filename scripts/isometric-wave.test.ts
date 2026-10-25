// isometric/v1 · ring road with backward braking waves (src/lib/isometric-wave.ts, renderer/IsometricWave.tsx).
import {test} from "node:test";
import assert from "node:assert/strict";
import {z} from "zod";
import {
 validateIsometric,isoWorld,isoTimeline,frameScalars,FRAME_LIMIT,isometricSchema,isometricTexts,isoStoryEvents,isoEventTimes,project,isoLayout,
 type IsometricPlan,
} from "../src/lib/isometric";
import {
 ringPath,ringPos,ringTimeline,ringCarState,ringSigma,ringDrawn,waveAt,wrapDelta,RING,MIN_GAP,ringGuardPoints,type RingPlan,
} from "../src/lib/isometric-wave";
import {anchorTime} from "../src/lib/scene3d";
import {reviewFrames,soundCues} from "../src/lib/export-review";
import {samplePlan,sampleStory,sampleAlignment} from "./isometric-sample";

const A=(scene:number,progress:number,cue="")=>({scene,progress,cue});
const scenes=[
 {seconds:8,title:"The ring",subtitle:"",items:["22 cars"],narration:"Twenty-two cars drive evenly around a ring with no obstacle anywhere at all today."},
 {seconds:10,title:"The wave",subtitle:"",items:["40 km/h"],narration:"One driver eased off a little, the driver behind braked harder, and several cars stopped dead in a jam."},
 {seconds:10,title:"Backward",subtitle:"",items:["20 km/h"],narration:"The jam moved backward against the traffic while you pass through it, front pulled away."},
 {seconds:8,title:"Smooth",subtitle:"",items:["one computer car"],narration:"Then one computer car smoothed its speed and the waves faded for everyone on the ring."},
];
const alignment=(()=>{let start=0;return scenes.map((s,i)=>{const list=s.narration.split(" ").map((w,k)=>({text:w,start:start+.25+k*.42,end:start+.6+k*.42}));const out={scene:i+1,start:list[0].start,end:list.at(-1)!.end,sceneEnd:start+s.seconds,speed:1,text:s.narration,words:list};start+=s.seconds;return out;});})();
const story={title:"The jam with no cause",summary:"",scenes};
const ring=():RingPlan=>({id:"ring",c0:-2,r0:-2,c1:1,r1:1,dir:"cw",cars:22,draw:A(1,0),fill:A(1,0),go:A(1,0,"drive"),exit:null,
 waves:[
  {at:A(2,0,"eased"),car:8,grow:A(2,0,"stopped"),fade:A(4,0,"smoothed"),length:3.5,label:{text:"jam",enter:A(2,0,"jam"),exit:A(4,0,"Then")}},
 ],
 tags:[
  {car:8,role:"starter",text:"ONE DRIVER",enter:A(2,0,"One"),exit:A(2,0,"several")},
  {car:3,role:"hero",text:"YOU",enter:A(3,0,"you"),exit:A(3,0,"pulled")},
  {car:15,role:"auto",text:"COMPUTER CAR",enter:A(4,0,"computer"),exit:null},
 ]});
const plan=():IsometricPlan=>({version:1,concept:"A ring of cars: one slight brake grows into a jam that travels backward; one smooth car calms it.",
 city:{seed:2208,skyline:"mixed",parks:.18,traffic:.35},routes:[],vehicles:[],markers:[],districts:[],links:[],
 cards:[{id:"cars",label:"cars",unit:"",icon:"car",route:"",enter:A(1,0,"Twenty-two"),exit:A(1,0,"today."),keys:[{at:A(1,0,"Twenty-two"),value:22,tone:"number",note:""}]}],
 camera:[{at:A(1,0),x:0,z:0,zoom:38,azimuth:45},{at:A(2,0,"One"),x:-3,z:1,zoom:50,azimuth:46},{at:A(3,0,"jam"),x:2,z:3,zoom:52,azimuth:45},{at:A(4,0,"Then"),x:0,z:0,zoom:38,azimuth:45}],
 notes:["Условный город, не масштаб."],rings:[ring()]});
const valid=()=>validateIsometric(plan(),story,alignment,"tiktok-safe",2);
const total=scenes.reduce((n,s)=>n+s.seconds,0),at=(a:any)=>anchorTime(a,scenes,alignment);

test("a ring plan validates; old plans without rings keep working and the director schema stays plain JSON",()=>{
 const p=valid();
 assert.equal(p.rings!.length,1);
 assert.ok(isometricSchema.safeParse(p).success);
 const old=validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe");
 assert.equal(old.rings,undefined,"a plan without rings stays without rings");
 const tl=isoTimeline(old,isoWorld(old),sampleStory.scenes,sampleAlignment);
 assert.deepEqual(tl.rings,[]);
 const schema=JSON.stringify(z.toJSONSchema(isometricSchema));
 assert.ok(/"rings"/.test(schema)&&!/function|script|code/i.test(schema));
});
test("the ring is closed, follows the streets and the seam lies on a straight side",()=>{
 const path=ringPath(ring());
 assert.ok(Math.abs(path.L-46.64)<.1,`length ${path.L}`);
 const a=ringPos(path,0),b=ringPos(path,path.L);
 assert.ok(Math.hypot(a[0]-b[0],a[2]-b[2])<1e-9,"closed loop");
 for(let s=0;s<path.L;s+=.05){const p=ringPos(path,s),q=ringPos(path,s+.05);assert.ok(Math.hypot(p[0]-q[0],p[2]-q[2])<=.0501,"no jumps along the ring, also across the seam");}
 for(let s=0;s<path.L;s+=.25){const p=ringPos(path,s);const onX=[-6,6].some(x=>Math.abs(p[0]-x)<1e-6),onZ=[-6,6].some(z=>Math.abs(p[2]-z)<1e-6);
  assert.ok(onX||onZ||Math.min(...[[-6,-6],[6,-6],[6,6],[-6,6]].map(([x,z])=>Math.hypot(p[0]-x,p[2]-z)))<1,"on a street or in a rounded corner");}
 assert.equal(wrapDelta(path.L-1,path.L),-1);
});
test("physics of the phantom jam: amplification, a wave that runs backward, cars that pass through it, no overtaking",()=>{
 const [r]=ringTimeline([ring()],at,total),L=r.path.L,w=r.waves[0];
 // Order and spacing: no car ever overtakes or touches the one ahead.
 assert.ok(r.minGap.gap>=MIN_GAP,`min gap ${r.minGap.gap}`);
 for(let f=0;f<r.frames;f+=3)for(let i=0;i<r.N;i++){const ahead=i===r.N-1?r.X[0][f]+L:r.X[i+1][f];assert.ok(ahead-r.X[i][f]>=MIN_GAP-1e-9);}
 // Before the wave everybody rolls at the same speed, evenly spaced.
 const f0=Math.round((w.at-.5)*30);for(let i=0;i<r.N;i++)assert.ok(Math.abs(r.Vel[i][f0]-RING.speed)<1e-6);
 // The wave starts at the car that eases off, with a small amplitude, and grows to a full stop on its word.
 assert.ok(Math.abs(wrapDelta(w.center0-r.X[w.car][Math.round(w.at*30)],L))<.2);
 assert.ok(waveAt(w,w.at+.6).A<=RING.seed+.05&&waveAt(w,w.growAt).A>.99);
 // Amplification: each following car (backward from the starter) brakes harder than the one ahead of it.
 const minSpeed=(i:number)=>{let m=Infinity;for(let f=Math.round(w.at*30);f<Math.round(w.growAt*30);f++)m=Math.min(m,r.Vel[i][f]);return m;};
 const behind=[1,2,3,4].map(k=>(w.car-k+r.N)%r.N).map(minSpeed);
 assert.ok(minSpeed(w.car)>behind[0]-1e-9&&behind.every((v,k)=>!k||v<=behind[k-1]+1e-9),`speeds ${[minSpeed(w.car),...behind].map(v=>v.toFixed(2))}`);
 assert.ok(minSpeed(w.car)>RING.speed*.55,"the first driver only eases off a little");
 // After the full stop the wave travels backward against the traffic at RING.wave.
 const c1=waveAt(w,w.growAt+1).center,c2=waveAt(w,w.growAt+3).center;assert.ok(Math.abs((c1-c2)/2-RING.wave)<1e-9);
 assert.ok(RING.wave===RING.speed/2,"about forty vs roughly twenty: the jam moves at half the cars' speed");
 // Cars enter at the back and leave at the front: stop intervals start later for every next car behind.
 const stops=(i:number)=>{const out:number[]=[];for(let f=Math.round(w.growAt*30);f<Math.round((w.fadeAt)*30);f++)if(r.Vel[i][f]<.05&&(f===0||r.Vel[i][f-1]>=.05))out.push(f/30);return out;};
 const firsts=Array.from({length:6},(_,k)=>stops((w.car-3-k+r.N*3)%r.N)[0]).filter(v=>v!==undefined);
 assert.ok(firsts.length>=4);for(let k=1;k<firsts.length;k++)assert.ok(firsts[k]>firsts[k-1],"the next car behind stops later");
 for(const i of [0,5,11]){const s=stops(i);if(s.length){const f=Math.round((s[0]+4)*30);assert.ok(r.Vel[i][f]>RING.speed*.5,"a stopped car drives on once the wave has passed");}}
 // σ is pink (≈1) inside the plateau and free far from it.
 const mid=waveAt(w,w.growAt+1);assert.ok(ringSigma(r.waves,L,mid.center,w.growAt+1)>.99);assert.ok(ringSigma(r.waves,L,mid.center+L/2,w.growAt+1)<.01);
 // After the fade the gaps even out again.
 const end=r.frames-1,gaps=Array.from({length:r.N},(_,i)=>(i===r.N-1?r.X[0][end]+L:r.X[i+1][end])-r.X[i][end]);
 assert.ok(Math.max(...gaps)-Math.min(...gaps)<.8,`gaps ${Math.min(...gaps).toFixed(2)}..${Math.max(...gaps).toFixed(2)}`);
});
test("MOTION-RULES: ring cars, brake lights, lane colour, tags and labels never change within one frame",()=>{
 const p=valid(),world=isoWorld(p),tl=isoTimeline(p,world,scenes,alignment);
 let prev=frameScalars(tl,world,0),seen=0,spans=new Map<string,{from:number;to:number}>();
 for(let f=1;f<tl.frames;f++){
  const cur=frameScalars(tl,world,f/30);
  for(const k of Object.keys(cur)){
   if(!k.includes(":ring:"))continue;seen++;
   const d=Math.abs(cur[k]-(prev[k]??cur[k])),c=k[0] as "v"|"p";
   assert.ok(d<=FRAME_LIMIT[c]+1e-9,`${k} jumps ${d.toFixed(3)} at frame ${f}`);
   if(c==="v"){const s=spans.get(k);if((prev[k]??0)<.02&&cur[k]>=.02)spans.set(k,{from:f-1,to:Infinity});else if(s&&s.to===Infinity&&cur[k]>=.98)s.to=f;}
  }
  prev=cur;
 }
 assert.ok(seen>1000);
 for(const [k,s] of spans)if(s.to!==Infinity)assert.ok(s.to-s.from>=3,`${k} enters in ${s.to-s.from} frames`);
 // Every car appears on an already drawn piece of road.
 const r=tl.rings[0];for(let i=0;i<r.N;i++){const t=r.appear[i];assert.ok(Number.isFinite(t)&&t>=r.drawAt);const s=ringCarState(r,i,t).s;assert.ok(ringDrawn(r,t)>=Math.min(r.path.L-1e-6,s+.3)-1e-9,`car ${i} appears on undrawn road`);}
});
test("the validator rejects rings the renderer cannot honour",()=>{
 const cases:[string,(p:IsometricPlan)=>void,RegExp][]=[
  ["tiny ring",p=>{p.rings![0].c1=-1;},/двух кварталов/],
  ["car out of range",p=>{p.rings![0].waves[0].car=23;},/машин на кольце/],
  ["instant full stop",p=>{p.rings![0].waves[0].grow=A(2,0,"off");},/1,2–15 с/],
  ["wave before the cars roll",p=>{p.rings![0].waves[0].at=A(1,0,"Twenty-two");},/тронулись/],
  ["cars before the road",p=>{p.rings![0].fill=A(1,0,"drive");p.rings![0].draw=A(1,0,"ring");},/раньше прорисовки/],
  ["ungrounded tag",p=>{p.rings![0].tags[0].text="ROBOT";},/не опирается/],
  ["ungrounded wave label",p=>{p.rings![0].waves[0].label!.text="GRIDLOCK";},/не опирается/],
  ["label over a vanished wave",p=>{p.rings![0].waves[0].fade=A(3,0,"jam");p.rings![0].waves[0].label!.exit=null;},/погасшей волной/],
  ["crowded ring",p=>{p.rings![0].cars=24;p.rings![0].waves[0].length=6;p.rings![0].waves.push({...p.rings![0].waves[0],car:2,label:null});},/сближаются/],
  ["duplicate id",p=>{p.cards[0].id="ring";},/повторяется/],
 ];
 for(const [name,mutate,error] of cases){const p=plan();mutate(p);assert.throws(()=>validateIsometric(p,story,alignment,"tiktok-safe",2),error,name);}
});
test("framing, occlusion guard, background traffic, texts, sound and review frames include the ring",()=>{
 const p=valid(),world=isoWorld(p),tl=isoTimeline(p,world,scenes,alignment),F=isoLayout("tiktok-safe",2).focus;
 // The starter's tag is framed when it appears.
 const g=tl.rings[0].tags[0],key=tl.camera.filter(k=>k.at<=g.enterAt+.5).at(-1)!.pose,c=ringCarState(tl.rings[0],g.car,g.enterAt+.5),q=project(ringPos(tl.rings[0].path,c.s),key);
 assert.ok(q.x>=F.left&&q.x<=F.right&&q.y>=F.top&&q.y<=F.bottom);
 // The guard protects the ring at road and car-roof height; no background lane runs on a ring street.
 const guard=ringGuardPoints(p.rings);assert.ok(guard.length>400);
 assert.equal(world.guard.points.length,guard.length,"this plan has no routes or markers: the guard is exactly the ring");
 assert.ok(guard.some(pt=>pt[1]>.25),"car-roof height is guarded too");
 for(const car of world.cars)assert.ok(!([-6,6].includes(car.c)),"background cars avoid the ring streets");
 // Tags and labels join the independent on-screen text audit.
 assert.deepEqual(isometricTexts(p).filter(t=>["jam","ONE DRIVER","YOU","COMPUTER CAR"].includes(t)).sort(),["COMPUTER CAR","ONE DRIVER","YOU","jam"]);
 const ev=isoStoryEvents(tl);
 assert.ok(ev.some(e=>e.kind==="zone"&&e.tone==="warn"&&Math.abs(e.at-tl.rings[0].waves[0].growAt)<1e-9),"the full stop warns");
 assert.ok(ev.some(e=>e.kind==="zone"&&e.tone==="ok"&&Math.abs(e.at-tl.rings[0].waves[0].fadeAt)<1e-9),"the fade resolves");
 const sb={title:story.title,summary:"",factNotes:"",filmKind:"isometric" as const,isometric:p,scenes:scenes.map((s,i)=>({...s,id:`scene-${i+1}`,visual:"flow" as const}))} as any;
 const frames=reviewFrames(sb,alignment);
 for(const t of isoEventTimes(tl))assert.ok(frames.eventTimes.some((e:number)=>Math.abs(e-t)<1e-9),`review samples ${t}`);
 const sheet=soundCues(sb,alignment);
 assert.ok(sheet.cues.some((c:any)=>Math.abs(c.at-tl.rings[0].drawAt)<.05||c.kind==="connect"||c.kind==="highlight"));
});
