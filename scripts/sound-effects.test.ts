import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {SoundLibrary,rankedResults,isPublicAddress,publicAudioURL,validEffectWav,effectForCue} from "../src/lib/sound-effects";
function wav(seconds=.2,amplitude=8000){
  const n=Math.round(48000*seconds),b=Buffer.alloc(44+n*2);
  b.write("RIFF");b.writeUInt32LE(b.length-8,4);b.write("WAVEfmt ",8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(48000,24);b.writeUInt32LE(96000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++)b.writeInt16LE(Math.round(amplitude*Math.sin(2*Math.PI*600*i/48000)),44+i*2);return b;
}
const attribution='  "Servo" by Автор\r\nlicensed <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>.  ';
const result={id:"servo-1",title:"Servo motor",url:"https://cdn.freesound.org/servo.wav",license:"cc0",source:"freesound",duration:200,attribution,tags:[{name:"mechanical"}]};
async function fixture(){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"openverse-test-")),db=new DatabaseSync(path.join(root,"studio.sqlite"));
  return {root,db,cleanup:async()=>{db.close();await fs.rm(root,{recursive:true,force:true});}};
}
test("Openverse: one persistent reservation across concurrent workers, exact filters and raw credits",async()=>{
  const f=await fixture();let searches=0,downloads=0;
  const options={search:async(url:string)=>{searches++;const u=new URL(url);assert.equal(u.searchParams.get("license"),"cc0,by,pdm");assert.equal(u.searchParams.get("source"),"freesound,jamendo");assert.equal(u.searchParams.get("page"),"1");await new Promise(r=>setTimeout(r,10));return {results:[result]};},
    download:async(_url:string,file:string)=>{downloads++;await fs.writeFile(file,wav());},convert:async(source:string,file:string)=>{await fs.copyFile(source,file);}};
  try{
    const a=new SoundLibrary(f.root,f.db,options),b=new SoundLibrary(f.root,f.db,options);
    const concurrent=await Promise.all([a.resolve("servo-motor"),b.resolve("servo-motor")]);
    const first=concurrent.find(r=>r.asset)!;assert.ok(first?.asset,JSON.stringify(concurrent));
    assert.ok(concurrent.some(r=>r.reason==="cached-reserved"));assert.equal(searches,1);assert.equal(downloads,1);
    const afterRestart=await new SoundLibrary(f.root,f.db,options).resolve("servo-motor");assert.equal(afterRestart.reason,"local");assert.equal(searches,1);assert.equal(downloads,1);
    assert.equal(await fs.readFile(path.join(f.root,"credits.txt"),"utf8"),attribution+"\n");
    const dir=path.join(f.root,"project");await fs.mkdir(dir);
    const sheet={version:2,clock:"speech",cues:[{at:1,gain:.008,kind:"assembly-cutaway"},{at:2,gain:.008,kind:"assembly-cutaway"}]};
    const prepared=await a.prepare(sheet,dir);assert.equal(prepared.cues[0].at,1);assert.equal(prepared.cues[0].gain,.008);assert.ok(prepared.cues[0].file?.startsWith("sfx/"));
    assert.equal(await fs.readFile(path.join(dir,"credits.txt"),"utf8"),attribution+"\n");
    await fs.rm(path.join(f.root,first.asset!.file));await a.prepare(sheet,dir);
    assert.equal(searches,1);assert.equal(downloads,1,"project snapshot wins even if global cache is missing");
    const manifest=JSON.parse(await fs.readFile(path.join(dir,"sound-assets.json"),"utf8"));assert.equal(manifest.resolutions["servo-motor"],"project-snapshot");
  }finally{await f.cleanup();}
});
test("Openverse: empty, malformed, failed and interrupted searches never automatically repeat",async()=>{
  for(const response of [{results:[]},{broken:true},new Error("Openverse HTTP 429")]){
    const f=await fixture();let count=0;
    try{const options={search:async()=>{count++;if(response instanceof Error)throw response;return response;}};
      await new SoundLibrary(f.root,f.db,options).resolve("servo-motor");await new SoundLibrary(f.root,f.db,options).resolve("servo-motor");assert.equal(count,1);
      if(response instanceof Error){await new SoundLibrary(f.root,f.db,options).resolve("air-release");assert.equal(count,1,"429 stops other types for the UTC day");}
    }finally{await f.cleanup();}
  }
});
test("Openverse: local semantic catalog and existing procedural sounds make zero requests",async()=>{
  const f=await fixture();try{
    await fs.mkdir(path.join(f.root,"sfx"));await fs.writeFile(path.join(f.root,"sfx/local.wav"),wav());
    await fs.writeFile(path.join(f.root,"sfx/catalog.json"),JSON.stringify({effects:[{type:"servo-motor",file:"sfx/local.wav",license:"original",attribution:"Original project effect"}]}));
    const lib=new SoundLibrary(f.root,f.db,{search:async()=>{throw new Error("must not search");}});
    assert.equal((await lib.resolve("servo-motor")).reason,"local");assert.equal((await lib.resolve("ui-reveal")).reason,"existing-procedural");assert.equal(lib.status().searches.length,0);
  }finally{await f.cleanup();}
});
test("Openverse: reject forbidden licenses/providers, missing attribution, speech, oversized or unrelated audio",()=>{
  for(const invalid of [{license:"by-nc"},{license:"by-sa"},{source:"wikimedia_audio"},{attribution:null},{attribution:" "},{duration:30001},{filesize:21*1024*1024},{title:"Servo motor singing"},{title:"Birdsong",tags:[]},{url:"http://example.com/sound.wav"}])assert.equal(rankedResults("servo-motor",{results:[{...result,...invalid}]}).length,0,JSON.stringify(invalid));
  assert.equal(rankedResults("servo-motor",{results:[result]}).length,1);
  assert.equal(effectForCue("assembly-thrust"),"air-release");assert.equal(effectForCue("rollback"),"rewind");
});
test("Openverse: a failed download is retained without spending another search or retrying",async()=>{
  const f=await fixture();let count=0,downloads=0;
  try{const lib=new SoundLibrary(f.root,f.db,{search:async()=>{count++;return {results:[result]};},download:async()=>{downloads++;throw new Error("unavailable");}});
    assert.match((await lib.resolve("servo-motor")).reason,/download-unavailable/);assert.equal((await lib.resolve("servo-motor")).reason,"cached-download-error");assert.equal(count,1);assert.equal(downloads,1);
    await assert.rejects(fs.access(path.join(f.root,"credits.txt")));
  }finally{await f.cleanup();}
});
test("Openverse: persisted 200/day ceiling and HTTPS/private-network guard",async()=>{
  const f=await fixture();try{
    const lib=new SoundLibrary(f.root,f.db,{now:()=>new Date("2026-10-18T12:00:00Z"),search:async()=>{throw new Error("must not search");}});
    for(let i=0;i<200;i++)f.db.prepare("INSERT INTO sound_searches(type,day,created,status,request) VALUES(?,'2026-10-18','','empty','')").run(`type-${i}`);
    assert.equal((await lib.resolve("servo-motor")).reason,"search-in-progress-or-daily-limit");
    for(const ip of ["127.0.0.1","10.0.0.2","169.254.169.254","172.16.0.1","192.168.1.1","100.64.0.1","::1","::ffff:127.0.0.1","fc00::1","2001:db8::1"])assert.equal(isPublicAddress(ip),false,ip);
    assert.equal(isPublicAddress("1.1.1.1"),true);
    for(const url of ["file:///etc/passwd","http://example.com/a","https://localhost.local/a","https://127.0.0.1/a","https://user:pass@example.com/a"])await assert.rejects(publicAudioURL(url));
  }finally{await f.cleanup();}
});
test("mix integration: snapshot hash, cue clock, low gain and continuous narration master are preserved without TTS",async()=>{
  const f=await fixture();try{
    const master=wav(2,2000),sample=wav(.3,10000),sha256=createHash("sha256").update(sample).digest("hex");
    assert.equal(validEffectWav(sample),true);assert.equal(validEffectWav(Buffer.from("not audio")),false);
    await fs.mkdir(path.join(f.root,"sfx"));await fs.writeFile(path.join(f.root,"sfx/effect.wav"),sample);await fs.writeFile(path.join(f.root,"narration.wav"),master);
    await fs.writeFile(path.join(f.root,"storyboard.json"),JSON.stringify({scenes:[{seconds:2}]}));
    await fs.writeFile(path.join(f.root,"sound-cues.json"),JSON.stringify({cues:[{at:1,gain:.008,file:"sfx/effect.wav",sha256}]}));
    execFileSync("/usr/bin/python3",[path.resolve("scripts/remix.py"),f.root,path.resolve("bin/ffmpeg")],{stdio:"pipe",timeout:30000});
    assert.deepEqual(await fs.readFile(path.join(f.root,"narration.wav")),master,"master bytes never change");
    const mixed=await fs.readFile(path.join(f.root,"premix.wav"));assert.equal(mixed.length,master.length);
    // The test tone is phase aligned with the narration; only the chosen event window changes.
    const at=(n:number)=>mixed.readInt16LE(44+n*2)-master.readInt16LE(44+n*2);
    let before=0,during=0;for(let n=24000;n<36000;n++)before=Math.max(before,Math.abs(at(n)));for(let n=50000;n<60000;n++)during=Math.max(during,Math.abs(at(n)));
    assert.ok(during>before,"the new accent lands at the cue");assert.ok(during<700,"effect stays at supporting gain");
  }finally{await f.cleanup();}
});

