/**
 * Write the editor's outro sound choice into data/branding/xtuned-outro/v1. Reads the explicit "like" ratings
 * of data/sound-packs/outro-8bit-01 (exactly one click and one arpeggio) or ids passed as arguments
 * (`click=05 success=11`). Never picks a winner itself. Projects created earlier keep their own snapshot.
 */
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {ROOT} from "../src/lib/store";
import {FFMPEG,run} from "../src/lib/provider";
import {validEffectWav} from "../src/lib/sound-effects";
import {readOutroPack} from "../src/lib/creator-outro";

const PACK=path.join(ROOT,"data/branding/xtuned-outro/v1"),AUDITION=path.join(ROOT,"data/sound-packs/outro-8bit-01");
async function main(){
 const manifest=JSON.parse(fs.readFileSync(path.join(AUDITION,"manifest.json"),"utf8")),ratings=JSON.parse(fs.readFileSync(path.join(AUDITION,"ratings.json"),"utf8")).ratings;
 const args=Object.fromEntries(process.argv.slice(2).map(a=>a.split("=")));
 const pick=(kind:"click"|"arpeggio",arg:string|undefined)=>{
  const items=manifest.sounds.filter((s:any)=>s.kind===kind),chosen=arg?items.filter((s:any)=>s.id===arg):items.filter((s:any)=>ratings[s.id]?.rating==="like");
  if(chosen.length!==1)throw new Error(`Нужен ровно один выбранный редактором звук «${kind}», найдено ${chosen.length}. Отметьте «Нравится» у одного или передайте ${kind==="click"?"click":"success"}=<номер>.`);
  return chosen[0];
 };
 const sounds={click:pick("click",args.click),success:pick("arpeggio",args.success)};
 fs.mkdirSync(path.join(PACK,"sounds"),{recursive:true});
 const outro=JSON.parse(fs.readFileSync(path.join(PACK,"outro.json"),"utf8"));
 for(const [key,s] of Object.entries(sounds)){
  const file=`sounds/${key==="click"?"pixel-click":"chiptune-arpeggio"}.wav`;
  await run(FFMPEG,["-y","-v","error","-i",path.join(AUDITION,s.file),"-ac","1","-ar","48000","-c:a","pcm_s16le","-map_metadata","-1","-fflags","+bitexact","-flags:a","+bitexact",path.join(PACK,file)]);
  const bytes=fs.readFileSync(path.join(PACK,file));if(!validEffectWav(bytes))throw new Error(`${file}: не короткий PCM16 mono 48 кГц WAV.`);
  outro.sounds[key]={file,sha256:createHash("sha256").update(bytes).digest("hex"),title:`${s.id} · ${s.title}`,license:s.license==="original"?"original":s.license,
   attribution:s.license==="original"?"Motion Studio, original synthesis (outro-8bit-01/build.py)":`${s.author}, ${s.license}, ${s.source}`};
 }
 fs.writeFileSync(path.join(PACK,"outro.json"),JSON.stringify(outro,null,2)+"\n");
 const {sha256}=readOutroPack(PACK);
 console.log(JSON.stringify({click:outro.sounds.click.title,success:outro.sounds.success.title,packSha256:sha256},null,1));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
