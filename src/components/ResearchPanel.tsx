"use client";
import { useEffect, useState } from "react";
import ScriptComparison from "./ScriptComparison";
import NarrativeEditor from "./NarrativeEditor";
type Any = Record<string, any>;
export default function ResearchPanel({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [data, setData] = useState<Any | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    const load = async () => {
      try {
        const r = await fetch(
          `/api/preproduction?id=${encodeURIComponent(id)}`,
          { cache: "no-store" },
        );
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (alive) {
          setData(j);
          setError("");
        }
      } catch {
        if (alive) setError("Не удалось загрузить исследование.");
      }
    };
    void load();
    const timer = ["running", "queued", "awaiting-agent", "awaiting-user"].includes(status)
      ? setInterval(load, 4000)
      : undefined;
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id, status]);
  if (error)
    return (
      <p className="inline-error" role="status">
        {error}
      </p>
    );
  if (!data)
    return (
      <p className="quiet" role="status">
        Загружаем материалы…
      </p>
    );
  const r = data.research;
  if (!r)
    return (
      <div className="empty">
        <h2>
          {["running", "queued", "awaiting-agent", "awaiting-user"].includes(status)
            ? "Собираем основу истории"
            : "Исследование ещё не сохранено"}
        </h2>
        <p>
          {["running", "queued", "awaiting-agent", "awaiting-user"].includes(status)
            ? "Сначала читаем источники. Факты и варианты начала появятся здесь до озвучки."
            : "Новые ролики проходят поиск и проверку фактов перед сценарием. Старые сценарии сохраняются при повторном рендере."}
        </p>
      </div>
    );
  const source = (id: string) => data.sources.find((s: Any) => s.id === id);
  return (
    <div className="research-content">
      <div className="editor-header">
        <div>
          <h2>Основа сценария</h2>
          <p>
            {data.pipeline
              ? (data.pipeline.scriptwriter?.model==="claude-opus-5-5"?"Claude Opus 5.5 · Extra High":"GPT‑6.1 Sol · Extra High")
              : "Исследователь закончил; сценарист работает дальше"}{" "}
            · Прочитано источников: {data.sources.length}
          </p>
        </div>
      </div>
      <ProductionReports data={data}/>
      {data.narrativeEditable&&<NarrativeEditor key={id+data.currentText} id={id} text={data.currentText||data.narrative.fullText} disabled={["queued","running","awaiting-agent","awaiting-user"].includes(status)}/>}
      {data.comparisonAvailable&&<ScriptComparison key={id+data.currentText} id={id} initial={data.comparison}/>}
      <p>{r.summary}</p>
      <section aria-label="Выбранный ракурс" className="editor-note">
        <strong>
          {r.angles.find((a: Any) => a.id === (data.pipeline?.selectedAngleId ?? r.selectedAngleId))?.title}
        </strong>
        <p>
          {
            r.hooks.find(
              (h: Any) =>
                h.id === (data.pipeline?.selectedHookId ?? r.selectedHookId),
            )?.text
          }
        </p>
        <p className="quiet">{r.selectionReason}</p>
      </section>
      <h3>Факты и оговорки</h3>
      {r.facts.map((f: Any) => (
        <article className="research-fact" key={f.id}>
          <strong>{f.claim}</strong>
          <p>{f.whyInteresting}</p>
          {f.caveat && <p className="quiet">Оговорка: {f.caveat}</p>}
          {f.evidence.map((e: Any, i: number) => {
            const s = source(e.sourceId);
            return (
              s && (
                <details key={i}>
                  <summary>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.title}
                    </a>
                  </summary>
                  <blockquote>{e.quote}</blockquote>
                  <small>
                    Прочитано{" "}
                    {new Date(s.retrievedAt).toLocaleDateString("ru-RU")}
                  </small>
                </details>
              )
            );
          })}
        </article>
      ))}
      {r.disputed.length > 0 && (
        <section className="editor-note">
          <strong>Ограничения исходного исследования</strong>
          {data.facts&&<p className="quiet">Дополнительные источники и актуальные выводы показаны выше, в независимой проверке утверждений.</p>}
          <ul>
            {r.disputed.map((s: string, i: number) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      <details className="research-options">
        <summary>10 вариантов начала и 3 угла подачи</summary>
        <ol>
          {r.hooks.map((h: Any) => (
            <li key={h.id}>
              <strong>{h.text}</strong>
              <p className="quiet">
                {h.family} · {h.why}
              </p>
            </li>
          ))}
        </ol>
        <h3>Другие углы</h3>
        {r.angles.map((a: Any) => (
          <p key={a.id}>
            <strong>{a.title}</strong>
            <br />
            {a.why}
          </p>
        ))}
      </details>
      {data.audit && (
        <section className="editor-note">
          <strong>Проверка сценаристом</strong>
          <p>{data.audit.notes.join(" ")}</p>
          <p className="quiet">
            Цитаты сверены с прочитанными страницами. Это не независимое
            подтверждение всех выводов; финальное решение остаётся за
            редактором.
          </p>
        </section>
      )}
      <div className="research-downloads">
        <a
          className="text-button"
          href={`/api/assets/data/projects/${id}/research.md?download=1`}
        >
          Исследование .md
        </a>
        {data.pipeline && (
          <a
            className="text-button"
            href={`/api/assets/data/projects/${id}/script.md?download=1`}
          >
            Сценарий с таймингами .md
          </a>
        )}
      </div>
    </div>
  );
}

function ProductionReports({data}:{data:Any}){
 const statuses:Record<string,string>={supported:"подтверждено",contradicted:"противоречие",uncertain:"недостаточно данных",illustration:"условный пример"};
 return <div className="production-reports">
  {(data.currentText||data.narrative?.fullText)&&<section className="editor-note"><h3>Цельный рассказ</h3><p className="narrative-text">{data.currentText||data.narrative.fullText}</p><p className="quiet">Сцены — смысловая разметка этого текста. Ручные правки ниже сохраняются без автоматической перезаписи.</p></section>}
  {data.editorial&&<details className="editor-note"><summary>Редактор рассказа · {data.editorialCurrent?"актуально":"относится к предыдущей версии"}</summary><p>{data.editorial.summary}</p>{data.editorial.findings?.map((f:Any,i:number)=><blockquote key={i}><strong>{f.span}</strong>{f.span&&!(data.currentText||data.narrative?.fullText||"").includes(f.span)&&<small>В текущем тексте этого фрагмента нет; замечание относится к редактированию.</small>}<p>{f.note}</p></blockquote>)}</details>}
  {data.facts&&<section className="editor-note"><h3>Независимая проверка утверждений</h3><p>{data.facts.summary}</p><p className="quiet">{data.factsCurrent?"Проверка относится к текущему сценарию.":"Текст, экранные подписи или источники изменились; требуется актуальная проверка перед озвучкой."}</p><details><summary>Проверено утверждений: {data.facts.claims.length}</summary>{data.facts.claims.map((c:Any)=><article className="research-fact" key={c.id}><strong>{statuses[c.status]}: {c.claim}</strong><blockquote>{c.span}</blockquote><p>{c.reason}</p>{c.evidence.map((e:Any,i:number)=>{const source=data.sources.find((s:Any)=>s.id===e.sourceId);return <details key={i}><summary>{source?<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>:e.sourceId}</summary><blockquote>{e.quote}</blockquote>{e.sourceField&&e.sourceField!=="content"&&<small>{e.sourceField==="title"?"Название в метаданных источника":"Адрес прочитанного источника"}; это библиографическое подтверждение.</small>}</details>;})}</article>)}</details></section>}
  {data.visual&&<details className="editor-note"><summary>Визуальная концепция · {data.visualCurrent?"актуально":"нужна повторная подготовка"}</summary><p>{data.visual.plan.idea}</p><p className="quiet">{data.visual.model.provider==="agent"?`Ведущий агент · ${data.visual.model.declaredAgent} (самоотчёт)`:`${data.visual.model.model} · ${data.visual.model.effort}`} · {data.visual.plan.visualLanguage}</p>{data.visual.plan.scenes.map((s:Any)=><article className="research-fact" key={s.scene}><strong>{s.scene}. {s.understanding}</strong><p>{s.show}</p><p>Изменение: {s.change}</p></article>)}{data.visual.plan.limitations.map((s:string,i:number)=><p className="quiet" key={i}>{s}</p>)}</details>}
  {data.assemblies&&<details className="editor-note"><summary>Детальные 3D-сборки · {data.assembliesCurrent?"актуально":"предыдущая версия"}</summary>{data.assemblies.plan.assets.map((a:Any)=><article className="research-fact" key={a.id}><strong>{a.name}</strong><p>{a.requiredParts.join(" · ")}</p><p className="quiet">{a.approximation}</p></article>)}</details>}
  {Object.entries(data.motionProviders||{}).filter(([,v])=>!!v).map(([role,v])=>{const proof=v as Any;return <p className="quiet" key={role}>{role==="sceneBuilder"?"3D-сценограф":role==="motion3d"?"3D motion-режиссёр":"2D motion-режиссёр"}: {proof.provider==="agent"?`Ведущий агент · ${proof.declaredAgent} (самоотчёт, не проверено)${proof.isolated?" · отдельный сабагент":""}`:<>{proof.usedModels?.join(", ")||Object.keys(proof.modelUsage||{}).join(", ")||"нет подтверждения модели"} · {proof.effort||"сохранённый запуск"}</>}</p>;})}
  {data.voice&&<details className="editor-note"><summary>План подачи голоса · {data.voiceCurrent?"актуально":"относится к предыдущему тексту"}</summary><p>{data.voice.delivery}</p><p>Модель: {data.voice.profile?.model||"текущая"}. Паузы сохраняются. Указания подачи отделены от субтитров.{data.voice.profile?.model==="eleven_multilingual_v2"?" В v2 эмоциональные теги не передаются; их поддержка проверяется в сравнении с v4.":""}</p></details>}
 </div>;
}