test('fan selection prefers the actual start of a fan over a shorter unrelated console startup',()=>{
 const real={...result,id:'real-fan',title:'Fan Start and Stop',duration:14730,tags:[{name:'electric'},{name:'fan'},{name:'motor'}]};
 const consoleBoot={...result,id:'console',title:'Xbox 360 Startup',duration:8000,tags:[{name:'electrical'}]};
 assert.equal(rankedResults('fan-start',{results:[consoleBoot,real]})[0]?.id,'real-fan');assert.equal(rankedResults('fan-start',{results:[consoleBoot]}).length,0);
});

test('calibrated mix makes a quiet high-crest recording audible and creates an audible outro whoosh without changing voice',async()=>{
 const f=await fixture();try{
  const master=wav(2,2000),quiet=wav(.6,60);quiet.writeInt16LE(12000,44+100*2);const sha256=createHash('sha256').update(quiet).digest('hex');
  await fs.mkdir(path.join(f.root,'sfx'));await fs.writeFile(path.join(f.root,'sfx/quiet.wav'),quiet);await fs.writeFile(path.join(f.root,'narration.wav'),master);
  await fs.writeFile(path.join(f.root,'storyboard.json'),JSON.stringify({scenes:[{seconds:2}]}));
  await fs.writeFile(path.join(f.root,'sound-cues.json'),JSON.stringify({version:3,cues:[{at:.4,gain:.008,kind:'assembly-fan',effect:'fan-start',file:'sfx/quiet.wav',sha256,targetRmsDbFS:-27,peakDbFS:-12},{at:1.3,gain:.008,kind:'outro-transition',effect:'soft-whoosh',targetRmsDbFS:-22,peakDbFS:-9}]}));
  execFileSync('/usr/bin/python3',[path.resolve('scripts/remix.py'),f.root,path.resolve('bin/ffmpeg')],{stdio:'pipe',timeout:30000});
  assert.deepEqual(await fs.readFile(path.join(f.root,'narration.wav')),master);
  const report=JSON.parse(await fs.readFile(path.join(f.root,'sound-mix-report.json'),'utf8'));
  assert.ok(report.cues[0].actualActiveRmsDbFS>=-29);assert.ok(report.cues[0].peakDbFS<=-11.9);assert.ok(report.cues[0].boostVsLegacyDb>25,'a single transient must not bury the motor again');
  assert.equal(report.cues[1].duration,.55);assert.ok(report.cues[1].actualActiveRmsDbFS>=-25);assert.ok(report.cues[1].peakDbFS<=-8.9);
  const stem=await fs.readFile(path.join(f.root,'sfx-only.wav'));let energy=0;for(let i=round(.55*48000);i<round(.8*48000);i++){const v=stem.readInt16LE(44+i*2)/32768;energy+=v*v;}assert.ok(Math.sqrt(energy/(.25*48000))>.02,'sustained fan is audible, not only its click');
 }finally{await f.cleanup();}
 function round(n:number){return Math.round(n);}
});

