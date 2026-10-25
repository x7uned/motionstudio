"use client";
import {useCallback,useEffect,useState} from "react";
import {ArrowRight,Check,ExternalLink,KeyRound,RefreshCw,Download,Square,Film,FileText} from "lucide-react";
import ReferenceVideoDetails from "./ReferenceVideoDetails";
import {reelLinks} from "@/lib/video-reference-model";
import {cn} from "@/lib/cn";
type Any=Record<string,any>;
const statuses:Record<string,string>={queued:"В очереди",running:"Обрабатываем",ready:"Готов",partial:"Собран частично",failed:"Нужна проверка",cancelled:"Остановлен",pending:"Ожидает",downloaded:"Скачан",transcribing:"Распознаём речь",transcribed:"Текст готов",analyzing:"Разбираем кадры",complete:"Разобран"};
const categories:Record<string,string>={camera:"Камера",lighting:"Свет",assets:"Ассеты",editing:"Монтаж",hook:"Начало",writing:"Сценарий и речь",structure:"Структура",design:"Композиция",motion:"Анимация",voice:"Темп речи"};
const stamp=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
export default function AuthorsPanel({onUse,onRefresh}:{onUse:(id:string)=>void;onRefresh:()=>void}){
 const [data,setData]=useState<Any|null>(null),[selected,setSelected]=useState(""),[detail,setDetail]=useState<Any|null>(null);
 const [account,setAccount]=useState(""),[name,setName]=useState(""),[frameStep,setFrameStep]=useState<.5|1>(.5),[token,setToken]=useState(""),[showToken,setShowToken]=useState(false);
 const [connection,setConnection]=useState<Any|null>(null),[busy,setBusy]=useState(""),[error,setError]=useState(""),[errorAction,setErrorAction]=useState(""),[notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{const r=await fetch("/api/video-references",{cache:"no-store"});if(!r.ok)throw new Error("Не удалось загрузить подборки.");setData(await r.json());},[]);
 useEffect(()=>{let alive=true;const update=()=>refresh().catch(e=>{if(alive)setError(e.message);});update();const t=setInterval(update,4000);return()=>{alive=false;clearInterval(t);};},[refresh]);
 useEffect(()=>{setDetail(null);if(!selected)return;let alive=true;const update=async()=>{try{const r=await fetch(`/api/video-references?id=${encodeURIComponent(selected)}`,{cache:"no-store"});if(!r.ok)throw new Error("Разбор недоступен.");const value=await r.json();if(alive)setDetail(value);}catch(e){if(alive)setError(e instanceof Error?e.message:"Ошибка загрузки.");}};update();const t=setInterval(update,4000);return()=>{alive=false;clearInterval(t);};},[selected]);
 async function act(action:string,body:Any={}){
  setBusy(action);setError("");setErrorAction(action);setNotice("");
  try{const r=await fetch("/api/video-references",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...body})});const j=await r.json();if(!r.ok)throw new Error(j.error);await refresh();onRefresh();return j;}
  catch(e){setError(e instanceof Error?e.message:"Не удалось выполнить действие.");return null;}finally{setBusy("");}
 }
 let selection:{links:string[];error:string}={links:[],error:""};try{selection.links=reelLinks(account);}catch(e){selection.error=e instanceof Error?e.message:"Проверьте ссылки.";}
 const connected=data?.connections?.apifyConfigured&&data?.connections?.scribeConfigured;
 const active=detail&&["running","queued"].includes(detail.status);
 return <>
  <div className="page-heading"><div className="eyebrow">ВИДЕО → СЦЕНЫ → РЕНДЕР</div><h1>Разборы видео</h1><p>Сценарий, камера, 3D-сцены, объекты, монтаж и темп. До 20 выбранных Reels в одной подборке.</p></div>
  <div className="author-intake">
   <section className="panel">
    <div className="section-heading"><div><h2>Добавить видеореференсы</h2><p>Ссылки на конкретные публичные Reels, по одной в строке</p></div><Film size={22}/></div>
    <form onSubmit={async e=>{e.preventDefault();const j=await act("create",{links:selection.links,name,frameStep});if(j){setSelected(j.id);setAccount("");setName("");setNotice("Импорт добавлен в очередь. Можно закрыть вкладку, сервер продолжит работу.");}}}>
     <label className="author-label" htmlFor="instagram-account">Ссылки на Reels</label>
     <textarea className="author-input reference-links" id="instagram-account" name="reels" placeholder={"https://www.instagram.com/reel/…/\nhttps://www.instagram.com/reel/…/"} value={account} onChange={e=>setAccount(e.target.value)} maxLength={12000} rows={5} required autoComplete="off" spellCheck={false} aria-invalid={!!account.trim()&&!!selection.error} aria-describedby="reference-selection-help"/>
     <p className="author-help" id="reference-selection-help">{account.trim()&&selection.error?<span className="author-error">{selection.error}</span>:`${selection.links.length}/20 видео · одинаковые ссылки объединяются`}</p>
     <div className="reference-options"><label className="author-label">Название подборки<input className="author-input" value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder="Например, 3D-пролёты и текст"/></label><label className="author-label">Шаг кадров<select className="author-input" aria-label="Шаг кадров" value={frameStep} onChange={e=>setFrameStep(Number(e.target.value) as .5|1)}><option value={.5}>0,5 секунды · подробнее</option><option value={1}>1 секунда · быстрее</option></select></label></div>
     {error&&errorAction==="create"&&<p className="author-error" id="instagram-error" role="alert">{error}</p>}
     <p className="author-help">Сохраним оригиналы и транскрипции. Все кадры с выбранным шагом разберём по фрагментам: что происходит, как движется камера и как собрать каждую сцену.</p>
     <div className="author-actions"><button className="button primary" type="submit" disabled={!!busy||!connected||!selection.links.length||!!selection.error}>{busy==="create"?"Проверяем подключение…":`Разобрать видео${selection.links.length?` · ${selection.links.length}`:""}`}<ArrowRight size={16}/></button><span>Apify Free · предел $1 на запуск</span></div>
     {!connected&&data&&<p className="author-help">Сначала подключите сервисы в соседней карточке.</p>}
    </form>
   </section>
   <section className="panel author-connections">
    <div className="section-heading"><div><h2>Подключения</h2><p>Ключи остаются на сервере</p></div><KeyRound size={20}/></div>
    <div className="author-provider"><strong>Apify</strong><span>{connection?.isFree?`Free · осталось $${connection.remainingUsd?.toFixed(2)??"—"}`:data?.connections?.apifyConfigured?"Ключ сохранён":"Нужен API-токен"}</span></div>
    <div className="author-provider"><strong>ElevenLabs Scribe</strong><span>{data?.connections?.scribeConfigured?"Используем ключ студии":"Добавьте ELEVENLABS_API_KEY в .env.local"}</span></div>
    <p className="author-help">Scribe расходует минуты вашего ElevenLabs. На подборку: до 45 минут речи; один ролик до 10 минут.</p>
    <div className="author-actions"><button className="text-button" onClick={()=>setShowToken(!showToken)}>{showToken?"Скрыть поле":data?.connections?.apifyConfigured?"Заменить токен":"Подключить Apify"}</button>{data?.connections?.apifyConfigured&&<button className="text-button" disabled={!!busy} onClick={async()=>{const j=await act("check");if(j){setConnection(j.account);setNotice("Подключение Apify проверено.");}}}>Проверить Free</button>}</div>
    {(showToken||data&&!data.connections.apifyConfigured)&&<form className="author-token" onSubmit={async e=>{e.preventDefault();const j=await act("connect",{token});setToken("");if(j){setConnection(j.account);setShowToken(false);setNotice("Apify Free подключён. Токен сохранён в .env.local.");}}}>
     <label className="author-label" htmlFor="apify-token">API-токен Apify</label><input className="author-input" type="password" id="apify-token" name="apify-token" autoComplete="off" spellCheck={false} value={token} onChange={e=>setToken(e.target.value)} maxLength={256} required/>
     <div className="author-actions"><button type="submit" className="button" disabled={!!busy||token.length<20}>{busy==="connect"?"Проверяем…":"Сохранить и проверить"}</button><a href="https://console.apify.com/settings/integrations" target="_blank" rel="noopener noreferrer">Где взять токен <ExternalLink size={12}/></a></div>
    </form>}
   </section>
  </div>
  {((error&&errorAction!=="create")||notice)&&<div role={error?"alert":"status"} className={cn("message",error?"error":"success")}><span>{error||notice}</span></div>}
  {!data?<p role="status">Загружаем подборки…</p>:data.sets.length===0?<section className="panel author-empty"><Film size={26}/><h2>Здесь будут ваши видеоподборки</h2><p>Добавьте ссылки выше. У каждого видео появятся сценарий по сценам, разбор камеры и объектов, кадры и план реализации.</p></section>:<div className="author-workspace">
   <aside className="author-list" aria-label="Сохранённые подборки">{data.sets.map((a:Any)=><button key={a.id} className={cn("author-list-item",selected===a.id&&"selected")} onClick={()=>setSelected(a.id)}><strong>{a.title}</strong><span>{statuses[a.status]||a.status} · {a.complete}/{a.requested}</span><small>{a.stage}</small></button>)}</aside>
   <section className="panel author-detail">
    {!selected?<p>Выберите подборку, чтобы открыть видео и планы сцен.</p>:!detail?<p role="status">Загружаем разбор…</p>:<>
     <div className="section-heading"><div><h2>{detail.title}</h2><p>{detail.stage}</p></div><a href={detail.url} target="_blank" rel="noopener noreferrer" aria-label="Открыть первое исходное видео"><ExternalLink size={18}/></a></div>
     <div className="author-stats"><span><strong>{detail.found}</strong> получено из {detail.requested}</span><span><strong>{detail.complete}</strong> разобрано</span><span><strong>{detail.costUsd==null?"—":`$${detail.costUsd.toFixed(3)}`}</strong> расход Apify</span></div>
     {active&&<><progress className="author-progress" max={100} value={detail.progress} aria-label="Прогресс импорта"/><p className="author-help">Студия сохраняет каждый этап. Обработка зависит от длительности видео и может занять продолжительное время.</p></>}
     {detail.error&&<p role="alert" className="author-error">{detail.error}</p>}
     <div className="author-actions">
      {active?<button className="button" disabled={!!busy} onClick={()=>act("cancel",{id:detail.id})}><Square size={14}/>Остановить импорт</button>:detail.status!=="ready"&&<button className="button" disabled={!!busy} onClick={()=>act("retry",{id:detail.id})}><RefreshCw size={14}/>Повторить незавершённое</button>}
      {detail.report&&<><button className="button primary" disabled={!detail.renderCapability?.engine} onClick={()=>onUse(detail.id)}>{detail.renderCapability?.engine==="three"?"Создать 3D по разбору":"Использовать разбор"} <ArrowRight size={14}/></button><a className="button" href={detail.profileUrl} target="_blank" rel="noopener noreferrer"><Download size={14}/>Каталог MD</a></>}
     </div>
     {!active&&detail.status!=="ready"&&<p className="author-help">Повтор использует готовые файлы. Незавершённый запрос Scribe может повторно расходовать минуты. Если часть выбранных роликов недоступна, подборка останется частичной.</p>}
     {detail.requiresCustomRenderer&&<p className="reference-render-note">{detail.renderCapability?.reason}</p>}
     {detail.report&&<div className="author-rules"><h3>Приёмы и способы реализации</h3><p>{detail.report.summary}</p>{detail.report.rules.map((rule:Any,i:number)=><article key={i}><small>{categories[rule.category]} · {new Set(rule.evidence.map((e:Any)=>e.videoId)).size}/{detail.complete} роликов</small><p>{rule.rule}</p><details><summary>Примеры и таймкоды</summary>{rule.evidence.map((e:Any,k:number)=>{const v=detail.videos.find((v:Any)=>v.id===e.videoId),o=v?.analysis?.observations[e.observationIndex];return o?<p key={k}><a href={`${v.videoUrl||v.url}#t=${o.at}`} target="_blank" rel="noopener noreferrer">{stamp(o.at)}–{stamp(o.end)}</a> · {o.evidence}</p>:null;})}</details></article>)}<details><summary>Ограничения разбора</summary><ul>{detail.report.limitations.map((v:string,i:number)=><li key={i}>{v}</li>)}</ul></details></div>}
     <div className="author-videos"><h3>Видео и разборы сцен · {detail.videos.length}</h3>{detail.videos.map((v:Any,i:number)=><ReferenceVideoDetails key={v.id} v={v} index={i}/>)}</div>
     <details className="author-log"><summary>Журнал обработки</summary>{detail.events.map((e:Any,i:number)=><p key={i}><time>{new Date(e.created).toLocaleTimeString("ru-RU")}</time> {e.message}</p>)}</details>
    </>}
   </section>
  </div>}
 </>;
}
