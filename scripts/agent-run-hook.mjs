// Claude Code PostToolUse(Bash) hook: remember which studio runs this chat session started.
// `npm run studio -- create|refs add` prints MOTION_STUDIO_RUN=<id>; the Stop hook keeps the session working until they finish.
import fs from "node:fs";
import path from "node:path";
import {randomUUID} from "node:crypto";

export function runIds(text){return [...String(text??"").matchAll(/MOTION_STUDIO_RUN=([a-f0-9-]{36})/g)].map(m=>m[1]);}
export function releaseIds(text){return [...String(text??"").matchAll(/MOTION_STUDIO_RELEASE=([a-f0-9-]{36})/g)].map(m=>m[1]);}
export function recordRuns(root,sessionId,ids,now=new Date(),released=[]){
 if((!ids.length&&!released.length)||!/^[A-Za-z0-9_-]{1,128}$/.test(String(sessionId)))return null;
 const file=path.join(root,"data","agent-runs",`${sessionId}.json`);
 let state={projects:[],blocks:null};
 try{state={...state,...JSON.parse(fs.readFileSync(file,"utf8"))};}catch{}
 for(const id of ids)if(!state.projects.some(p=>p.id===id))state.projects.push({id,addedAt:now.toISOString()});
 // `npm run studio -- release <id>`: another session (or the user) drives this run now; stop holding this session.
 if(released.length){state.projects=state.projects.filter(p=>!released.includes(p.id));state.blocks=null;}
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const tmp=`${file}.${randomUUID()}.tmp`;fs.writeFileSync(tmp,JSON.stringify(state,null,2));fs.renameSync(tmp,file);
 return state;
}
function main(){
 try{
  const input=JSON.parse(fs.readFileSync(0,"utf8"));
  // Claude Code puts Bash output in tool_response.stdout; Codex uses its own fields: scan the whole hook input.
  recordRuns(process.env.CLAUDE_PROJECT_DIR||input.cwd||process.cwd(),input.session_id,[...new Set(runIds(JSON.stringify(input)))],new Date(),[...new Set(releaseIds(JSON.stringify(input)))]);
 }catch{}
 process.exit(0);
}
if(process.argv[1]&&import.meta.url===new URL(`file://${path.resolve(process.argv[1])}`).href)main();