test('audition mix halves the exact calibrated fan waveform and raises only the background by 50 percent',async()=>{
 const f=await fixture();try{
  const master=wav(3,2000),sample=wav(.6,5000),sha256=createHash('sha256').update(sample).digest('hex');
  await fs.mkdir(path.join(f.root,'sfx'));await fs.writeFile(path.join(f.root,'sfx/fan.wav'),sample);await fs.writeFile(path.join(f.root,'narration.wav'),master);
  await fs.writeFile(path.join(f.root,'storyboard.json'),JSON.stringify({scenes:[{seconds:3}]}));
  const cue={at:.4,gain:.008,kind:'assembly-fan',effect:'fan-start',file:'sfx/fan.wav',sha256,targetRmsDbFS:-27,peakDbFS:-12};
  async function mix(scale:number,backgroundGain:number){
   await fs.writeFile(path.join(f.root,'sound-cues.json'),JSON.stringify({version:4,backgroundGain,cues:[{...cue,levelScale:scale}]}));
   execFileSync('/usr/bin/python3',[path.resolve('scripts/remix.py'),f.root,path.resolve('bin/ffmpeg')],{stdio:'pipe',timeout:30000});
   return {stem:await fs.readFile(path.join(f.root,'sfx-only.wav')),premix:await fs.readFile(path.join(f.root,'premix.wav'))};
  }
  const before=await mix(1,.006),after=await mix(.5,.009);
  for(let i=0;i<(before.stem.length-44)/2;i++)assert.ok(Math.abs(after.stem.readInt16LE(44+i*2)-before.stem.readInt16LE(44+i*2)*.5)<=1,'fan samples preserve exact half amplitude');
  for(let i=60000;i<90000;i++){
   const speech=master.readInt16LE(44+i*2)*32767/32768;
   assert.ok(Math.abs((after.premix.readInt16LE(44+i*2)-speech)-(before.premix.readInt16LE(44+i*2)-speech)*1.5)<2,'only the bed changes between events');
  }
  assert.deepEqual(await fs.readFile(path.join(f.root,'narration.wav')),master);
 }finally{await f.cleanup();}
});

