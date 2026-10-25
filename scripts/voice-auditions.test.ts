import {before,after,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
let root:string,store:typeof import("../src/lib/store"),auditions:typeof import("../src/lib/voice-auditions");
const previous=process.cwd();
before(async()=>{root=await fs.mkdtemp(path.join(os.tmpdir(),"studio-audition-test-"));await fs.cp(path.join(previous,"data/branding/xtuned-outro"),path.join(root,"data/branding/xtuned-outro"),{recursive:true});await fs.cp(path.join(previous,"data/sound-packs/background-beds/v4"),path.join(root,"data/sound-packs/background-beds/v4"),{recursive:true,filter:f=>!/\.(wav|m4a)$/.test(f)});await fs.writeFile(path.join(root,".env.local"),"ELEVENLABS_API_KEY=fake-test-key\nELEVENLABS_VOICE_ID=currentvoice123\n");process.chdir(root);store=await import("../src/lib/store");auditions=await import("../src/lib/voice-auditions");});
after(async()=>{store.db().close();process.chdir(previous);await fs.rm(root,{recursive:true,force:true});});
const input={text:"Представь условную систему: пока сообщение идёт к серверу, на экране уже появляется ответ. Теперь разберём этот учебный пример без привязки к реальному сервису.",alternativeVoiceId:"othervoice123",rates:[1,1,1],rateSource:"Test account tariff"};
function fakeFetch(remaining=10000,v4=true){return async(url:any,options:any)=>{assert.equal(options?.method??"GET","GET");const data=String(url).endsWith("/v1/models")?[{model_id:"eleven_multilingual_v2",name:"v2",can_do_text_to_speech:true,model_rates:{character_cost_multiplier:1,cost_discount_multiplier:1}},...(v4?[{model_id:"eleven_v4",name:"v4",can_do_text_to_speech:true,model_rates:{character_cost_multiplier:1,cost_discount_multiplier:1}}]:[])]:String(url).includes("/v2/voices")?{voices:[{voice_id:"currentvoice123",name:"Current",labels:{language:"ru"}},{voice_id:"othervoice123",name:"Other",category:"premade",labels:{language:"ru"}}]}:{character_count:0,character_limit:remaining};return Response.json(data);};}
test("audition requires confirmed available v4, adequate credits and non-underpriced rates before queuing",async t=>{
 t.mock.method(globalThis,"fetch",fakeFetch(10000,false));await assert.rejects(auditions.quoteAudition(input),/не подтверждён/);
 t.mock.restoreAll();t.mock.method(globalThis,"fetch",fakeFetch(10));await assert.rejects(auditions.quoteAudition(input),/кредиты/);
 t.mock.restoreAll();t.mock.method(globalThis,"fetch",fakeFetch());await assert.rejects(auditions.quoteAudition({...input,rates:[.5,1,1]}),/ниже/);
 assert.equal(store.db().prepare("SELECT COUNT(*) AS n FROM jobs").get()!.n,0);
});
test("a cost quote binds exact text, model and rates; duplicate confirmation reserves only one job",async t=>{
 t.mock.method(globalThis,"fetch",fakeFetch());const quote=await auditions.quoteAudition(input);const state=await auditions.auditionState(quote.id);
 assert.equal(quote.variants.length,3);assert.equal(quote.totalCredits,quote.variants.reduce((n,v)=>n+v.characters,0));
 await assert.rejects(auditions.startAudition(quote.id,"0".repeat(64)),/изменилась/);
 await auditions.startAudition(quote.id,state!.quoteHash);await assert.rejects(auditions.startAudition(quote.id,state!.quoteHash),/изменилась|запускалось/);
 assert.equal(store.db().prepare("SELECT COUNT(*) AS n FROM jobs WHERE project_id=?").get(quote.id)!.n,1);
});
test("blind results hide model mapping and selecting requires a ready audition and explicit editor action",async t=>{
 t.mock.method(globalThis,"fetch",fakeFetch());const quote=await auditions.quoteAudition(input);
 await assert.rejects(auditions.selectAudition(quote.id,0),/завершите/);
 const file=path.join(root,"data/voice-auditions",quote.id,"audition.json");await fs.writeFile(file,JSON.stringify({...quote,status:"ready",order:[2,0,1]}));
 const blind=await auditions.auditionState(quote.id);assert.equal(blind!.variants,undefined);assert.equal(blind!.order,undefined);assert.equal(blind!.samples[0].label,"Вариант A");
 await auditions.selectAudition(quote.id,0);const selected=JSON.parse((store.db().prepare("SELECT value FROM settings WHERE key=?").get("selectedVoiceProfile") as any).value);assert.equal(selected.voiceId,input.alternativeVoiceId);assert.equal(selected.model,"eleven_v4");assert.equal((await auditions.auditionState(quote.id))!.selectedBy,"explicit editor action");
 const id=store.createProject({topic:"Новый рассказ с выбранным голосом",duration:30,format:"9:16",voice:true});assert.deepEqual(store.project(id)?.profile.production?.voiceProfile,selected);
 store.db().prepare("UPDATE settings SET value=? WHERE key=?").run(JSON.stringify({...selected,voiceId:"anotherVoice123"}),"selectedVoiceProfile");assert.equal(store.project(id)?.profile.production?.voiceProfile?.voiceId,input.alternativeVoiceId);
});
