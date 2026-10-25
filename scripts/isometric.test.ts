import {test} from "node:test";
import assert from "node:assert/strict";
import {z} from "zod";
import {
 validateIsometric,isoWorld,isoTimeline,frameScalars,FRAME_LIMIT,routePath,posAt,project,isoLayout,cameraAt,trafficAt,
 isometricSchema,isometricTexts,isoStoryEvents,isoEventTimes,MARKER_TOP,chapterAccent,type IsometricPlan,
} from "../src/lib/isometric";
import {anchorTime} from "../src/lib/scene3d";
import {writtenText} from "../src/lib/quality";
import {reviewFrames,soundCues} from "../src/lib/export-review";
import {arrangementInputFor} from "../src/lib/music-beds";
import {scriptPackageSchema} from "../src/lib/research-model";
import {SCRIPT_FILM_KINDS,storyboardSchema} from "../src/lib/model";
import {samplePlan,sampleScenes,sampleAlignment,sampleStory} from "./isometric-sample";

const scenes=sampleScenes;
const A=(scene:number,progress:number,cue="",cueOccurrence?:number)=>({scene,progress,cue,...(cueOccurrence?{cueOccurrence}:{})});
const valid=()=>validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe");
const storyboard=(iso:IsometricPlan)=>({title:sampleStory.title,summary:"",factNotes:"",filmKind:"isometric" as const,isometric:iso,scenes:scenes.map((s,i)=>({...s,id:`scene-${i+1}`,visual:"flow" as const}))});