test('sustained fan fades to silence well before its source cut and a late cue also fades at the movie boundary',async()=>{
 const f=await fixture();try{
  const sample=wav(3,5000),sha256=createHash('sha256').update(sample).digest('hex');await fs.mkdir(path.join(f.root,'sfx'));await fs.writeFile(path.join(f.root,'sfx/fan.wav'),sample);
  await fs.writeFile(path.join(f.root,'storyboard.json'),JSON.stringify({scenes:[{seconds:4}]}));
  await fs.writeFile(path.join(f.root,'sound-cues.json'),JSON.stringify({version:5,backgroundGain:0,cues:[
   {at:.2,gain:.008,kind:'assembly-fan',effect:'fan-start',file:'sfx/fan.wav',sha256,targetRmsDbFS:-27,peakDbFS:-12,levelScale:.5,fadeInSeconds:.04,fadeOutSeconds:.9},
   {at:3.7,gain:.008,kind:'outro-transition',effect:'soft-whoosh',targetRmsDbFS:-22,peakDbFS:-9,levelScale:.5,fadeInSeconds:.02,fadeOutSeconds:.2},
  ]}));
  execFileSync('/usr/bin/python3',[path.resolve('scripts/remix.py'),f.root,path.resolve('bin/ffmpeg')],{stdio:'pipe',timeout:30000});
  const b=await fs.readFile(path.join(f.root,'sfx-only.wav'));
  const energy=(start:number,end:number)=>{let sum=0,count=0;for(let i=Math.round(start*48000);i<Math.round(end*48000);i++){sum+=(b.readInt16LE(44+i*2)/32768)**2;count++;}return Math.sqrt(sum/count);};
  assert.ok(energy(3.15,3.2)<energy(1,1.1)*.02,'fan has a long gentle tail, not a short terminal ramp');
  assert.ok(energy(2.9,3)<energy(2.4,2.5),'fan energy falls before the source ends');
  assert.equal(b.readInt16LE(b.length-2),0,'late cue reaches zero at the final sample');
  assert.ok(energy(3.98,4)<energy(3.8,3.9)*.08,'late transition has no hard cut at movie end');
 }finally{await f.cleanup();}
});

