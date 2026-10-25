import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type {Storyboard} from "../src/lib/model";

const ROOT=path.resolve(import.meta.dirname,"..");
const ID="00000000-0000-0000-0000-000000000001";
const film=():Storyboard=>({title:"Кэш",summary:"Как кэш ускоряет ответ",factNotes:"",scenes:Array.from({length:4},(_,i)=>({id:`scene-${i+1}`,title:"Кэш",subtitle:"",narration:"Сервер отвечает из памяти быстрее.",seconds:6.5,visual:"flow",items:["Сервер"]}))});
const words=(start:number)=>[["Хочешь",0],["больше",.35],["таких",.7],["разборов?",1.0],["Подписывайся",1.5],["на",2.1],["xtuned.",2.25]].map(([text,at])=>({text:String(text),start:start+Number(at),end:start+Number(at)+.3}));

test("outro pack v1 is frozen with verified hashes and both languages",async()=>{
 const {readOutroPack}=await import("../src/lib/creator-outro");
 const {pack,sha256}=readOutroPack(path.join(ROOT,"data/branding/xtuned-outro/v1"));
 assert.match(sha256,/^[a-f0-9]{64}$/);
 assert.equal(pack.languages.ru.spoken,"Хочешь больше таких разборов? Подписывайся на xtuned.");
 assert.equal(pack.languages.en.spoken,"Want more breakdowns like this? Follow xtuned.");
 assert.deepEqual([pack.languages.en.button,pack.languages.en.done],["Follow","Following"]);
 assert.deepEqual([pack.languages.ru.button,pack.languages.ru.done],["Подписаться","Вы подписаны"]);
});

