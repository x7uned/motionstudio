import {NextRequest,NextResponse} from "next/server";
import {reelLinks} from "@/lib/video-reference-model";
import {sameOrigin} from "@/lib/http";
import {z} from "zod";
import {authors,author,publicAuthor,createReferenceSet,authorVideos,updateAuthor,updateAuthorVideo,authorEvent} from "@/lib/author-store";
import {serverSecrets,saveApifyToken} from "@/lib/server-secrets";
import {apifyAccount,apify} from "@/lib/author-providers";
import {enqueue,db} from "@/lib/store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const response=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:NextRequest){
 if(!sameOrigin(req))return response({error:"Разрешены только запросы из локальной студии."},403);
 const keys=await serverSecrets();
 const id=req.nextUrl.searchParams.get("id");
 if(id){const a=author(id);return a?response(publicAuthor(a,true)):response({error:"Профиль не найден."},404);}
 return response({sets:authors().map(a=>publicAuthor(a)),authors:authors().map(a=>publicAuthor(a)),connections:{apifyConfigured:!!keys.APIFY_TOKEN,scribeConfigured:!!keys.ELEVENLABS_API_KEY}});
}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return response({error:"Разрешены только запросы из локальной студии."},403);
 try{
  if(Number(req.headers.get("content-length")||0)>16000)throw new Error("Слишком большой запрос.");
  const b=await req.json();
  if(b.action==="connect"){
   const token=z.string().trim().min(20).max(256).parse(b.token);
   const account=await apifyAccount(token);
   if(!account.isFree)throw new Error("Выберите Apify Free. Студия не подключает платные тарифы.");
   await saveApifyToken(token);return response({ok:true,account});
  }
  if(b.action==="check")return response({ok:true,account:await apifyAccount()});
  if(b.action==="create"){
   const links=reelLinks(z.union([z.string().max(12000),z.array(z.string().max(600)).max(100)]).parse(b.links));
   const name=z.string().trim().max(80).optional().parse(b.name);
   const frameStep=z.union([z.literal(.5),z.literal(1)]).default(.5).parse(b.frameStep);
   const keys=await serverSecrets();
   if(!keys.APIFY_TOKEN)throw new Error("Сначала подключите Apify.");
   if(!keys.ELEVENLABS_API_KEY)throw new Error("Не настроен ElevenLabs для транскрипций.");
   const a=await apifyAccount();if(!a.isFree)throw new Error("Для импорта нужен тариф Apify Free.");
   const id=createReferenceSet({links,name,frameStep});return response({ok:true,id});
  }
  const id=z.string().uuid().parse(b.id),a=author(id);if(!a)throw new Error("Профиль не найден.");
  const active=db().prepare("SELECT id FROM jobs WHERE project_id=? AND kind='author-import' AND status IN ('queued','running')").get(id);
  if(b.action==="retry"){
   if(active)throw new Error("Обработка ещё выполняется.");
   for(const v of authorVideos(id))if(v.status!=="complete"&&v.state.scribePending){const state={...v.state,scribePending:false};updateAuthorVideo(v.id,{state});}
   enqueue(id,"author-import");updateAuthor(id,{status:"queued",stage:"Продолжаем незавершённое",error:null});authorEvent(id,"Редактор запросил продолжение. Готовые этапы переиспользуются; незавершённый запрос Scribe может снова расходовать минуты.");return response({ok:true,id});
  }
  if(b.action==="cancel"){
   updateAuthor(id,{status:"cancelled",stage:"Остановлен пользователем"});
   db().prepare("UPDATE jobs SET status='cancelled',finished=? WHERE project_id=? AND kind='author-import' AND status='queued'").run(new Date().toISOString(),id);
   if(a.state.runId&&!a.state.discoveryDone)await apify(`actor-runs/${encodeURIComponent(a.state.runId)}/abort`,{method:"POST"}).catch(()=>{});
   authorEvent(id,"Импорт остановлен. Уже полученные материалы сохранены.");return response({ok:true,id});
  }
  throw new Error("Неизвестное действие.");
 }catch(e){return response({error:e instanceof z.ZodError?"Проверьте поля формы.":e instanceof Error?e.message:"Не удалось выполнить действие."},400);}
}
