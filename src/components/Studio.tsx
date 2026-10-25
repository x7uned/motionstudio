"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Plus,
  Play,
  Film,
  Clapperboard,
  Library,
  Layers3,
  SlidersHorizontal,
  Settings2,
  Check,
  CheckCheck,
  Clock3,
  Mic2,
  VolumeX,
  Box,
  Monitor,
  Smartphone,
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Download,
  RotateCw,
  Square,
  Activity,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  FolderOpen,
  Menu,
  X,
  Save,
  Eye,
  CheckCircle2,
} from "lucide-react";
import ResearchPanel from "./ResearchPanel";
import VoicePanel from "./VoicePanel";
import QualityPanel from "./QualityPanel";
import AuthorsPanel from "./AuthorsPanel";
import ModelsPanel from "./ModelsPanel";
import { cn } from "@/lib/cn";
import type { Storyboard, StyleProfile } from "@/lib/model";
type Any = Record<string, any>;
const statusNames: Record<string, string> = {
  queued: "В очереди",
  running: "Создаётся",
  review: "На просмотре",
  approved: "Принят",
  failed: "Нужна доработка",
  revision: "На доработке",
  draft: "Черновик",
  cancelled: "Остановлен",
  "awaiting-agent": "Ждёт агента",
  "awaiting-user": "Ждёт решения",
  paused: "На паузе",
};
// Agent mode: a project waiting for the chat agent or for the user's decision is still in production;
// a paused project keeps its held job (npm run studio -- resume).
const BUSY = ["queued", "running", "awaiting-agent", "awaiting-user", "paused"];
const isBusy = (status: string) => BUSY.includes(status);
const nav = [
  { id: "studio", label: "Студия", icon: Clapperboard },
  { id: "library", label: "Библиотека", icon: Library },
  { id: "templates", label: "Шаблоны", icon: FileText },
  { id: "authors", label: "Разборы видео", icon: Eye },
  { id: "models", label: "3D-рендер", icon: Box },
  { id: "style", label: "Стиль автора", icon: Layers3 },
  { id: "queue", label: "Очередь и ревью", icon: CheckCheck },
];
const time = (date: string) =>
  new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
