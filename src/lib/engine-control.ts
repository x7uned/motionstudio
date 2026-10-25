import fs from "node:fs";
import path from "node:path";
import {spawn} from "node:child_process";
import {parseEnv} from "node:util";

/**
 * Engine and optional UI as background processes of the skill (user decision 2026-10-21): `npm run studio -- start|stop`
 * runs the queue worker without Next.js, `npm run studio -- ui` starts the web UI on 127.0.0.1 only when a person asks.
 * Both read the same data/studio.sqlite. Secrets from .env.local go only into the child's environment, as `npm start` did.
 */
const alive=(pid:number)=>{if(!Number.isInteger(pid)||pid<=0)return false;try{process.kill(pid,0);return true;}catch(e:any){return e.code==="EPERM";}};
const readPid=(file:string)=>{try{return Number(fs.readFileSync(file,"utf8").trim());}catch{return 0;}};
export const enginePaths=(root:string)=>({lock:path.join(root,"data","worker.lock"),log:path.join(root,"data","logs","engine.log"),uiPid:path.join(root,"data","ui.pid"),uiLog:path.join(root,"data","logs","ui.log")});
/** PID of the running engine (from data/worker.lock), or 0. */
export function enginePid(root:string){const pid=readPid(enginePaths(root).lock);return alive(pid)?pid:0;}
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
 const child=spawn(process.execPath,["--import","tsx","scripts/worker.ts"],{cwd:root,detached:true,stdio:["ignore",out,out],env:childEnv(root)});
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
 process.kill(pid,"SIGTERM");
 const until=Date.now()+(opts.waitMs??90_000);
 while(Date.now()<until){if(!alive(pid))return {stopped:true,pid};await sleep(300);}
 throw new Error(`Движок (pid ${pid}) не остановился за ${Math.round((opts.waitMs??90_000)/1000)} с. Журнал: ${path.relative(root,enginePaths(root).log)}`);
}
/** The engine in the foreground of this terminal (logs on screen, Ctrl+C stops it and requeues running jobs). */
export function runEngineForeground(root:string){
 return new Promise<number>(resolve=>{
  const child=spawn(process.execPath,["--import","tsx","scripts/worker.ts"],{cwd:root,stdio:"inherit",env:childEnv(root)});
  const forward=(s:NodeJS.Signals)=>()=>child.kill(s);
  process.on("SIGINT",forward("SIGINT"));process.on("SIGTERM",forward("SIGTERM"));
  child.on("exit",code=>resolve(code??0));
 });
}
/** True when the Motion Studio web UI answers on 127.0.0.1:port (and not some other server). */
export async function uiUp(port:number){
 try{const r=await fetch(`http://127.0.0.1:${port}/api/studio?events=ui-probe`,{signal:AbortSignal.timeout(2500)});return r.ok&&Array.isArray(await r.json());}catch{return false;}
}
async function portFree(port:number){
 const net=await import("node:net");
 return new Promise<boolean>(resolve=>{const s=net.createServer();s.once("error",()=>resolve(false));s.listen(port,"127.0.0.1",()=>s.close(()=>resolve(true)));});
}
export async function startUi(root:string,port:number,opts:{dev?:boolean;waitMs?:number}={}){
 const url=`http://127.0.0.1:${port}`;
 if(await uiUp(port))return {started:false,url,pid:readPid(enginePaths(root).uiPid)||null};
 if(!await portFree(port))throw new Error(`Порт ${port} занят другим процессом. Выбери другой: npm run studio -- config set ui.port 3211`);
 if(!opts.dev&&!fs.existsSync(path.join(root,".next","BUILD_ID")))throw new Error("UI ещё не собран: npm run build (или npm run studio -- ui --dev).");
 const {uiLog,uiPid}=enginePaths(root);fs.mkdirSync(path.dirname(uiLog),{recursive:true});
 const out=fs.openSync(uiLog,"a");fs.writeSync(out,`\n=== ${new Date().toISOString()} studio ui ===\n`);
 // Only the loopback interface: the studio is never exposed on public interfaces.
 const child=spawn(process.execPath,["node_modules/next/dist/bin/next",opts.dev?"dev":"start","--hostname","127.0.0.1","--port",String(port)],{cwd:root,detached:true,stdio:["ignore",out,out],env:{...childEnv(root),PORT:String(port)}});
 child.unref();fs.closeSync(out);fs.writeFileSync(uiPid,String(child.pid));
 const until=Date.now()+(opts.waitMs??60_000);
 while(Date.now()<until){
  if(await uiUp(port))return {started:true,url,pid:child.pid!};
  if(!alive(child.pid!))break;
  await sleep(500);
 }
 throw new Error(`UI не ответил на ${url}. Журнал ${path.relative(root,uiLog)}:\n${tail(uiLog)}`);
}
export async function stopUi(root:string){
 const {uiPid}=enginePaths(root),pid=readPid(uiPid);
 if(!pid||!alive(pid)){fs.rmSync(uiPid,{force:true});return false;}
 process.kill(pid,"SIGTERM");
 for(let i=0;i<40&&alive(pid);i++)await sleep(250);
 fs.rmSync(uiPid,{force:true});return true;
}
