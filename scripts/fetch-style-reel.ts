// One explicit Reel for a style study, analysed outside the GPT reference queue.
// Reuses the studio's Apify Free adapter (one link, $1 cap) and Instagram CDN downloader.
import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {reelLinks} from "../src/lib/video-reference-model";
import {apify,ensureFreeAccount,startVideoListRun,selectedReelItems,downloadReel} from "../src/lib/author-providers";
import {DATA} from "../src/lib/store";

async function main(){
 const [link]=reelLinks([process.argv[2]??""]);
 if(!link)throw new Error("Нужна одна ссылка на Instagram Reel.");
 const code=new URL(link).pathname.split("/")[2];
 const dir=path.join(DATA,"style-references",code);
 await fs.mkdir(dir,{recursive:true});
 const stateFile=path.join(dir,"source.json");
 const state:any=JSON.parse(await fs.readFile(stateFile,"utf8").catch(()=>"{}"));
 const save=()=>fs.writeFile(stateFile,JSON.stringify(state,null,2));
 const signal=new AbortController().signal;
 if(!state.runId){
  if(state.runStarting)throw new Error("Результат запуска Apify неизвестен; новый запуск автоматически не выполняется.");
  const account=await ensureFreeAccount();
  state.link=link;state.account={plan:account.plan,remainingUsd:account.remainingUsd};state.runStarting=true;await save();
  state.runId=(await startVideoListRun([link],signal)).id;state.runStarting=false;await save();
 }
 let run:any;
 for(let i=0;i<90;i++){
  run=(await apify(`actor-runs/${encodeURIComponent(state.runId)}?waitForFinish=10`,{},signal)).data;
  state.costUsd=run.usageTotalUsd??state.costUsd;state.runStatus=run.status;await save();
  if(["SUCCEEDED","FAILED","ABORTED","TIMED-OUT"].includes(run.status))break;
 }
 if(run?.status!=="SUCCEEDED")throw new Error(`Apify: ${run?.status??"нет ответа"}`);
 const items=await apify(`datasets/${encodeURIComponent(run.defaultDatasetId)}/items?clean=true&format=json&limit=10`,{},signal);
 const [item]=selectedReelItems(Array.isArray(items)?items:[],[link]);
 if(!item)throw new Error("Apify не вернул видео по этой ссылке.");
 const raw=(Array.isArray(items)?items:[]).find((x:any)=>String(x.url||"").includes(code))??{};
 const video=path.join(dir,"video.mp4");
 await downloadReel(item.sourceUrl,video,signal);
 state.caption=item.caption;state.owner=raw.ownerUsername??null;state.postedAt=raw.timestamp??null;state.durationReported=raw.videoDuration??null;
 state.sha256=createHash("sha256").update(await fs.readFile(video)).digest("hex");state.downloadedAt=new Date().toISOString();
 state.rights="Third-party Reel kept locally for private style analysis only; not redistributed or reused as footage.";
 await save();
 console.log(JSON.stringify({dir,owner:state.owner,costUsd:state.costUsd,sha256:state.sha256}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exit(1);});