function Badge({ status }: { status: string }) {
  return (
    <span className={cn("badge", status)}>
      <i />
      {statusNames[status] || status}
    </span>
  );
}
function Poster({ p }: { p: Any }) {
  return (
    <div className="poster">
      {p.posterUrl ? (
        <img src={p.posterUrl} alt={`Кадр: ${p.title}`} />
      ) : (
        <div className="poster-placeholder">
          <Film size={32} />
          <span>{p.title}</span>
        </div>
      )}
      <div className="poster-overlay" />
      <span className="poster-format">{p.format}</span>
      <span className="poster-duration">{p.duration} сек</span>
      <span className="poster-play">
        <Play size={18} fill="currentColor" />
      </span>
    </div>
  );
}
export default function Studio() {
  const [data, setData] = useState<Any | null>(null);
  const [health, setHealth] = useState<Any | null>(null);
  const [view, setView] = useState("studio");
  const [selected, setSelected] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(60);
  const [format, setFormat] = useState("9:16");
  const [voice, setVoice] = useState(true);
  const [voiceMode,setVoiceMode]=useState("selected");
  const [productionTemplateId,setProductionTemplateId]=useState("");
  const [authorProfileId,setAuthorProfileId]=useState("");
  const [authorProfiles,setAuthorProfiles]=useState<Any[]>([]);
  const [renderMode,setRenderMode]=useState("auto");
  const [contentModel,setContentModel]=useState("gpt-6.1-sol");
  const [factCheck,setFactCheck]=useState("off");
  const [language,setLanguage]=useState("ru");
  const [models,setModels]=useState<Any[]>([]),[modelIds,setModelIds]=useState<string[]>([]);
  useEffect(()=>{if(view==="studio")fetch("/api/models").then(r=>r.json()).then(j=>setModels(j.models||[])).catch(()=>{});},[view]);
  const refreshAuthors=useCallback(async()=>{try{const r=await fetch("/api/video-references",{cache:"no-store"});if(r.ok)setAuthorProfiles((await r.json()).sets);}catch{}},[]);
  useEffect(()=>{refreshAuthors();},[refreshAuthors]);
  const selectedTemplate=data?.videoTemplates?.find((t:Any)=>t.id===productionTemplateId);
  function chooseTemplate(id:string){
    setProductionTemplateId(id);
    const t=data?.videoTemplates?.find((x:Any)=>x.id===id);
    if(t){setDuration(t.defaults.duration);setFormat(t.defaults.format);setVoice(t.defaults.voice);setRenderMode(t.runtime?.renderMode??"auto");setModelIds([]);}
  }
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobile, setMobile] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Storyboard | null>(null);
  const [tab, setTab] = useState("script");
  const [feedback, setFeedback] = useState("");
  const [logs, setLogs] = useState<Any[]>([]);
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [addingText, setAddingText] = useState(false);
  const [removedRef, setRemovedRef] = useState<string | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/studio", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setError("Студия недоступна. Проверьте, запущен ли локальный сервер.");
    }
  }, []);
  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await (await fetch("/api/studio?health=1")).json());
    } catch {}
  }, []);
  useEffect(() => {
    refresh();
    refreshHealth();
    const t = setInterval(refresh, 3500);
    return () => clearInterval(t);
  }, [refresh, refreshHealth]);
  const p = data?.projects.find((x: Any) => x.id === selected);
  const planKey = JSON.stringify(p?.plan ?? null);
  const profileKey = JSON.stringify(data?.profile ?? null);
  useEffect(() => {
    setEditor(p?.plan ? structuredClone(p.plan) : null);
  }, [selected, planKey]);
  useEffect(() => {
    if (!profileDirty && data?.profile)
      setProfile(structuredClone(data.profile));
  }, [profileKey, profileDirty]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    const get = async () => {
      const r = await fetch(`/api/studio?events=${selected}`);
      if (active && r.ok) setLogs(await r.json());
    };
    get();
    const t = setInterval(get, 4000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [selected]);
  async function action(action: string, body: Any = {}) {
    setBusy(action);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
      return d;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось выполнить действие.",
      );
      return null;
    } finally {
      setBusy("");
    }
  }
  function go(v: string) {
    setView(v);
    setSelected(null);
    setMobile(false);
    setError("");
    setNotice("");
  }
  function open(pr: Any) {
    setSelected(pr.id);
    setView("project");
    setTab(pr.status === "review" ? "review" : "script");
    setFeedback(pr.feedback || "");
    setError("");
    setNotice("");
  }
  async function create() {
    const d = await action("create", { topic, duration, format, voice, voiceMode, renderMode, modelIds, contentModel, factCheck, ...(language==="en"?{language}:{}), ...(productionTemplateId?{productionTemplateId}:{}),...(authorProfileId?{referenceSetId:authorProfileId}:{}) });
    if (d) {
      setSelected(d.id);
      setView("project");
      setTab("script");
      setTopic("");
    }
  }
  async function files(files: FileList | File[] | null) {
    if (!files?.length) return;
    setBusy("upload");
    setError("");
    try {
      for (const f of Array.from(files)) {
        const form = new FormData();
        form.set("file", f);
        const r = await fetch("/api/references", {
          method: "POST",
          body: form,
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
      }
      await refresh();
      setNotice("Материалы добавлены. Можно извлечь правила автора.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить файл.");
    } finally {
      setBusy("");
      if (upload.current) upload.current.value = "";
    }
  }
  async function addTranscript() {
    setBusy("upload");
    setError("");
    try {
      const form = new FormData();
      form.set("text", transcript);
      form.set("name", referenceName || "Транскрипт видео");
      const r = await fetch("/api/references", { method: "POST", body: form });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setTranscript("");
      setReferenceName("");
      setAddingText(false);
      await refresh();
      setNotice("Транскрипт сохранён.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось сохранить транскрипт.",
      );
    } finally {
      setBusy("");
    }
  }
  const all = data?.projects || [];
  const active = all.filter((x: Any) => isBusy(x.status));
  const reviewing = all.filter((x: Any) => x.status === "review");
  const finished = all.filter((x: Any) => x.videoUrl);
  const styleJob = data?.jobs.find(
    (j: Any) => j.kind === "style" && ["queued", "running"].includes(j.status),
  );
  const heading: Record<string, string> = {
    studio: "Рабочее пространство",
    library: "Библиотека роликов",
    style: "Стиль автора",
    authors:"Разборы видео",
    templates:"Шаблоны",
    queue: "Очередь и ревью",
    settings: "Настройки",
    project: "Редактор проекта",
  };
  const updateProfile = (key: string, value: any) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    setProfileDirty(true);
  };
  return (
    <div className="shell">
      <a className="skip" href="#main">
        К содержимому
      </a>
      <aside id="studio-navigation" className={cn("sidebar", mobile && "open")}>
        <button
          className="brand"
          onClick={() => go("studio")}
          aria-label="Кадр, главная"
        >
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>
            кадр<span className="brand-dot">.</span>
            <small>MOTION STUDIO</small>
          </span>
        </button>
        <div className="workspace">
          <div className="workspace-icon">
            <FolderOpen size={18} />
          </div>
          <div>
            Моя студия<small>Локальное пространство</small>
          </div>
          <span className="online-dot" />
        </div>
        <div className="nav-label">ПРОИЗВОДСТВО</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={cn("nav-item", view === n.id && "selected")}
              onClick={() => go(n.id)}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.id === "queue" && active.length + reviewing.length > 0 && (
                <em>{active.length + reviewing.length}</em>
              )}
              {view === n.id && <span className="nav-active" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="online-dot" />
            <strong>Всё остаётся у вас</strong>
            <p>Проекты, исходники и результаты — в папке студии.</p>
            <span>
              LOCAL STORAGE <ArrowUpRight size={13} />
            </span>
          </div>
          <button
            className={cn("nav-item", view === "settings" && "selected")}
            onClick={() => go("settings")}
          >
            <Settings2 size={19} />
            Настройки
          </button>
          <div className="identity">
            <div>MS</div>
            <span>
              Личная студия<small>Версия 0.1 · локально</small>
            </span>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Закрыть меню"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="body-wrap">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Открыть меню"
              aria-expanded={mobile}
              aria-controls="studio-navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Моя студия</span>
            <ChevronRight size={14} />
            <strong>{heading[view]}</strong>
          </div>
          <div className="top-meta">
            <span className="local-pill">
              <span className="online-dot" />
              На этом компьютере
            </span>
            <span className="avatar">MS</span>
          </div>
        </header>
        <main id="main" className="main">
          {(error || notice) && (
            <div
              role={error ? "alert" : "status"}
              className={cn("message", error ? "error" : "success")}
            >
              {error ? <AlertCircle size={18} /> : <Check size={18} />}
              <span>{error || notice}</span>
              {notice && removedRef && (
                <button
                  className="text-button"
                  onClick={async () => {
                    await action("restoreReference", { id: removedRef });
                    setRemovedRef(null);
                    setNotice("Материал возвращён.");
                  }}
                >
                  Вернуть
                </button>
              )}
              <button
                className="icon-button"
                aria-label="Скрыть сообщение"
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!data ? (
            <div className="loading-layout" aria-label="Загрузка студии">
              <div />
              <div />
              <div />
            </div>
          ) : (
            <>
              {view === "studio" && (
                <>
                  <div className="page-intro">
                    <div>
                      <div className="eyebrow">ОТ ИДЕИ ДО КАДРА</div>
                      <h1>
                        Хорошая история
                        <br />
                        начинается с темы.
                      </h1>
                      <p>
                        Вы задаёте направление. Студия исследует тему и собирает
                        сценарий,
                        <br className="desktop-break" /> анимацию и озвучку в
                        один короткий ролик.
                      </p>
                    </div>
                    <div className="intro-stamp">
                      <div className="stamp-bars">▂ ▅ ▃ ▇ ▄ ▂ ▆</div>
                      <span>Ваша следующая история</span>
                      <strong>00:30 — 02:30</strong>
                    </div>
                  </div>
                  <div className="create-layout">
                    <section className="composer">
                      <div className="section-label">
                        <span>
                          <Sparkles size={17} />
                          НОВЫЙ РОЛИК
                        </span>
                        <span className="quiet">01 / Идея</span>
                      </div>
                      <label className="topic-label" htmlFor="topic">
                        О чём расскажем?
                      </label>
                      <textarea
                        id="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Например, как работает CI/CD — на примере доставки пиццы"
                        maxLength={1500}
                        rows={3}
                      />
                      <div className="suggestions">
                        <span>Попробуйте:</span>
                        {[
                          "Как работает API",
                          "Зачем нужен Docker",
                          "Что такое CI/CD",
                        ].map((x) => (
                          <button key={x} onClick={() => setTopic(x)}>
                            {x}
                            <ArrowUpRight size={12} />
                          </button>
                        ))}
                      </div>
                      <div className="template-choice"><label htmlFor="author-profile">Видеореференсы</label><select id="author-profile" value={authorProfileId} onChange={e=>setAuthorProfileId(e.target.value)}><option value="">Текущие правила студии</option>{authorProfiles.filter(a=>a.renderCapability?.engine&&a.report&&["ready","partial"].includes(a.status)).map(a=><option key={a.id} value={a.id}>{a.title} · {a.complete} видео{a.renderCapability?.engine==="three"?" · 3D":""}</option>)}</select><div className="template-choice-note"><p>По 3D-разборам автоматически включается объёмный рендер с моделями, светом и камерой.</p><button type="button" className="text-button" onClick={()=>go("authors")}>Добавить референсы</button></div></div>
                      <div className="template-choice">
                        <label htmlFor="video-template">ШАБЛОН ВИДЕО</label>
                        <select id="video-template" aria-label="Шаблон видео" value={productionTemplateId} onChange={e=>chooseTemplate(e.target.value)}>
                          <option value="">Текущий стиль автора</option>
                          {data.videoTemplates?.filter((t:Any)=>!t.styleSample).map((t:Any)=><option key={t.id} value={t.id}>{t.name} · v{t.version}</option>)}
                        </select>
                        {selectedTemplate&&<div className="template-choice-note"><p>{selectedTemplate.description}</p><a href={`/api/assets/${selectedTemplate.basePath}/README.md`} target="_blank" rel="noopener noreferrer">Инструкция шаблона <ArrowUpRight size={13}/></a></div>}
                      </div>
                      <div className="template-choice"><label htmlFor="content-model">Модель сценария</label><select id="content-model" value={contentModel} onChange={e=>setContentModel(e.target.value)}><option value="gpt-6.1-sol">GPT‑6.1 Sol · xhigh</option><option value="claude-opus-5-5">Claude Opus 5.5 · xhigh</option></select><div className="template-choice-note"><p>Поиск, исследование, рассказ, редактура, фактчекинг, визуальная концепция и ревью кадров. Выбор сохраняется в проекте; модель не подменяется автоматически.</p></div></div>
                      <div className="template-choice"><label htmlFor="film-language">Язык ролика</label><select id="film-language" value={productionTemplateId==="tech-story"?"ru":language} onChange={e=>setLanguage(e.target.value)} disabled={productionTemplateId==="tech-story"}><option value="ru">Русский</option><option value="en">English · голос Dennis v4</option></select><div className="template-choice-note"><p>{language==="en"&&productionTemplateId!=="tech-story"?"Сценарий, экранные подписи, голос, сверка Scribe и заставка — на английском. Пояснения для редактора остаются по-русски.":"По умолчанию ролик русский. Английский — явный выбор, сохраняется в проекте; шаблон «История технологий» остаётся русским."}</p></div></div>
                      <div className="template-choice"><label htmlFor="fact-check">Фактчекинг</label><select id="fact-check" value={factCheck} onChange={e=>setFactCheck(e.target.value)}><option value="off">Выключен · пересказ найденного материала</option><option value="lenient">Мягкий · останавливают только противоречия</option><option value="strict">Строгий · каждое утверждение с цитатой</option></select><div className="template-choice-note"><p>{factCheck==="off"?"По умолчанию: студия находит материал и живо пересказывает его. Утверждения не проверяются и озвучку не останавливают; источники сохраняются в проекте.":factCheck==="lenient"?"Сценарист пишет образнее, неподтверждённые формулировки остаются в отчёте, не останавливая озвучку. Числа, имена и события по-прежнему берутся из источников.":"Каждое утверждение речи и подписей требует дословной цитаты из прочитанного источника; неподтверждённое останавливает озвучку."}</p></div></div>
                      <div className="template-choice"><label htmlFor="render-mode">Рендер</label><select id="render-mode" value={renderMode} onChange={e=>{setRenderMode(e.target.value);if(e.target.value!=="three")setModelIds([]);}} disabled={!!productionTemplateId}><option value="auto">Автоматически по разбору</option><option value="2d">Схемы и текст · 2D</option><option value="three">Модели и камера · 3D</option></select><div className="template-choice-note"><p>3D-режиссёр составит исполняемый план по сценарию и референсам. Плавное движение, общий таймлайн с озвучкой, экспорт MP4.</p><button type="button" className="text-button" onClick={()=>go("models")}>Библиотека моделей</button></div></div>
                      {(renderMode==="three"||(renderMode==="auto"&&authorProfiles.find(a=>a.id===authorProfileId)?.renderCapability?.engine==="three"))&&<fieldset className="model-selection"><legend>Свои модели · необязательно</legend>{models.length?models.map(m=><label key={m.id}><input type="checkbox" checked={modelIds.includes(m.id)} disabled={!modelIds.includes(m.id)&&modelIds.length>=8} onChange={e=>setModelIds(e.target.checked?[...modelIds,m.id]:modelIds.filter(id=>id!==m.id))}/>{m.name}</label>):<p>Доступны детальные сборки автомобиля, пневмосистемы и электропривода. Для другого главного предмета загрузите GLB/GLTF в разделе «3D-рендер».</p>}</fieldset>}
                      <div className="composer-controls">
                        <label>
                          <span>ФОРМАТ</span>
                          <select
                            aria-label="Формат видео"
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                          >
                            <option>9:16</option>
                            <option disabled={!!productionTemplateId}>16:9</option>
                          </select>
                        </label>
                        <label>
                          <span>ДЛИТЕЛЬНОСТЬ</span>
                          <select
                            aria-label="Длительность видео"
                            value={duration}
                            onChange={(e) =>
                              setDuration(Number(e.target.value))
                            }
                          >
                            <option value={30}>30 секунд</option>
                            <option value={45}>45 секунд</option>
                            <option value={60}>60 секунд</option>
                            <option value={150}>2 минуты 30 секунд</option>
                          </select>
                        </label>
                        <label className="voice-control">
                          <input
                            type="checkbox"
                            checked={voice}
                            onChange={(e) => setVoice(e.target.checked)}
                          />
                          <Mic2 size={17} />
                          <span>Русская озвучка</span>
                        </label>
                      </div>
                      {voice&&<label className="field">Голос для этого ролика<select value={voiceMode} onChange={e=>setVoiceMode(e.target.value)}><option value="selected">Выбранный в сравнении или текущий голос</option><option value="baseline">Текущий голос · v2, в том числе для длинного рассказа</option></select><small>Для v4 проверенный предел одного дубля — 2000символов. Голос и модель не меняются автоматически.</small></label>}
                      <div className="composer-footer">
                        <span>
                          <span
                            className="tiny-swatch"
                            style={{ background: data.profile.accent }}
                          />
                          {selectedTemplate?.name??data.profile.name}
                          <span className="divider-dot">·</span>Remotion
                        </span>
                        <button
                          className="button primary"
                          disabled={
                            topic.trim().length < 4 ||
                            !!busy ||
                            !health?.authenticated
                          }
                          onClick={create}
                        >
                          {busy === "create" ? "Добавляем…" : "Создать ролик"}
                          <ArrowRight size={17} />
                        </button>
                      </div>
                      {health && !health.authenticated && (
                        <p className="inline-error">
                          Для генерации войдите в Codex через приложение. Статус
                          доступен в Настройках.
                        </p>
                      )}
                    </section>
                    <aside className="pipeline-card">
                      <div className="section-label">
                        <span>ВНУТРИ ПРОЦЕССА</span>
                        <span className="mini-number">8</span>
                      </div>
                      <h2>
                        Идея становится
                        <br />
                        историей.
                      </h2>
                      <ol className="pipeline-list">
                        {[
                          [
                            "Исследование",
                            "Первоисточники, факты и интересный ракурс",
                            FileText,
                          ],
                          [
                            "Сценарий",
                            `${contentModel==="claude-opus-5-5"?"Claude Opus 5.5":"GPT‑6.1 Sol"} · xhigh · цельный рассказ, редактор и факты`,
                            FileText,
                          ],
                          ["Визуальная идея", `Отдельный ${contentModel==="claude-opus-5-5"?"Claude Opus 5.5":"GPT‑6.1 Sol"} · xhigh · что показать зрителю`, Sparkles],
                          ["3D-сборка", "Отдельный Claude Opus 5.5 · xhigh · детальные предметы", Box],
                          ["Озвучка", "Один связный дубль, измеренный по словам", Mic2],
                          [
                            "Анимация",
                            "Motion и 3D: Claude Opus 5.5 · Extra High",
                            Clapperboard,
                          ],
                          [
                            "Проверка",
                            "Файл, тайминги и ревью кадров",
                            CheckCheck,
                          ],
                          [
                            "Ваш просмотр",
                            "Принять или вернуть на доработку",
                            Eye,
                          ],
                        ].map(([title, sub, Icon]: any, i) => (
                          <li key={title}>
                            <div className="pipeline-icon">
                              <Icon size={17} />
                            </div>
                            <div>
                              <strong>{title}</strong>
                              <small>{sub}</small>
                            </div>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                          </li>
                        ))}
                      </ol>
                    </aside>
                  </div>
                  {active.length > 0 && (
                    <button
                      className="active-job"
                      onClick={() => open(active[0])}
                    >
                      <span className="activity-icon">
                        <Activity size={20} />
                      </span>
                      <div>
                        <strong>{active[0].title}</strong>
                        <small>
                          {active[0].stage} · {active[0].progress}%
                        </small>
                      </div>
                      <span className="progress-track">
                        <span style={{ width: `${active[0].progress}%` }} />
                      </span>
                      <ArrowRight size={18} />
                    </button>
                  )}
                  <section className="recent-section">
                    <div className="section-heading">
                      <div>
                        <h2>
                          Последние работы{" "}
                          <span>
                            {finished.length.toString().padStart(2, "0")}
                          </span>
                        </h2>
                        <p>
                          Готовые ролики и версии из нашего рабочего процесса
                        </p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => go("library")}
                      >
                        Вся библиотека
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                    <div className="video-grid">
                      {all.slice(0, 3).map((x: Any) => (
                        <button
                          key={x.id}
                          className="video-card"
                          onClick={() => open(x)}
                        >
                          <Poster p={x} />
                          <div className="video-card-body">
                            <div className="card-meta">
                              <span>
                                {x.imported ? "ИЗ АРХИВА" : "ПРОЕКТ СТУДИИ"}
                              </span>
                              <span>{time(x.created)}</span>
                            </div>
                            <h3>{x.title}</h3>
                            <div className="video-card-bottom">
                              <Badge status={x.status} />
                              <span>
                                {x.voice ? (
                                  <Mic2 size={14} />
                                ) : (
                                  <VolumeX size={14} />
                                )}
                                RU
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                  <button className="style-banner" onClick={() => go("style")}>
                    <div className="style-symbol">
                      <Layers3 size={26} />
                    </div>
                    <div>
                      <span>СЛЕДУЮЩИЙ ШАГ</span>
                      <h3>Сделаем подачу узнаваемой</h3>
                      <p>
                        Добавьте кадры и транскрипты автора. Соберём его
                        визуальные и сценарные приёмы в профиль.
                      </p>
                    </div>
                    <span className="banner-arrow">
                      <ArrowUpRight size={22} />
                    </span>
                  </button>
                </>
              )}
              {view === "library" && (
                <>
                  <div className="page-heading">
                    <div className="eyebrow">ВСЕ ВЕРСИИ В ОДНОМ МЕСТЕ</div>
                    <h1>Библиотека</h1>
                    <p>Видео, сценарии и результаты проверок.</p>
                  </div>
                  <div className="toolbar">
                    <div className="segmented">
                      {[
                        ["all", "Все"],
                        ["review", "На просмотре"],
                        ["approved", "Принятые"],
                        ["revision", "На доработке"],
                      ].map(([v, t]) => (
                        <button
                          key={v}
                          className={cn(filter === v && "active")}
                          onClick={() => setFilter(v)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <input
                      aria-label="Поиск по библиотеке"
                      className="search"
                      placeholder="Найти ролик…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <div className="video-grid">
                    {all
                      .filter(
                        (x: Any) =>
                          (filter === "all" || x.status === filter) &&
                          x.title.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((x: Any) => (
                        <button
                          className="video-card"
                          key={x.id}
                          onClick={() => open(x)}
                        >
                          <Poster p={x} />
                          <div className="video-card-body">
                            <div className="card-meta">
                              <span>
                                {x.imported ? "ИЗ АРХИВА" : "ПРОЕКТ СТУДИИ"}
                              </span>
                              <span>{time(x.created)}</span>
                            </div>
                            <h3>{x.title}</h3>
                            <div className="video-card-bottom">
                              <Badge status={x.status} />
                              <span>
                                {x.voice ? (
                                  <Mic2 size={14} />
                                ) : (
                                  <VolumeX size={14} />
                                )}{" "}
                                RU
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                  {!all.some(
                    (x: Any) =>
                      (filter === "all" || x.status === filter) &&
                      x.title.toLowerCase().includes(query.toLowerCase()),
                  ) && (
                    <div className="empty">
                      <Library size={32} />
                      <h2>Здесь пока пусто</h2>
                      <p>Измените фильтр или создайте первый ролик.</p>
                      <button
                        className="button primary"
                        onClick={() => go("studio")}
                      >
                        В студию
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {view === "project" && p && (
                <>
                  <button
                    className="text-button back"
                    onClick={() => go("library")}
                  >
                    <ArrowLeft size={16} />
                    Библиотека
                  </button>
                  <div className="project-heading">
                    <div>
                      <h1>{p.title}</h1>
                      <p>
                        {p.format} <span>·</span> {p.duration} секунд{" "}
                        <span>·</span>{" "}
                        {p.voice ? "Русская озвучка" : "Без речи"}{" "}
                        {p.imported && " · Архивный ролик"}
                      </p>
                    </div>
                    <Badge status={p.status} />
                  </div>
                  {isBusy(p.status) && (
                    <div className="job-progress">
                      <div>
                        <Activity size={20} />
                        <strong>{p.stage}</strong>
                        <span>{p.progress}%</span>
                      </div>
                      <div className="progress-track">
                        <span style={{ width: `${p.progress}%` }} />
                      </div>
                      <p>
                        Очередь работает в фоне. Можно перейти к другим
                        проектам.
                      </p>
                      <button
                        className="text-button"
                        disabled={!!busy}
                        onClick={() => action("cancel", { id: p.id })}
                      >
                        <Square size={13} />
                        Остановить после текущего этапа
                      </button>
                    </div>
                  )}
                  {p.error && (
                    <div className="message error">
                      <AlertCircle size={19} />
                      <span>{p.error}</span>
                    </div>
                  )}
                  <div className="project-layout">
                    <aside className="preview-panel">
                      <div className="preview-stage">
                        {p.videoUrl ? (
                          <video id="studio-preview-video"
                            key={
                              p.videoUrl + (p.review?.checkedAt || p.created)
                            }
                            controls
                            playsInline
                            preload="metadata"
                            poster={p.posterUrl || undefined}
                            src={p.videoUrl}
                          />
                        ) : (
                          <div className="preview-empty">
                            <Clapperboard size={40} />
                            <h3>Здесь появится ролик</h3>
                            <p>
                              Сначала источники и сценарий,
                              <br />
                              потом звук и анимация.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="preview-meta">
                        <span>
                          {p.format === "9:16" ? (
                            <Smartphone size={15} />
                          ) : (
                            <Monitor size={15} />
                          )}{" "}
                          {p.format === "9:16" ? "1080 × 1920" : "1920 × 1080"}
                        </span>
                        <span>MP4 · 30 fps</span>
                      </div>
                      {p.videoUrl && (
                        <a
                          className="button full"
                          href={`${p.videoUrl}?download=1`}
                          download
                        >
                          <Download size={16} />
                          Скачать MP4
                        </a>
                      )}
                      {!p.imported &&
                        !isBusy(p.status) && (
                          <button
                            className="button full"
                            disabled={!!busy}
                            onClick={() => action("retry", { id: p.id })}
                          >
                            <RotateCw size={16} />
                            {p.videoUrl
                              ? "Рендерить заново"
                              : "Повторить задачу"}
                          </button>
                        )}
                      {p.plan?.world3d&&<div className="three-project-info"><strong>Three.js · 3D</strong><p>{p.plan.world3d.objects.length} моделей · {p.plan.world3d.camera.length} ключей камеры</p><a href={`/api/assets/data/projects/${p.id}/three-plan.json`} target="_blank" rel="noopener noreferrer">План 3D-сцены <ExternalLink size={13}/></a><details><summary>Решения и упрощения</summary>{p.plan.world3d.notes.map((n:string,i:number)=><p key={i}>{n}</p>)}</details></div>}
                      <div className="preview-note">
                        <FolderOpen size={16} />
                        <span>
                          Исходники и версии сохраняются в папке проекта.
                        </span>
                      </div>
                    </aside>
                    <section className="editor-panel">
                      <div className="tabs">
                        {[
                          ["research", "Источники"],
                          ["script", "Сценарий"],
                          ["review", "Ревью"],
                          ["log", "Журнал"],
                        ].map(([v, t]) => (
                          <button
                            key={v}
                            className={cn(tab === v && "active")}
                            onClick={() => setTab(v)}
                          >
                            {t}
                            {v === "script" && editor && (
                              <span>{editor.scenes.length}</span>
                            )}
                          </button>
                        ))}
                      </div>
                      {tab === "research" && (
                        <ResearchPanel id={p.id} status={p.status} />
                      )}
                      {tab === "script" && (
                        <>
                          {editor ? (
                            <>
                              <div className="editor-header">
                                <div>
                                  <h2>История по сценам</h2>
                                  <p>
                                    Озвучка, экранный текст и план показов.
                                    После изменения речи проверьте слова, по
                                    которым запускаются события.
                                  </p>
                                </div>
                                <button
                                  className="button small"
                                  disabled={
                                    !!busy ||
                                    ["running", "queued"].includes(p.status)
                                  }
                                  onClick={async () => {
                                    if (
                                      await action("save", {
                                        id: p.id,
                                        plan: editor,
                                      })
                                    )
                                      setNotice(
                                        "Сценарий сохранён. Теперь можно обновить видео.",
                                      );
                                  }}
                                >
                                  <Save size={15} />
                                  Сохранить
                                </button>
                              </div>
                              <label className="field">
                                Название ролика
                                <input
                                  value={editor.title}
                                  maxLength={72}
                                  onChange={(e) =>
                                    setEditor({
                                      ...editor,
                                      title: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              {editor.scenes.map((s, i) => {
                                const start = editor.scenes
                                  .slice(0, i)
                                  .reduce((n, x) => n + x.seconds, 0);
                                const patch = (key: string, value: any) =>
                                  setEditor({
                                    ...editor,
                                    scenes: editor.scenes.map((x, n) =>
                                      n === i ? { ...x, [key]: value } : x,
                                    ),
                                  });
                                return (
                                  <article key={s.id} className="scene-editor">
                                    <div className="scene-editor-top">
                                      <span className="scene-num">
                                        {String(i + 1).padStart(2, "0")}
                                      </span>
                                      <strong>
                                        {i === 0
                                          ? "Хук"
                                          : i === editor.scenes.length - 1
                                            ? "Вывод"
                                            : `Сцена ${i + 1}`}
                                      </strong>
                                      <span>
                                        {start.toFixed(1)} —{" "}
                                        {(start + s.seconds).toFixed(1)} с
                                      </span>
                                    </div>
                                    <label className="field">
                                      Заголовок
                                      <input
                                        value={s.title}
                                        maxLength={48}
                                        onChange={(e) =>
                                          patch("title", e.target.value)
                                        }
                                      />
                                    </label>
                                    <label className="field">
                                      Пояснение
                                      <input
                                        value={s.subtitle}
                                        maxLength={105}
                                        onChange={(e) =>
                                          patch("subtitle", e.target.value)
                                        }
                                      />
                                    </label>
                                    <label className="field">
                                      Текст озвучки
                                      <textarea
                                        rows={3}
                                        value={s.narration}
                                        maxLength={300}
                                        onChange={(e) =>
                                          patch("narration", e.target.value)
                                        }
                                      />
                                    </label>
                                    <div className="scene-fields">
                                      <label className="field">
                                        Визуальный приём
                                        <select
                                          value={s.visual}
                                          onChange={(e) =>
                                            patch("visual", e.target.value)
                                          }
                                        >
                                          {[
                                            ["flow", "Процесс"],
                                            ["code", "Код"],
                                            ["compare", "Сравнение"],
                                            ["checklist", "Проверка"],
                                            ["timeline", "Шаги"],
                                            ["spotlight", "Акцент"],
                                          ].map(([v, t]) => (
                                            <option key={v} value={v}>
                                              {t}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <label className="field">
                                        Текст в анимации (по строкам)
                                        <textarea
                                          rows={3}
                                          value={s.items.join("\n")}
                                          onChange={(e) =>
                                            patch(
                                              "items",
                                              e.target.value
                                                .split("\n")
                                                .slice(0, 4),
                                            )
                                          }
                                        />
                                      </label>
                                    </div>
                                    {s.visualDescription && (
                                      <label className="field">
                                        Что изображаем
                                        <textarea
                                          rows={3}
                                          maxLength={600}
                                          value={s.visualDescription}
                                          onChange={(e) =>
                                            patch(
                                              "visualDescription",
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </label>
                                    )}
                                    {s.diagram && (
                                      <div className="scene-fields">
                                        {s.diagram.nodes.map((node) => (
                                          <label
                                            className="field"
                                            key={node.id}
                                          >
                                            Подпись объекта
                                            <input
                                              value={node.label}
                                              maxLength={24}
                                              onChange={(e) =>
                                                patch("diagram", {
                                                  ...s.diagram,
                                                  nodes: s.diagram!.nodes.map(
                                                    (n) =>
                                                      n.id === node.id
                                                        ? {
                                                            ...n,
                                                            label:
                                                              e.target.value,
                                                          }
                                                        : n,
                                                  ),
                                                })
                                              }
                                            />
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                    {!!s.beats?.length && (
                                      <div className="director-beats">
                                        <strong>Когда меняется схема</strong>
                                        <ol>
                                          {s.beats.map((beat, n) => {
                                            const target =
                                              s.diagram?.nodes.find(
                                                (node) =>
                                                  node.id === beat.target,
                                              )?.label ?? "связь";
                                            return (
                                              <li key={n}>
                                                <span className="beat-time">
                                                  +{beat.at.toFixed(1)} с
                                                  {beat.cue
                                                    ? ` · «${beat.cue}»`
                                                    : ""}
                                                </span>
                                                <span>
                                                  {beat.description} · {target}
                                                </span>
                                              </li>
                                            );
                                          })}
                                        </ol>
                                        <p className="quiet">
                                          Указано время внутри сцены. При
                                          озвучке события со словом
                                          привязываются к фактической речи.
                                        </p>
                                      </div>
                                    )}
                                  </article>
                                );
                              })}
                              {editor.factNotes && (
                                <div className="editor-note">
                                  <strong>Редакторская заметка</strong>
                                  <p>{editor.factNotes}</p>
                                </div>
                              )}
                            </>
                          ) : p.imported ? (
                            <div className="empty">
                              <FileText size={30} />
                              <h2>Сценарий в архиве</h2>
                              <p>
                                Исходники этого ролика перенесены в archive.
                                <br />
                                Новые проекты можно редактировать здесь по
                                сценам.
                              </p>
                              <button
                                className="button"
                                onClick={() => setTab("review")}
                              >
                                Открыть ревью
                              </button>
                            </div>
                          ) : (
                            <div className="empty">
                              <FileText size={30} />
                              <h2>Готовим сценарий</h2>
                              <p>
                                Здесь появятся сцены с текстом и таймингами.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      {tab === "review" && (
                        <div className="review-content">
                          <div className="editor-header">
                            <div>
                              <h2>Проверка перед финалом</h2>
                              <p>Технические проверки и просмотр редактора.</p>
                            </div>
                          </div>
                          {p.videoUrl && p.plan && !p.imported && <QualityPanel review={p.review} disabled={!!busy||[...BUSY,"revision"].includes(p.status)||data.jobs?.some((j:Any)=>j.project_id===p.id&&["queued","running"].includes(j.status))} onReview={()=>{void action("reviewOnly",{id:p.id});}} onSeek={(time)=>{const v=document.getElementById("studio-preview-video") as HTMLVideoElement|null;if(v)v.currentTime=time;}}/>}
                          {p.review ? (
                            <>
                              <div className="check-list">
                                {p.review.checks?.map((c: Any, i: number) => (
                                  <div key={i}>
                                    {c.ok ? (
                                      <CheckCircle2 size={21} />
                                    ) : (
                                      <AlertCircle size={21} />
                                    )}
                                    <span>
                                      <strong>{c.label}</strong>
                                      <small>{c.detail}</small>
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {p.review.ai && !p.review.quality && (
                                <div className="editor-note">
                                  <strong>
                                    Ревью кадров ·{" "}
                                    {p.review.ai.verdict === "pass"
                                      ? "без явных замечаний"
                                      : p.review.ai.verdict === "changes"
                                        ? "есть замечания"
                                        : "нужен просмотр"}
                                  </strong>
                                  <p>{p.review.ai.summary}</p>
                                  {p.review.ai.findings?.length > 0 && (
                                    <ul>
                                      {p.review.ai.findings.map(
                                        (x: string, i: number) => (
                                          <li key={i}>{x}</li>
                                        ),
                                      )}
                                    </ul>
                                  )}
                                </div>
                              )}
                              {p.sheetUrl && (
                                <a
                                  href={p.sheetUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="contact-sheet"
                                >
                                  <img
                                    src={p.sheetUrl}
                                    alt="Кадры сцен для проверки"
                                  />
                                  <span>
                                    Открыть кадры в полном размере
                                    <ExternalLink size={14} />
                                  </span>
                                </a>
                              )}
                              <p className="small-print">
                                {p.review.coverage ||
                                  "Архивные результаты проверки предыдущей версии."}
                              </p>
                            </>
                          ) : (
                            <div className="editor-note">
                              <strong>
                                {p.imported
                                  ? "Ранее созданный ролик"
                                  : "Проверки появятся после рендера"}
                              </strong>
                              <p>
                                {p.imported
                                  ? "Видео перенесено из нашего рабочего процесса вместе со сценариями и исходниками."
                                  : "Проверим декодирование, длительность, границы речи и читаемость кадров."}
                              </p>
                            </div>
                          )}
                          {p.videoUrl && (
                            <div className="decision">
                              <h3>Ваше решение</h3>
                              <p>
                                Посмотрите ролик целиком со звуком перед
                                принятием.
                              </p>
                              <label className="field">
                                Комментарий
                                <textarea
                                  placeholder="Что поправить или что сработало хорошо…"
                                  rows={3}
                                  value={feedback}
                                  onChange={(e) => setFeedback(e.target.value)}
                                />
                              </label>
                              <div className="button-row">
                                <button
                                  className="button primary"
                                  disabled={
                                    !!busy ||
                                    (!p.imported &&
                                      !p.review?.technicalPassed) ||
                                    ["running", "queued", "approved"].includes(
                                      p.status,
                                    )
                                  }
                                  onClick={async () => {
                                    if (
                                      await action("approve", {
                                        id: p.id,
                                        feedback,
                                      })
                                    )
                                      setNotice("Ролик принят.");
                                  }}
                                >
                                  <Check size={16} />
                                  Принять ролик
                                </button>
                                <button
                                  className="button"
                                  disabled={
                                    !!busy ||
                                    feedback.trim().length < 3 ||
                                    ["running", "queued"].includes(p.status)
                                  }
                                  onClick={() =>
                                    action("revise", { id: p.id, feedback })
                                  }
                                >
                                  На доработку
                                  <ArrowUpRight size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {tab === "log" && (
                        <div className="log-list">
                          {logs.length ? (
                            logs.map((l, i) => (
                              <div key={i}>
                                <span className="log-dot" />
                                <p>
                                  {l.message}
                                  <small>
                                    {new Date(l.created).toLocaleString(
                                      "ru-RU",
                                    )}
                                  </small>
                                </p>
                              </div>
                            ))
                          ) : (
                            <p>Событий пока нет.</p>
                          )}
                        </div>
                      )}
                    </section>
                  </div>
                </>
              )}
              {view === "models" && <ModelsPanel onOpen={id=>{refresh();setSelected(id);setView("project");setTab("log");}} onCreate={()=>{go("studio");setRenderMode("three");setProductionTemplateId("");setNotice("3D-рендер выбран. Введите тему и при необходимости выберите видеореференсы.");}}/>}
              {view === "authors" && <AuthorsPanel onRefresh={refreshAuthors} onUse={id=>{setAuthorProfileId(id);setRenderMode("auto");setProductionTemplateId("");setModelIds([]);refreshAuthors();go("studio");setNotice("Подборка видеореференсов выбрана. Введите новую тему.");}}/>}
              {view === "templates" && <>
                <div className="page-intro"><div><div className="eyebrow">ВАШИ ФОРМАТЫ</div><h1>Сохранённые шаблоны</h1><p>Дизайн, сценарная структура и правила движения для следующих выпусков.</p></div></div>
                <div className="template-catalog">
                  {data.videoTemplates?.map((t:Any)=><article className="panel template-card" key={t.id}>
                    <a className="template-reference" href={`/api/assets/${t.basePath}/reference/video.mp4`} target="_blank" rel="noopener noreferrer" aria-label={`Посмотреть эталон «${t.name}»`}><img src={`/api/assets/${t.basePath}/reference/poster.jpg`} alt={`Эталон шаблона ${t.name}`}/><span><Play size={14}/> {t.styleSample?"Образец":"Эталон"} · {Math.floor(t.reference.duration/60)}:{String(Math.round(t.reference.duration%60)).padStart(2,"0")}</span></a>
                    <div className="template-card-content"><div className="eyebrow">{t.styleSample?"ОБРАЗЕЦ СТИЛЯ":"СОХРАНЁН"} · ВЕРСИЯ {t.version}</div><h2>{t.name}</h2><p>{t.description}</p><p className="quiet">{t.styleSample?"9:16 · 15 с без звука · @xtuned":`${t.defaults.format} · до ${t.defaults.duration} с · @xtuned · русский голос`}</p>
                      <div className="template-docs">{[["DESIGN.md","Дизайн"],["CONTENT.md","Сценарий"],["MOTION.md","Анимации"],["VOICE.md","Озвучка"],["CHECKLIST.md","Проверка"]].map(([file,label])=><a key={file} href={`/api/assets/${t.basePath}/${file}`} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={12}/></a>)}</div>
                      {t.styleSample?<><p className="quiet">Рендерер стиля ещё не подключён к конвейеру. Скажите агенту, что этот стиль нужно реализовать, и он станет рабочим шаблоном.</p>
                      <button className="button" disabled>Ещё не подключён</button></>:<>
                      <p className="quiet">Факты, необходимые ассеты и конкретные сцены подготавливаются под новую тему.</p>
                      <button className="button primary" onClick={()=>{chooseTemplate(t.id);go("studio");setNotice(`Выбран шаблон «${t.name}». Введите тему, когда будете готовы.`);}}>Использовать шаблон <ArrowRight size={15}/></button></>}
                    </div>
                  </article>)}
                </div>
              </>}
              {view === "style" && profile && (
                <>
                  <div className="page-heading">
                    <div className="eyebrow">ДИЗАЙН + СЦЕНАРНАЯ ПОДАЧА</div>
                    <h1>
                      У каждого автора
                      <br />
                      свой почерк.
                    </h1>
                    <p>
                      Соберём его из референсов и текстов. Правила можно
                      проверить и изменить.
                    </p>
                  </div>
                  <div className="style-method">
                    <span className="method-step">
                      01 <strong>Материалы</strong>
                    </span>
                    <ArrowRight size={17} />
                    <span className="method-step">
                      02 <strong>Наблюдаемые приёмы</strong>
                    </span>
                    <ArrowRight size={17} />
                    <span className="method-step">
                      03 <strong>Профиль для роликов</strong>
                    </span>
                    <span className="method-caption">
                      Без дообучения модели на старте
                    </span>
                  </div>
                  <div className="style-layout">
                    <section className="panel reference-panel">
                      <div className="section-heading">
                        <div>
                          <h2>
                            Референсы <span>{data.references.length}</span>
                          </h2>
                          <p>Кадры, скриншоты и транскрипты</p>
                        </div>
                        <button
                          className="icon-button"
                          aria-label="Добавить референсы"
                          onClick={() => upload.current?.click()}
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                      <input
                        ref={upload}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.txt,.srt,.vtt"
                        multiple
                        hidden
                        onChange={(e) => files(e.target.files)}
                      />
                      <div
                        className="dropzone"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          files(e.dataTransfer.files);
                        }}
                      >
                        <Upload size={25} />
                        <strong>Перетащите материалы сюда</strong>
                        <p>JPG, PNG, WebP до 15 МБ · TXT, SRT, VTT</p>
                        <button
                          className="button small"
                          disabled={!!busy}
                          onClick={() => upload.current?.click()}
                        >
                          Выбрать файлы
                        </button>
                      </div>
                      <button
                        className="text-button add-text"
                        onClick={() => setAddingText(!addingText)}
                      >
                        <FileText size={16} />
                        {addingText
                          ? "Скрыть поле транскрипта"
                          : "Вставить транскрипт текстом"}
                      </button>
                      {addingText && (
                        <div className="transcript-form">
                          <label className="field">
                            Название
                            <input
                              value={referenceName}
                              onChange={(e) => setReferenceName(e.target.value)}
                              placeholder="CI/CD — пример подачи автора"
                            />
                          </label>
                          <label className="field">
                            Транскрипт
                            <textarea
                              rows={7}
                              value={transcript}
                              onChange={(e) => setTranscript(e.target.value)}
                              placeholder="Вставьте текст видео…"
                            />
                          </label>
                          <button
                            className="button primary small"
                            disabled={!!busy || transcript.trim().length < 10}
                            onClick={addTranscript}
                          >
                            Сохранить транскрипт
                          </button>
                        </div>
                      )}
                      {data.references.length ? (
                        <div className="reference-grid">
                          {data.references.map((r: Any) => (
                            <div className="reference-card" key={r.id}>
                              <button
                                className="icon-button archive-ref"
                                aria-label={`Убрать в архив: ${r.name}`}
                                title="Убрать из активных материалов"
                                onClick={async () => {
                                  if (
                                    await action("archiveReference", {
                                      id: r.id,
                                    })
                                  ) {
                                    setRemovedRef(r.id);
                                    setNotice(
                                      "Материал убран из активных. Файл сохранён в папке студии.",
                                    );
                                  }
                                }}
                              >
                                <X size={13} />
                              </button>
                              {r.kind === "image" ? (
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img src={r.url} alt={r.name} />
                                </a>
                              ) : (
                                <div className="transcript-preview">
                                  <FileText size={22} />
                                  <p>{r.text.slice(0, 160)}…</p>
                                </div>
                              )}
                              <strong title={r.name}>{r.name}</strong>
                              <small>
                                {r.kind === "image"
                                  ? "Визуальный референс"
                                  : `${r.text.length.toLocaleString("ru-RU")} символов`}
                              </small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="reference-empty">
                          <ImageIcon size={23} />
                          <p>
                            Пока без материалов автора.
                            <br />
                            Базовый стиль уже доступен для генерации.
                          </p>
                        </div>
                      )}
                      <button
                        className="button primary full"
                        disabled={
                          !!busy ||
                          !data.references.length ||
                          !!styleJob ||
                          !health?.authenticated
                        }
                        onClick={() => action("analyze")}
                      >
                        <Sparkles size={17} />
                        {styleJob
                          ? "Извлекаем правила…"
                          : "Извлечь стиль из материалов"}
                      </button>
                      {data.jobs.find((j: Any) => j.kind === "style")
                        ?.status === "failed" && (
                        <p className="inline-error">
                          {data.jobs.find((j: Any) => j.kind === "style").error}
                        </p>
                      )}
                      <p className="small-print">
                        Анализируется до 8 последних изображений и 8
                        транскриптов. Файлы остаются локально; для анализа
                        выбранные материалы передаются Codex.
                      </p>
                    </section>
                    <section className="panel profile-panel">
                      <div className="section-heading">
                        <div>
                          <h2>Профиль подачи</h2>
                          <p>
                            {data.profileUpdated
                              ? `Обновлён ${time(data.profileUpdated)}`
                              : "Базовые правила студии"}
                          </p>
                        </div>
                        <span className="badge neutral">Редактируемый</span>
                      </div>
                      <div
                        className="style-preview"
                        style={{
                          background: profile.background,
                          color: profile.foreground,
                          fontFamily: `'${profile.font} Variable',sans-serif`,
                        }}
                      >
                        <span style={{ color: profile.accent }}>
                          ОДНА МЫСЛЬ. ОДИН КАДР.
                        </span>
                        <strong>
                          Сложное становится
                          <br />
                          понятным.
                        </strong>
                        <div style={{ background: profile.accent }} />
                      </div>
                      <label className="field">
                        Название профиля
                        <input
                          value={profile.name}
                          onChange={(e) =>
                            updateProfile("name", e.target.value)
                          }
                        />
                      </label>
                      <label className="field">
                        Что отличает этот стиль
                        <textarea
                          rows={3}
                          value={profile.description}
                          onChange={(e) =>
                            updateProfile("description", e.target.value)
                          }
                        />
                      </label>
                      <div className="color-fields">
                        {[
                          ["background", "Фон"],
                          ["foreground", "Текст"],
                          ["accent", "Акцент"],
                        ].map(([k, t]) => (
                          <label key={k}>
                            <span>{t}</span>
                            <input
                              type="color"
                              aria-label={t}
                              value={(profile as Any)[k]}
                              onChange={(e) => updateProfile(k, e.target.value)}
                            />
                            <small>{(profile as Any)[k]}</small>
                          </label>
                        ))}
                      </div>
                      <label className="field">
                        Шрифт
                        <select
                          value={profile.font}
                          onChange={(e) =>
                            updateProfile("font", e.target.value)
                          }
                        >
                          <option>Manrope</option>
                          <option>Inter</option>
                        </select>
                      </label>
                      <label className="field">
                        Оформление вертикального видео
                        <select
                          value={profile.template ?? "studio"}
                          onChange={(e) =>
                            updateProfile("template", e.target.value)
                          }
                        >
                          <option value="studio">Студийное</option>
                          <option value="explainer">
                            Объясняющее · автор и главы
                          </option>
                        </select>
                      </label>
                      <label className="field">
                        Username в шапке
                        <input
                          value={profile.username ?? "@xtuned"}
                          maxLength={32}
                          onChange={(e) =>
                            updateProfile("username", e.target.value)
                          }
                          placeholder="@xtuned"
                        />
                      </label>
                      {[
                        ["hookRules", "Как начинается видео"],
                        ["writingRules", "Сценарная подача"],
                        ["visualRules", "Визуальные правила"],
                        ["avoid", "Чего избегаем"],
                        ["examples", "Короткие примеры автора"],
                      ].map(([k, t]) => (
                        <label className="field" key={k}>
                          {t}
                          <textarea
                            rows={3}
                            value={(profile as Any)[k].join("\n")}
                            onChange={(e) =>
                              updateProfile(k, e.target.value.split("\n"))
                            }
                          />
                        </label>
                      ))}
                      <button
                        className="button primary full"
                        disabled={!profileDirty || !!busy}
                        onClick={async () => {
                          const clean = { ...profile };
                          for (const k of [
                            "hookRules",
                            "writingRules",
                            "visualRules",
                            "avoid",
                            "examples",
                          ] as const)
                            clean[k] = clean[k].filter((x) => x.trim());
                          if (await action("profile", { profile: clean })) {
                            setProfileDirty(false);
                            setNotice(
                              "Профиль сохранён. Новые проекты будут использовать эти правила.",
                            );
                          }
                        }}
                      >
                        <Save size={16} />
                        Сохранить профиль
                      </button>
                    </section>
                  </div>
                  <div className="learning-note">
                    <Layers3 size={25} />
                    <div>
                      <h3>
                        Сначала примеры и правила. Затем — оценка результата.
                      </h3>
                      <p>
                        Профиль и выбранные транскрипты подаются модели при
                        создании сценария. Для нового дизайна меняются цвет,
                        шрифт и правила композиции. Когда накопится набор
                        принятых роликов, сравним новые сценарии с эталонами и
                        решим, нужно ли дообучение. Сейчас модель не обучалась
                        на материалах автора.
                      </p>
                    </div>
                  </div>
                </>
              )}
              {view === "queue" && (
                <>
                  <div className="page-heading">
                    <div className="eyebrow">ПРОИЗВОДСТВЕННЫЙ КОНТРОЛЬ</div>
                    <h1>От задачи до «готово».</h1>
                    <p>
                      Очередь сохраняется на диске. Каждый ролик проходит
                      просмотр.
                    </p>
                  </div>
                  <div className="queue-summary">
                    {[
                      ["В работе", active.length],
                      ["Ждут просмотра", reviewing.length],
                      [
                        "Принято",
                        all.filter((x: Any) => x.status === "approved").length,
                      ],
                    ].map(([t, v]) => (
                      <div key={t}>
                        <span>{t}</span>
                        <strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                  <section className="panel queue-panel">
                    <div className="section-heading">
                      <h2>Проекты</h2>
                      <span className="quiet">Ролики идут параллельно, рендер — по одному</span>
                    </div>
                    {all.map((x: Any) => (
                      <button
                        key={x.id}
                        className="project-row"
                        onClick={() => open(x)}
                      >
                        <div className="row-icon">
                          <Film size={20} />
                        </div>
                        <div>
                          <strong>{x.title}</strong>
                          <small>
                            {x.stage} · {x.duration} сек · {x.format}
                          </small>
                        </div>
                        <Badge status={x.status} />
                        <ArrowUpRight size={18} />
                      </button>
                    ))}
                  </section>
                  <section className="panel queue-panel">
                    <div className="section-heading">
                      <h2>История задач</h2>
                      <span className="quiet">Последние 30 запусков</span>
                    </div>
                    {data.jobs.length ? (
                      data.jobs.map((j: Any) => (
                        <div key={j.id} className="task-row">
                          <Activity size={16} />
                          <span>
                            {j.kind === "voice-audition" ? "Слепое сравнение голосов" : j.kind === "review-only" ? "Повторная проверка MP4" : j.kind === "author-import" ? "Импорт и разбор видеореференсов" : j.kind === "style"
                              ? "Анализ стиля"
                              : all.find((x: Any) => x.id === j.project_id)
                                  ?.title || "Рендер"}
                          </span>
                          <small>
                            {
                              (
                                {
                                  queued: "В очереди",
                                  running: "Выполняется",
                                  held: "На паузе",
                                  completed: "Завершена",
                                  failed: "Ошибка",
                                  cancelled: "Остановлена",
                                } as Any
                              )[j.status]
                            }
                          </small>
                        </div>
                      ))
                    ) : (
                      <p className="quiet">Новых запусков пока нет.</p>
                    )}
                  </section>
                </>
              )}
              {view === "settings" && (
                <>
                  <div className="page-heading">
                    <div className="eyebrow">ЛОКАЛЬНАЯ КОНФИГУРАЦИЯ</div>
                    <h1>Инструменты студии.</h1>
                    <p>Генерация, рендер и хранение на вашем компьютере.</p>
                  </div>
                  <section className="panel settings-panel">
                    <div className="section-heading">
                      <h2>Подключения</h2>
                      <button className="text-button" onClick={refreshHealth}>
                        <RotateCw size={15} />
                        Проверить
                      </button>
                    </div>
                    {[
                      [
                        "Codex",
                        "Сценарии, анализ референсов и ревью кадров",
                        health?.codex && health?.authenticated,
                      ],
                      [
                        "Remotion + Chrome",
                        "Детерминированная анимация по таймлайну",
                        health?.chrome,
                      ],
                      [
                        "FFmpeg",
                        "Аудиомикс, экспорт MP4 и полная проверка файла",
                        health?.ffmpeg,
                      ],
                      [
                        "Русская озвучка",
                        "ElevenLabs для режима качества; Edge только для явно выбранного старого превью",
                        health?.speech,
                      ],
                      [
                        "Исследование",
                        "Tavily Search + Extract · источники до сценария",
                        health?.research?.tavily,
                      ],
                      [
                        "Сценарист",
                        "GPT‑6.1 Sol · Extra High · отдельный запуск",
                        health?.authenticated,
                      ],
                      [
                        "Motion-режиссёр",
                        health?.motion?.cli && !health?.motion?.authenticated
                          ? "Claude Opus 5.5 · Extra High · войдите: claude auth login"
                          : "Claude Opus 5.5 · Extra High · 3D, камера и сетевые сцены",
                        health?.motion?.cli && health?.motion?.authenticated,
                      ],
                      [
                        "ElevenLabs",
                        "Русский голос · синхронизация по словам · ключ хранится на сервере",
                        health?.elevenlabs?.keyConfigured &&
                          health?.elevenlabs?.voiceConfigured,
                      ],
                    ].map(([title, sub, ok]: any) => (
                      <div className="connection" key={title}>
                        <div className="connection-icon">
                          {ok ? <Check size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div>
                          <strong>{title}</strong>
                          <p>{sub}</p>
                        </div>
                        <span
                          className={cn("badge", ok ? "approved" : "failed")}
                        >
                          {health
                            ? ok
                              ? title === "ElevenLabs"
                                ? "Готов к проверке"
                                : "Доступно"
                              : title === "ElevenLabs"
                                ? health?.elevenlabs?.keyConfigured
                                  ? "Выберите голос"
                                  : "Нужен ключ"
                                : "Не подключено"
                            : "Проверяем…"}
                        </span>
                      </div>
                    ))}
                  </section>
                  <VoicePanel/>
                  <div className="settings-grid">
                    <section className="panel">
                      <FolderOpen size={24} />
                      <h2>Одна папка для всего</h2>
                      <p>
                        <code>data/projects</code> — сценарии, звук, рендеры и
                        ревью.
                      </p>
                      <p>
                        <code>data/references</code> — материалы автора.
                      </p>
                      <p>
                        <code>archive</code> — предыдущие результаты и
                        исходники.
                      </p>
                      <p>
                        <code>.agents/skills</code> — установленные motion
                        skills.
                      </p>
                    </section>
                    <section className="panel">
                      <SlidersHorizontal size={24} />
                      <h2>Что можно подключить дальше</h2>
                      <p>
                        Другие голоса, генерацию иллюстраций, публикацию и
                        командную работу — через отдельные адаптеры.
                      </p>
                      <p>
                        Сейчас студия работает локально. Внешние сервисы
                        используются для сценариев, анализа материалов и синтеза
                        речи.
                      </p>
                      <p className="small-print">
                        Учётные данные берутся из локального входа Codex и не
                        копируются в проект.
                      </p>
                    </section>
                  </div>
                </>
              )}
            </>
          )}
          <footer className="footer">
            <span>Кадр · Motion Studio</span>
            <span>Сделано, чтобы идеи двигались.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
