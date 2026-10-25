import fs from "node:fs/promises";
import path from "node:path";
import type {Project} from "./store";
import {narrativeSchema} from "./quality-contract";
import {plain,digest,spokenText,readJSON,writeJSON} from "./quality";
export async function saveManualNarrative(p:Project,dir:string,input:unknown){
 if(p.profile.production?.version!==2)throw new Error("Для старого проекта используйте сохранённый редактор сцен.");
 if(typeof input!=="string"||plain(input).length<40||plain(input).length>9000)throw new Error("Рассказ должен содержать от40 до9000 символов.");
 const base=narrativeSchema.parse(await readJSON(path.join(dir,"narrative.json"))),text=narrativeSchema.shape.fullText.parse(typeof input==="string"?plain(input):input);
 if(/\[[a-z][a-z ]{1,40}\]/i.test(text))throw new Error("Указания подачи храните в голосовом плане; в рассказе нужны только произносимые слова.");
 const previous=p.plan?spokenText(p.plan):base.fullText;if(text===previous)return null;
 const archive=path.join(dir,"narrative-versions",digest(previous));await fs.mkdir(archive,{recursive:true});
 await writeJSON(path.join(archive,"narrative.json"),{...base,fullText:previous});if(p.plan)await writeJSON(path.join(archive,"storyboard.json"),p.plan);
 for(const name of ["narration.wav","alignment.json","voice-plan.json","speech-provider.json","fact-audit.json","editorial-audit.json","visual-concept.json","assembly-plan.json","assembly-snapshot.json","visual-concept-instructions.md","scene-builder-instructions.md"]){try{await fs.copyFile(/*turbopackIgnore: true*/path.join(/*turbopackIgnore: true*/dir,name),path.join(archive,name));}catch(e:any){if(e.code!=="ENOENT")throw e;}}
 const next={...base,fullText:text};
 await writeJSON(path.join(dir,"manual-narrative-versions",`${digest(next)}.json`),{...next,editedAt:new Date().toISOString(),provenance:"explicit author edit; never automatically rewrite"});
 await writeJSON(path.join(dir,"manual-narrative.json"),next);await writeJSON(path.join(dir,"narrative.json"),next);return next;
}