test("the fixed line is appended as the last scene and excluded from editorial and fact input",async()=>{
 const {readOutroPack,appendOutro,snapshotOutro,projectOutroPack,contentSeconds}=await import("../src/lib/creator-outro");
 const {normalizePlan}=await import("../src/lib/model");
 const {editorialInput,spokenText}=await import("../src/lib/quality");
 const {pack,sha256}=readOutroPack(path.join(ROOT,"data/branding/xtuned-outro/v1"));
 const base=film(),plan=appendOutro(base,ID,pack,sha256,"ru");
 assert.equal(plan.scenes.length,5);assert.equal(plan.creatorOutro?.sceneId,"scene-5");
 assert.equal(plan.scenes.at(-1)!.narration,pack.languages.ru.spoken);
 assert.ok(spokenText(plan).endsWith("Подписывайся на xtuned."));
 assert.deepEqual(editorialInput(plan),editorialInput(base));
 assert.equal(appendOutro(plan,ID,pack,sha256,"ru"),plan,"re-render never appends twice");
 assert.equal(contentSeconds(30,pack),26);assert.equal(contentSeconds(30,null),30);
 const normalized=normalizePlan(plan,30,true);assert.equal(normalized.creatorOutro?.sceneId,"scene-5");
 const edited=structuredClone(plan);edited.scenes.at(-1)!.narration="Подписывайся.";
 assert.throws(()=>normalizePlan(edited,30,true),/неизменённой фразой/);
 const en=appendOutro(film(),ID,pack,sha256,"en");assert.equal(en.creatorOutro?.button,"Follow");
 const kagenami=appendOutro(film(),ID,pack,sha256,"en","kagenami");
 assert.equal(kagenami.creatorOutro?.username,"@kagenami_ai");assert.equal(kagenami.creatorOutro?.brandWord,"Kagenami");
 assert.equal(kagenami.scenes.at(-1)!.narration,"Want more breakdowns like this? Follow Kagenami.");assert.equal(kagenami.creatorOutro?.button,"Follow");
 assert.throws(()=>appendOutro(film(),ID,pack,sha256,"ru","kagenami"),/ещё не выбрано/,"Russian Kagenami waits for a chosen pronunciation");
 const wit=appendOutro(film(),ID,pack,sha256,"en","worldifthen");
 assert.equal(wit.creatorOutro?.username,"@worldifthen_ai");assert.equal(wit.creatorOutro?.brandWord,"World If Then");
 assert.equal(wit.creatorOutro?.question,"Want to know more?");assert.equal(wit.scenes.at(-1)!.title,"Want to know more?");
 assert.equal(wit.scenes.at(-1)!.narration,"Want to know more? Follow World If Then.");assert.deepEqual(wit.scenes.at(-1)!.items,["@worldifthen_ai"]);
 assert.deepEqual([wit.creatorOutro?.cueWord,wit.creatorOutro?.button,wit.creatorOutro?.done],["Follow","Follow","Following"]);
 assert.equal(kagenami.creatorOutro?.question,pack.languages.en.question,"Kagenami keeps the pack question");
 assert.throws(()=>appendOutro(film(),ID,pack,sha256,"ru","worldifthen"),/ещё не выбрано/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"outro-"));
 try{
  const profile={creatorOutro:snapshotOutro(ROOT,dir,"en")};
  assert.equal(profile.creatorOutro.sha256,sha256);assert.equal(projectOutroPack(dir,profile)?.pack,"xtuned-outro/v1");
  fs.appendFileSync(path.join(dir,"branding/xtuned-outro-v1/outro.json")," ");
  assert.throws(()=>projectOutroPack(dir,profile),/изменён/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test("press, flip and sounds follow the measured words; the click never covers the brand",async()=>{
 const {outroAnchors,outroSoundTimes}=await import("../src/lib/xtuned-outro");
 const o={cueWord:"Подписывайся",brandWord:"xtuned",tailSeconds:1.2};
 const a=outroAnchors(o,30,35,words(30.2));
 assert.ok(a.measured);assert.equal(a.cueAt,31.7);
 const brandEnd=30.2+2.25+.3;assert.ok(Math.abs(a.brandEnd-brandEnd)<1e-9);
 const sound=outroSoundTimes(a);
 assert.ok(sound.click>=brandEnd-1e-9,"click starts after the brand word ends");
 assert.ok(sound.success>sound.click&&a.flipAt+.7<=35+1e-9);
 const fallback=outroAnchors(o,30,34);assert.equal(fallback.measured,false);assert.ok(fallback.pressAt<34-.7);
 // A three-word brand is anchored as one phrase: the click waits for "Then", never lands on "If Then".
 const en=[["Want",0],["to",.25],["know",.4],["more?",.65],["Follow",1.2],["World",1.6],["If",1.95],["Then.",2.15]].map(([text,at])=>({text:String(text),start:40+Number(at),end:40+Number(at)+.3}));
 const w=outroAnchors({cueWord:"Follow",brandWord:"World If Then",tailSeconds:1.2},40,45,en);
 assert.ok(w.measured);assert.equal(w.cueAt,41.2);assert.ok(Math.abs(w.brandEnd-(42.15+.3))<1e-9);
 assert.ok(outroSoundTimes(w).click>=w.brandEnd-1e-9);
 assert.equal(outroAnchors({cueWord:"Follow",brandWord:"World If Then",tailSeconds:1.2},40,45,en.slice(0,6)).measured,false,"a partial phrase is not the brand");
});

test("every outro layer changes continuously at 30 fps, sprite swaps included",async()=>{
 const {outroAnchors,outroState,outroSpriteLayers,outroPoseKeys}=await import("../src/lib/xtuned-outro");
 const a=outroAnchors({cueWord:"Подписывайся",brandWord:"xtuned",tailSeconds:1.2},30,35,words(30.2)),keys=outroPoseKeys(a);
 const scalars=(t:number)=>{const s=outroState(t,a);return {overlay:s.overlay,question:s.question.opacity,plate:s.plate.opacity,button:s.button.opacity,character:s.character.opacity,cursor:s.cursor,done:s.done,glow:s.glow,press:s.cursorPress};};
 const layers=(t:number)=>{const m=new Map<string,number>();for(const l of outroSpriteLayers(t,keys))m.set(`${l.row}:${l.frame}`,(m.get(`${l.row}:${l.frame}`)||0)+l.opacity);return m;};
 let swaps=0;
 for(let f=30*30;f<35*30;f++){
  const t0=f/30,t1=(f+1)/30,s0=scalars(t0),s1=scalars(t1);
  for(const k of Object.keys(s0) as (keyof typeof s0)[])assert.ok(Math.abs(s1[k]-s0[k])<=.5+1e-9,`${k} jumps at frame ${f}`);
  const l0=layers(t0),l1=layers(t1);
  for(const key of new Set([...l0.keys(),...l1.keys()])){const d=Math.abs((l1.get(key)||0)-(l0.get(key)||0));assert.ok(d<=.5+1e-9,`sprite ${key} jumps ${d.toFixed(2)} at frame ${f}`);if(d>0)swaps++;}
  const coverage=Math.max(...outroSpriteLayers(t1,keys).map(l=>l.opacity));assert.ok(coverage>=1-1e-9,`sprite coverage dips at frame ${f}`);
 }
 assert.ok(swaps>10,"the character actually animates");
 assert.deepEqual(keys.map(k=>k.pose),["wave","point","happy"]);
});

test("outro cues: whoosh always, chosen click and arpeggio only, film cues silenced under the outro",async()=>{
 const {readOutroPack,appendOutro}=await import("../src/lib/creator-outro");
 const {normalizePlan}=await import("../src/lib/model");
 const {soundCues}=await import("../src/lib/export-review");
 const {pack,sha256}=readOutroPack(path.join(ROOT,"data/branding/xtuned-outro/v1"));
 const base=film();base.scenes[3].beats=[{at:5,cue:"",action:"reveal",target:"x",description:"late"}];
 const plan=normalizePlan(appendOutro(base,ID,pack,sha256,"ru"),30,true);
 const alignment=[...plan.scenes.slice(0,4).map(()=>({words:[]})),{words:words(26.2)}];
 const none=soundCues(plan,alignment).cues.filter(c=>c.at>=26-.05);
 assert.deepEqual(none.map(c=>c.kind),["outro-transition"]);
 const all=soundCues(plan,alignment,{click:true,success:true}).cues.filter(c=>c.at>=26-.05);
 assert.deepEqual(all.map(c=>[c.kind,c.effect]),[["outro-transition","soft-whoosh"],["outro-click","pixel-click"],["outro-success","chiptune-arpeggio"]]);
 assert.ok(all.every(c=>Math.abs(c.at*30-Math.round(c.at*30))<1e-8));
});

test("brand check accepts the spoken brand and rejects a miss",async()=>{
 const {outroBrandHeard}=await import("../src/lib/xtuned-outro");
 const accepted=["xtuned","x tuned","экс тюнд"];
 assert.equal(outroBrandHeard(["Подписывайся","на","X","tuned."],accepted).ok,true);
 assert.equal(outroBrandHeard(["Подписывайся","на","экс-тюнд."],accepted).ok,true);
 assert.equal(outroBrandHeard(["Подписывайся","на","икстюн."],accepted).ok,false);
 // Devoiced «экс-тюнд», confirmed by the editor's listening; ASR spells it in Latin or Cyrillic.
 assert.equal(outroBrandHeard(["Подписывайся","на","Extunt."],accepted).ok,true);
 assert.equal(outroBrandHeard(["Подписывайся","на","экс","тюнт."],accepted).ok,true);
 assert.equal(outroBrandHeard(["Подписывайся","на","\"Когенами\"."],["кагенами"]).ok,true);
 const {OUTRO_BRANDS}=await import("../src/lib/xtuned-outro");
 const wit=OUTRO_BRANDS.worldifthen.languages.en!.brandHeard;
 assert.equal(outroBrandHeard(["know","more?","Follow","World","If","Then."],wit).ok,true);
 assert.equal(outroBrandHeard(["more?","Follow","WorldIfThen."],wit).ok,true);
 assert.equal(outroBrandHeard(["know","more?","Follow","the","world."],wit).ok,false);
});

test("2D explainers get only the film's chapters; the outro scene keeps the composition length",async()=>{
 const {readOutroPack,appendOutro}=await import("../src/lib/creator-outro");
 const {normalizePlan}=await import("../src/lib/model");
 const {withoutOutro}=await import("../src/lib/quality");
 const {filmPlan}=await import("../renderer/XtunedOutro");
 const {pack,sha256}=readOutroPack(path.join(ROOT,"data/branding/xtuned-outro/v1"));
 const plan=normalizePlan(appendOutro(film(),ID,pack,sha256,"ru"),30,true),f=filmPlan(plan);
 const total=(p:Storyboard)=>p.scenes.reduce((n,s)=>n+s.seconds,0);
 assert.equal(f.scenes.length,4);assert.ok(Math.abs(total(f)-total(plan))<1e-9);
 assert.ok(Math.abs(f.scenes[3].seconds-(plan.scenes[3].seconds+plan.scenes[4].seconds))<1e-9);
 assert.deepEqual(withoutOutro(plan).scenes.map(s=>s.id),["scene-1","scene-2","scene-3","scene-4"]);
 assert.equal(filmPlan(film()).scenes.length,4,"films without an outro are untouched");
});
