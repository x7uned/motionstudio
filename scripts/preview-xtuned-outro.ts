/**
 * Picture-only preview of the @xtuned outro v1: synthetic film + measured-like word clock, no TTS, no paid calls.
 * Output: data/productions/2026-10-19-xtuned-outro/preview/*.mp4 and contact sheets. Not a substitute for a real
 * create→render→review run with the continuous narration.
 */
import path from "node:path";
import fs from "node:fs";
import {bundle} from "@remotion/bundler";
import {selectComposition,renderMedia} from "@remotion/renderer";
import {ROOT} from "../src/lib/store";
import {CHROME,FFMPEG,run} from "../src/lib/provider";
import {normalizePlan,defaultProfile,sceneClock,type Storyboard} from "../src/lib/model";
import {readOutroPack,appendOutro,OUTRO_SNAPSHOT_DIR} from "../src/lib/creator-outro";

const ID="00000000-0000-4000-8000-00000000c0de";
const BASE=path.join(ROOT,"data/productions/2026-10-19-xtuned-outro"),PUBLIC=path.join(BASE,"public"),OUT=path.join(BASE,"preview");
const SPOKEN={ru:[["Хочешь",0],["больше",.3],["таких",.62],["разборов?",.92],["Подписывайся",1.55],["на",2.2],["xtuned.",2.34]],en:[["Want",0],["more",.24],["breakdowns",.48],["like",1.02],["this?",1.22],["Follow",1.75],["xtuned.",2.12]]} as const;

async function main(){
 const {pack,sha256}=readOutroPack(path.join(ROOT,"data/branding/xtuned-outro/v1"));
 fs.mkdirSync(path.join(PUBLIC,ID,OUTRO_SNAPSHOT_DIR),{recursive:true});fs.mkdirSync(OUT,{recursive:true});
 fs.copyFileSync(path.join(ROOT,"data/branding/xtuned-outro/v1",pack.character.file),path.join(PUBLIC,ID,OUTRO_SNAPSHOT_DIR,"spritesheet.png"));
 const serveUrl=await bundle({entryPoint:path.join(ROOT,"renderer/index.tsx"),publicDir:PUBLIC});
 for(const [language,format] of [["ru","9:16"],["en","9:16"],["ru","16:9"]] as const){
  const film:Storyboard={title:"Кэш",summary:"Предпросмотр заставки",factNotes:"",scenes:Array.from({length:4},(_,i)=>({id:`scene-${i+1}`,title:`Глава ${i+1}`,subtitle:"Синтетический ролик для предпросмотра",narration:"Тестовая фраза.",seconds:3,visual:"flow" as const,items:["Сервер"]}))};
  const plan=normalizePlan(appendOutro(film,ID,pack,sha256,language),17,false),clock=sceneClock(plan),outro=clock.at(-1)!;
  const words=SPOKEN[language].map(([text,at])=>({text,start:outro.start+.25+at,end:outro.start+.25+at+.32}));
  const alignment=[...clock.slice(0,-1).map(s=>({scene:0,start:s.start,end:s.end,sceneEnd:s.end,speed:1,text:"",words:[]})),{scene:5,start:words[0].start,end:words.at(-1)!.end,sceneEnd:outro.end,speed:1,text:plan.scenes.at(-1)!.narration,words}];
  const props={plan,profile:{...defaultProfile,backgroundDesign:{version:1 as const,id:"01" as const}},format,alignment,models:[],modelBase:""};
  const composition=await selectComposition({serveUrl,id:"StudioFilm",inputProps:props,browserExecutable:CHROME});
  const name=`outro-${language}-${format==="9:16"?"portrait":"landscape"}`,video=path.join(OUT,`${name}.mp4`);
  const from=Math.round((outro.start-1)*30);
  await renderMedia({composition,serveUrl,codec:"h264",inputProps:props,outputLocation:video,browserExecutable:CHROME,frameRange:[from,composition.durationInFrames-1],muted:true,crf:18});
  // Dense sheet: every 3rd frame of the outro, so state changes and sprite swaps are visible in order.
  await run(FFMPEG,["-y","-v","error","-i",video,"-vf",`select='not(mod(n\\,3))',scale=${format==="9:16"?"216:384":"384:216"},tile=${format==="9:16"?"10x6":"8x8"}`,"-frames:v","1",path.join(OUT,`${name}-sheet.jpg`)]);
  console.log(name,{outroStart:outro.start,end:outro.end,frames:composition.durationInFrames-from});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
