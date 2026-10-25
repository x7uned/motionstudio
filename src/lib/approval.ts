import path from "node:path";
import {project,updateProject,event,db,DATA,ROOT} from "./store";
import {digest,fileHash,readJSON,writeJSON,saveAcceptedExample,auditCurrent} from "./quality";

/**
 * Editor approval. Only an explicit human action approves a project: the web button, or (agent mode)
 * the user's own words in chat, quoted verbatim and recorded with the self-declared driving agent.
 */
export async function approveProject(id:string,opts:{feedback?:string|null;agentChat?:{userQuote:string;declaredAgent:string}}={}){
 const p=project(id);if(!p)throw new Error("Проект не найден.");
 const active=db().prepare("SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running')").get(id);
 if(active||!p.video||(!p.imported&&!p.review?.technicalPassed))throw new Error("Сначала завершите рендер и техническую проверку.");
 if(p.profile.production?.version===2){const dir=path.join(DATA,"projects",id),audit=await readJSON(path.join(dir,"fact-audit.json")),sources=await readJSON(path.join(dir,"sources.json"));if(!p.plan||!Array.isArray(sources)||!auditCurrent(audit,p.plan,sources))throw new Error("Проверка фактов относится к другому тексту или версии источников. Сначала выполните актуальную проверку.");}
 if(p.review?.quality){
  const hash=digest({plan:p.plan,profile:p.profile,format:p.format});
  if(p.review.quality.inputHash!==hash||p.review.quality.artifactHash!==await fileHash(path.join(ROOT,p.video!)))throw new Error("Отчёт устарел: сначала проверьте текущий MP4.");
 }
 if(opts.agentChat){
  const quote=opts.agentChat.userQuote.trim();
  if(quote.length<2)throw new Error("Одобрение агентом требует дословной фразы пользователя.");
  await writeJSON(path.join(DATA,"projects",id,"approval.json"),{approvedVia:"agent-chat",userQuote:quote.slice(0,2000),declaredAgent:opts.agentChat.declaredAgent,approvedAt:new Date().toISOString(),videoSha256:await fileHash(path.join(ROOT,p.video!))});
 }
 updateProject(id,{status:"approved",stage:"Принят редактором",feedback:typeof opts.feedback==="string"?opts.feedback.slice(0,2000):null});
 event(id,opts.agentChat?`Редактор принял ролик в чате: «${opts.agentChat.userQuote.trim().slice(0,300)}» (передал ведущий агент ${opts.agentChat.declaredAgent}).`:"Редактор принял ролик.");
 if(!p.imported)await saveAcceptedExample(ROOT,project(id)!);
}