test("a grounded isometric plan validates against measured words and the strict schema",()=>{
 const plan=valid();
 assert.equal(plan.routes.length,2);assert.equal(plan.markers.length,5);
 assert.ok(isometricSchema.safeParse(plan).success);
 assert.ok(storyboardSchema.safeParse(storyboard(plan)).success,"the storyboard carries the isometric plan");
 // The agent/Claude schema is plain JSON Schema without generated code fields.
 const schema=JSON.stringify(z.toJSONSchema(isometricSchema));
 assert.ok(!/function|script|code/i.test(schema));
});
test("the validator rejects plans the renderer cannot honour",()=>{
 const cases:[string,(p:IsometricPlan)=>void,RegExp][]=[
  ["diagonal",p=>{p.routes[0].waypoints[1]={c:2,r:0};},/диагонали/],
  ["straight-through point",p=>{p.routes[0].waypoints.splice(1,0,{c:1,r:3});p.routes[0].waypoints[0]={c:1,r:4};},/прямо или разворачивается/],
  ["short deck",p=>{p.routes[0].deckLeg=1;},/эстакада/],
  ["unknown route",p=>{p.vehicles[0].route="nope";},/неизвестному маршруту/],
  ["tower on a road",p=>{p.markers[3].route="route";},/на квартал/],
  ["ungrounded tag",p=>{p.markers[0].text="QUANTUM";},/не опирается/],
  ["ungrounded number",p=>{p.cards[0].keys[1].value=31;},/не встречается/],
  ["two cards at once",p=>{p.cards[1].enter=A(2,0,"jam");},/одновременно/],
  ["one-frame window",p=>{p.markers[2].exit=p.markers[2].enter;},/не в одном кадре/],
  ["late first camera key",p=>{p.camera[0].at=A(1,0,"plans");},/первый ключ камеры/],
  ["camera keys too close",p=>{p.camera[1].at=A(1,0,"route");p.camera.splice(2,0,{...p.camera[1],at:A(1,0,"through")});},/не меньше 1 с/],
  ["missing cue word",p=>{p.routes[0].draw=A(1,0,"teleports");},/слова «teleports» нет/],
  ["occurrence beyond the text",p=>{p.routes[0].draw=A(1,0,"plans",2);},/вхождение/],
  ["recolour before drawing",p=>{p.routes[0].traffic[0].at=A(1,0,"Maps");},/до его прорисовки/],
  ["route vanishes while drawing",p=>{p.routes[1].exit=A(2,0,"in");},/прорисоваться/],
  ["two buildings on one block",p=>{p.markers[4].bx=-1;p.markers[4].bz=0;},/один квартал/],
 ];
 for(const [name,mutate,error] of cases){const p=samplePlan();mutate(p);assert.throws(()=>validateIsometric(p,sampleStory,sampleAlignment,"tiktok-safe"),error,name);}
 // Schema bounds: perspective-breaking azimuths and zooms never reach the renderer.
 const wide=samplePlan();wide.camera[0].azimuth=80;assert.throws(()=>validateIsometric(wide,sampleStory,sampleAlignment),/azimuth|<=51|too_big/i);
});
test("isometric tags ground hyphenated script words and map pins by the same tokens",()=>{
 const story={...sampleStory,summary:"Live traffic reaches the phone like an e-mail."};
 const tag=(text:string)=>{const p=samplePlan();p.markers[0].text=text;return validateIsometric(p,story,sampleAlignment,"tiktok-safe").markers[0].text;};
 for(const t of ["e-mail","mail","START→HERE","ты-здесь"])assert.equal(tag(t),t);
 assert.throws(()=>tag("e-wallet"),/не опирается/);assert.throws(()=>tag("QUANTUM→HERE"),/не опирается/);
});
test("anchors resolve to measured words, cueOccurrence picks the repeated word and progress is the fallback",()=>{
 const clock=scenes;
 const w=sampleAlignment[2].words;
 const towers=w.filter(x=>x.text.replace(/[^a-z]/gi,"")==="towers");
 assert.equal(anchorTime(A(3,0,"towers"),clock,sampleAlignment),towers[0].start,"punctuation is ignored: «towers,» is the first occurrence");
 const second=towers[1];
 assert.ok(second,"the sample repeats «towers»");
 assert.equal(anchorTime(A(3,0,"towers",2),clock,sampleAlignment),second.start);
 assert.equal(anchorTime(A(2,.5),clock,sampleAlignment),5+3);
 const tl=isoTimeline(valid(),isoWorld(valid()),scenes,sampleAlignment);
 const jam=sampleAlignment[1].words.find(x=>x.text==="jam")!.start;
 assert.equal(tl.routes[0].zones.find(z=>z.state==="jam")!.at,jam,"the jam recolours on the word «jam»");
 assert.equal(trafficAt(tl.routes[0].zones,tl.routes[0].path.L*.53,jam-.01).p,0,"nothing turns pink before the word");
 assert.ok(trafficAt(tl.routes[0].zones,tl.routes[0].path.L*.53,jam+2.6).p>.9,"the jam is pink once its wave has passed");
});
test("occlusion guard: no building hides a route, deck or marker point from any camera azimuth of the plan",()=>{
 for(const skyline of ["mixed","tall"] as const){
  const p=valid();p.city.skyline=skyline;
  const world=isoWorld(p);
  assert.ok(world.buildings.length>200,"a dense city surrounds the story");
  if(skyline==="tall")assert.ok(world.capped>0,"the guard capped buildings in a tall skyline");
  const azimuths=p.camera.map(c=>c.azimuth*Math.PI/180);
  const targets=world.guard.points;
  let checked=0;
  for(const b of world.buildings){
   const top=.06+b.h,x0=b.x-b.w/2,x1=b.x+b.w/2,z0=b.z-b.d/2,z1=b.z+b.d/2;
   for(const az of azimuths){const dx=Math.SQRT2*Math.sin(az),dz=Math.SQRT2*Math.cos(az);
    for(const q of targets){
     if(Math.hypot(q[0]-b.x,q[2]-b.z)>12||q[1]>=top)continue;
     const tx=[(x0-q[0])/dx,(x1-q[0])/dx],tz=[(z0-q[2])/dz,(z1-q[2])/dz];
     const lo=Math.max(0,Math.min(...tx),Math.min(...tz)),hi=Math.min(Math.max(...tx),Math.max(...tz));
     checked++;
     assert.ok(!(lo<=hi&&q[1]+lo<top),`building at ${b.x.toFixed(1)},${b.z.toFixed(1)} (top ${top.toFixed(2)}) hides ${q.map(v=>v.toFixed(2)).join(",")} at azimuth ${(az*180/Math.PI).toFixed(0)}°`);
    }}
  }
  assert.ok(checked>1000,"the guard was exercised");
 }
 // The guard points include the deck heights and every marker column.
 const w=isoWorld(valid());
 assert.ok(w.guard.points.some(q=>q[1]>1),"deck points are guarded at their height");
 const tower=valid().markers.find(m=>m.kind==="tower")!;
 assert.ok(w.guard.points.some(q=>q[0]===4*tower.bx&&q[2]===4*tower.bz&&q[1]>=MARKER_TOP.tower-.25));
});
test("MOTION-RULES: no visible state, object or text switches within one frame",()=>{
 const plan=valid(),world=isoWorld(plan),tl=isoTimeline(plan,world,scenes,sampleAlignment);
 let prev=frameScalars(tl,world,0),worst={v:0,p:0},spans=new Map<string,{from:number;to:number}>();
 for(let f=1;f<tl.frames;f++){
  const cur=frameScalars(tl,world,f/30);
  for(const k of Object.keys(cur)){
   const d=Math.abs(cur[k]-(prev[k]??cur[k])),c=k[0] as "v"|"p";worst[c]=Math.max(worst[c],d);
   assert.ok(d<=FRAME_LIMIT[c]+1e-9,`${k} jumps ${d.toFixed(3)} at frame ${f}`);
   if(c==="v"&&!k.includes(":rise:")&&!k.includes(":car:")){const s=spans.get(k);if((prev[k]??0)<.02&&cur[k]>=.02)spans.set(k,{from:f-1,to:Infinity});else if(s&&s.to===Infinity&&cur[k]>=.98)s.to=f;}
  }
  prev=cur;
 }
 // Every entrance that completes takes at least 0.1 s (3 frames).
 for(const [k,s] of spans)if(s.to!==Infinity)assert.ok(s.to-s.from>=3,`${k} enters in ${s.to-s.from} frames`);
 assert.ok(worst.v>0&&worst.p>0,"the sample actually changes");
 // The header's current-chapter accent crossfades at every boundary (frame review 2026-10-21 caught a one-frame swap).
 for(let f=1;f<tl.frames;f++)assert.ok(Math.abs(chapterAccent(f/30,5,11)-chapterAccent((f-1)/30,5,11))<=FRAME_LIMIT.v);
 // A recolour starts on its word: the zone's first stretch is visibly tinted within 0.35 s.
 const jamZone=tl.routes[0].zones.find(z=>z.state==="jam")!;
 assert.ok(trafficAt(tl.routes[0].zones,jamZone.from+.3,jamZone.at+.35).p>.05,"the jam colour starts right after its word");
 // Background cars shrink in and out at lane ends that lie outside every camera view.
 for(const car of world.cars)for(const end of [car.min,car.min+car.len]){
  const p=car.axis==="x"?[end,0,car.c]:[car.c,0,end];
  for(const key of tl.camera){const s=project(p,key.pose);assert.ok(s.x<0||s.x>1080||s.y<0||s.y>1920,"a lane end is visible");}
 }
});
test("framing: what appears sits inside the focus area; the solver moves camera keys when needed",()=>{
 const raw=samplePlan();raw.camera[0]={...raw.camera[0],x:-20,z:-20};
 const plan=validateIsometric(raw,sampleStory,sampleAlignment,"tiktok-safe");
 assert.match(plan.notes.join(" "),/Кадрирование/);
 const F=isoLayout("tiktok-safe").focus,tl=isoTimeline(plan,isoWorld(plan),scenes,sampleAlignment);
 const now=tl.markers.find(m=>m.id==="now")!,pose=tl.camera.filter(k=>k.at<=now.enterAt+1).at(-1)!.pose,s=project(now.point,pose);
 assert.ok(s.x>=F.left&&s.x<=F.right&&s.y>=F.top&&s.y<=F.bottom,"the NOW pin is framed when it appears");
 assert.equal(F.top,isoLayout("tiktok-safe").card+124+50,"the focus area starts below the screen card");
 // Overlay v2 (no chapter bars, no chapter label): the card sits under the title and the focus reaches the captions.
 const v2=isoLayout("tiktok-safe",2);
 assert.equal(v2.chrome,false);assert.equal(v2.card,v2.title+54);assert.equal(v2.focus.bottom,v2.captions-44);
 assert.ok(v2.focus.top<F.top&&v2.focus.bottom>F.bottom,"the clean overlay gives the city more room");
 assert.ok(validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe",2));
 // Overlay v3 (2026-10-22, no header): the card takes the old header row, labels may rise to it, captions are unchanged.
 const v3=isoLayout("tiktok-safe",3);
 assert.equal(v3.bare,true);assert.equal(v3.card,v3.header);assert.equal(v3.labelsTop,v3.header);assert.equal(v3.focus.bottom,v2.focus.bottom);
 assert.ok(v3.focus.top<v2.focus.top,"without the header the city gets the freed rows");
 assert.equal(v2.labelsTop,v2.title+46);assert.equal(isoLayout("tiktok-safe").labelsTop,isoLayout("tiktok-safe").progress+24,"old overlays keep their label bounds");
 assert.ok(validateIsometric(samplePlan(),sampleStory,sampleAlignment,"tiktok-safe",3));
 // A story too wide for any zoom is refused with coordinates, not rendered off-frame.
 const far=samplePlan();far.markers[3].bx=-7;far.markers[3].bz=7;far.markers[4].bx=7;far.markers[4].bz=-7;far.markers[4].enter=far.markers[3].enter;far.links=[];
 assert.throws(()=>validateIsometric(far,sampleStory,sampleAlignment,"tiktok-safe"),/вне безопасной зоны/);
});
test("routes follow streets, climb the deck smoothly and the camera eases between keys",()=>{
 const r=routePath(samplePlan().routes[0]);
 assert.ok(r.deck&&r.deck.to>r.deck.from);
 for(let s=0;s<r.L;s+=.05){const a=posAt(r,s),b=posAt(r,s+.05);assert.ok(Math.abs(a[1]-b[1])<=.0501,"no step on the deck ramp");}
 const keys=[{at:0,pose:{x:0,z:0,zoom:44,az:39}},{at:3,pose:{x:12,z:-6,zoom:56,az:47}}];
 for(let t=0;t<6;t+=1/30){const a=cameraAt(t,keys),b=cameraAt(t+1/30,keys);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1&&Math.abs(a.zoom-b.zoom)<1.5&&Math.abs(a.az-b.az)<.5);}
});
test("screen texts join the independent audit; sound, music and review frames follow the plan",()=>{
 const iso=valid(),plan=storyboard(iso) as any;
 assert.deepEqual(isometricTexts(iso).slice(0,2),["NOW","arrive"]);
 assert.match(writtenText(plan),/data center/);
 const tl=isoTimeline(iso,isoWorld(iso),scenes,sampleAlignment);
 const story=isoStoryEvents(tl);
 assert.ok(story.some(e=>e.kind==="zone"&&e.tone==="warn")&&story.some(e=>e.kind==="zone"&&e.tone==="ok"),"jam → warn, cleared → ok");
 const music=arrangementInputFor(plan,sampleAlignment);
 assert.ok(music.callouts.some(c=>c.tone==="warn")&&music.callouts.some(c=>c.tone==="ok"));
 const sheet=soundCues(plan,sampleAlignment);
 const kinds=new Set(sheet.cues.map((c:any)=>c.kind));
 assert.ok(kinds.has("object-enter")&&kinds.has("highlight")&&sheet.cues.length>=4,[...kinds].join(","));
 const moments=[...story.map(e=>e.at),...tl.camera.map(k=>k.at)];
 for(const c of sheet.cues)assert.ok(moments.some(m=>Math.abs(m-c.at)<=1/30+1e-6),`cue at ${c.at} sits on a planned picture event`);
 for(const [i,c] of sheet.cues.entries())for(const d of sheet.cues.slice(i+1))if(d.effect===c.effect)assert.ok(Math.abs(d.at-c.at)>=3-1e-6,"same sound at most every 3 s");
 const frames=reviewFrames(plan,sampleAlignment);
 for(const t of isoEventTimes(tl))assert.ok(frames.eventTimes.some(e=>Math.abs(e-t)<1e-9),`review samples the event at ${t}`);
});
test("the script role's JSON schema is byte-identical: the isometric plan is applied by the project, not the script",()=>{
 const schema=z.toJSONSchema(scriptPackageSchema) as any;
 assert.ok(!("isometric" in schema.properties.plan.properties));
 assert.deepEqual(schema.properties.plan.properties.filmKind.enum,[...SCRIPT_FILM_KINDS]);
 // Nothing of isometric/v1 reaches the script prompt (its hash was verified unchanged when isometric was added;
 // other catalogs, e.g. illustrated kinds, still change it legitimately).
 assert.ok(!/isometric/.test(JSON.stringify(schema)),"no isometric field or film kind in the script schema");
});