test('scene audio stretches movement to its full interval and loops a fan through its speed envelope',async()=>{
 const f=await fixture();try{
  const sample=wav(3,5000),sha256=createHash('sha256').update(sample).digest('hex'),master=wav(10,1000);await fs.mkdir(path.join(f.root,'sfx'));await fs.writeFile(path.join(f.root,'sfx/fan.wav'),sample);await fs.writeFile(path.join(f.root,'narration.wav'),master);
  await fs.writeFile(path.join(f.root,'storyboard.json'),JSON.stringify({scenes:[{seconds:10}]}));
  await fs.writeFile(path.join(f.root,'sound-cues.json'),JSON.stringify({version:8,backgroundGain:0,cues:[
   {at:1,gain:.008,kind:'assembly-fan',effect:'fan-start',file:'sfx/fan.wav',sha256,targetRmsDbFS:-27,peakDbFS:-12,levelScale:.3,durationSeconds:6,durationMode:'loop',fadeInSeconds:.15,fadeOutSeconds:.9,automation:[{at:1,value:0},{at:2,value:1},{at:6,value:1},{at:7,value:0}]},
   {at:7.4,gain:.008,kind:'assembly-cutaway',effect:'soft-whoosh',targetRmsDbFS:-22,peakDbFS:-9,levelScale:.24,durationSeconds:1.6,durationMode:'stretch',fadeInSeconds:.15,fadeOutSeconds:.4}
  ]}));
  execFileSync('/usr/bin/python3',[path.resolve('scripts/remix.py'),f.root,path.resolve('bin/ffmpeg')],{stdio:'pipe',timeout:30000});
  const b=await fs.readFile(path.join(f.root,'sfx-only.wav')),report=JSON.parse(await fs.readFile(path.join(f.root,'sound-mix-report.json'),'utf8'));
  const energy=(start:number,end:number)=>{let sum=0,count=0;for(let i=Math.round(start*48000);i<Math.round(end*48000);i++){sum+=(b.readInt16LE(44+i*2)/32768)**2;count++;}return Math.sqrt(sum/count);};
  assert.equal(energy(.5,.9),0);assert.ok(energy(5,5.2)>.001,'fan continues beyond the original three-second file');assert.ok(energy(1,1.1)<energy(3,3.2)*.03);assert.ok(energy(6.9,7)<energy(3,3.2)*.03);assert.equal(energy(7.05,7.3),0,'fan stops with the animation');
  assert.ok(energy(8.3,8.5)>.001,'stretched whoosh remains present while the body still moves');assert.equal(energy(9.1,9.3),0);assert.equal(b.readInt16LE(44+7*48000*2),0);
  assert.equal(report.cues[0].duration,6);assert.equal(report.cues[1].duration,1.6);assert.ok(Math.abs(report.cues[1].playbackRate-.55/1.6)<1e-8);assert.deepEqual(await fs.readFile(path.join(f.root,'narration.wav')),master);
 }finally{await f.cleanup();}
});
