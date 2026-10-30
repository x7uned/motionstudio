import fs from "node:fs";
import path from "node:path";
import {spawn} from "node:child_process";
import {parseEnv} from "node:util";

/**
 * The engine as a background process of the skill (user decisions 2026-10-21, 2026-10-30: no web UI):
 * `npm run studio -- start|stop` runs the queue worker. Secrets from .env.local go only into the child's environment.
 */
const alive=(pid:number)=>{if(!Number.isInteger(pid)||pid<=0)return false;try{process.kill(pid,0);return true;}catch(e:any){return e.code==="EPERM";}};
const readPid=(file:string)=>{try{return Number(fs.readFileSync(file,"utf8").trim());}catch{return 0;}};
export const enginePaths=(root:string)=>({lock:path.join(root,"data","worker.lock"),log:path.join(root,"data","logs","engine.log"),stop:path.join(root,"data","engine.stop"),beat:path.join(root,"data","worker.beat")});
/** The engine touches data/worker.beat every 5 s. On Windows PIDs are reused quickly, so a live PID alone is not proof. */
export function beatFresh(root:string,maxAgeMs=60_000){try{return Date.now()-fs.statSync(enginePaths(root).beat).mtimeMs<maxAgeMs;}catch{return false;}}
/** PID of the running engine (from data/worker.lock), or 0. */
export function enginePid(root:string){
 const pid=readPid(enginePaths(root).lock);if(!alive(pid))return 0;
 if(process.platform==="win32"&&!beatFresh(root,90_000))return 0;
 return pid;
}
function childEnv(root:string){
 const env={...process.env};
 try{Object.assign(env,parseEnv(fs.readFileSync(path.join(root,".env.local"),"utf8")));}catch{}
 return env;
}
const tail=(file:string,lines=12)=>{try{return fs.readFileSync(file,"utf8").trimEnd().split("\n").slice(-lines).join("\n");}catch{return "";}};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export async function startEngine(root:string,opts:{waitMs?:number}={}){
 const running=enginePid(root);if(running)return {started:false,pid:running};
 const {log,lock}=enginePaths(root);fs.mkdirSync(path.dirname(log),{recursive:true});
 const out=fs.openSync(log,"a");fs.writeSync(out,`\n=== ${new Date().toISOString()} studio start ===\n`);
 const child=spawn(process.execPath,["--import","tsx","scripts/worker.ts"],{cwd:root,detached:true,windowsHide:true,stdio:["ignore",out,out],env:childEnv(root)});
 child.unref();fs.closeSync(out);
 const until=Date.now()+(opts.waitMs??30_000);
 while(Date.now()<until){
  if(readPid(lock)===child.pid&&alive(child.pid!))return {started:true,pid:child.pid!};
  if(child.exitCode!==null||!alive(child.pid!))break;
  await sleep(250);
 }
 throw new Error(`Движок не запустился. Журнал ${path.relative(root,log)}:\n${tail(log)}`);
}
export async function stopEngine(root:string,opts:{waitMs?:number}={}){
 const pid=enginePid(root);if(!pid)return {stopped:false,pid:0};
 // A stop request the worker polls every tick: a graceful drain on every OS (on Windows a signal is a hard kill).
 fs.writeFileSync(enginePaths(root).stop,String(pid));
 if(process.platform!=="win32")process.kill(pid,"SIGTERM");
 const until=Date.now()+(opts.waitMs??90_000);
 while(Date.now()<until){if(!alive(pid)){fs.rmSync(enginePaths(root).stop,{force:true});return {stopped:true,pid};}await sleep(300);}
 if(process.platform==="win32"){
  // Last resort: the worker did not drain in time; kill it with its children (chrome, ffmpeg, python).
  const {spawnSync}=await import("node:child_process");spawnSync("taskkill",["/PID",String(pid),"/T","/F"],{windowsHide:true});
  for(let i=0;i<20&&alive(pid);i++)await sleep(250);
  if(!alive(pid)){fs.rmSync(enginePaths(root).stop,{force:true});return {stopped:true,pid};}
 }
 throw new Error(`Движок (pid ${pid}) не остановился за ${Math.round((opts.waitMs??90_000)/1000)} с. Журнал: ${path.relative(root,enginePaths(root).log)}`);
}
/** The engine in the foreground of this terminal (logs on screen, Ctrl+C stops it and requeues running jobs). */
export function runEngineForeground(root:string){
 return new Promise<number>(resolve=>{
  const child=spawn(process.execPath,["--import","tsx","scripts/worker.ts"],{cwd:root,stdio:"inherit",env:childEnv(root)});
  if(process.platform==="win32"){
   // The worker shares this console and gets Ctrl+C itself; forwarding a signal would be a hard kill on Windows.
   const ask=()=>{try{fs.writeFileSync(enginePaths(root).stop,String(child.pid));}catch{}};
   process.on("SIGINT",ask);process.on("SIGBREAK",ask);
  }else{
   const forward=(s:NodeJS.Signals)=>()=>child.kill(s);
   process.on("SIGINT",forward("SIGINT"));process.on("SIGTERM",forward("SIGTERM"));
  }
  child.on("exit",code=>resolve(code??0));
 });
}
