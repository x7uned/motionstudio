import { test } from "node:test";
import assert from "node:assert/strict";
import {
  researchSchema,
  validateResearch,
  validateDirectedPlan,
  resolveBeatAt,
  scriptMarkdown,
  type Source,
} from "../src/lib/research-model";
import { publicURL } from "../src/lib/preproduction";
import { normalizePlan, type Storyboard } from "../src/lib/model";
const sources: Source[] = [
  {
    id: "s1",
    title: "Official docs",
    url: "https://example.org/docs",
    content:
      "A cache can return stale data. A replica may lag behind the primary database.",
    retrievedAt: new Date().toISOString(),
  },
];
const research = () =>
  researchSchema.parse({
    summary: "Подтверждённые свойства учебного примера и его ограничения.",
    facts: Array.from({ length: 4 }, (_, i) => ({
      id: `f${i + 1}`,
      claim: "Копия может отставать",
      whyInteresting: "Помогает понять ограничение",
      caveat: "Не всегда",
      evidence: [
        {
          sourceId: "s1",
          quote: "A replica may lag behind the primary database.",
        },
      ],
    })),
    disputed: [],
    angles: Array.from({ length: 3 }, (_, i) => ({
      id: `a${i + 1}`,
      title: "От проблемы к решению",
      why: "Один пример",
    })),
    hooks: Array.from({ length: 10 }, (_, i) => ({
      id: `h${i + 1}`,
      text: "Почему копия базы отстаёт?",
      family: "question",
      factIds: ["f1"],
      why: "Показывает проблему",
    })),
    selectedAngleId: "a1",
    selectedHookId: "h1",
    selectionReason: "Хук подтверждён",
  });
const plan = (): Storyboard => ({
  title: "Учебный пример",
  summary: "Одна система",
  factNotes: "Пример условный",
  scenes: Array.from({ length: 4 }, (_, i) => ({
    id: `scene-${i + 1}`,
    title: "Один сервер",
    subtitle: "Один запрос",
    narration: "Этот сервер отвечает на запрос.",
    seconds: 7.5,
    items: ["Сервер"],
    visual: "flow",
    visualDescription: "Показываем один сервер, затем выделяем его.",
    sourceFactIds: ["f1"],
    diagram: {
      nodes: [{ id: "app", kind: "server", label: "Сервер", row: 0, col: 1 }],
      edges: [],
    },
    beats: [
      {
        at: 0,
        cue: "",
        action: "reveal",
        target: "app",
        description: "Плавно раскрываем сервер",
      },
      {
        at: 1,
        cue: "сервер",
        action: "highlight",
        target: "app",
        description: "Подсвечиваем объект",
      },
    ],
  })),
});
test("facts require exact evidence in a retrieved page, not fabricated citations", () => {
  assert.doesNotThrow(() => validateResearch(research(), sources));
  const bad = research();
  bad.facts[0].evidence[0].quote = "A replica is always perfectly current.";
  assert.throws(() => validateResearch(bad, sources), /цитата не найдена/);
  const absent = research();
  absent.hooks[0].factIds = ["f99"];
  assert.throws(() => validateResearch(absent, sources), /отсутствующий факт/);
});
test("a directed script must reference real facts, real objects and spoken cues", () => {
  assert.doesNotThrow(() => validateDirectedPlan(plan(), research()));
  const p = plan();
  p.scenes[0].beats![1].cue = "несуществующее";
  assert.throws(
    () => validateDirectedPlan(p, research()),
    /отсутствует в озвучке/,
  );
  const partial = plan();
  partial.scenes[0].narration = "Эта версия сервера отвечает.";
  assert.throws(
    () => validateDirectedPlan(partial, research()),
    /отсутствует в озвучке/,
  );
  const q = plan();
  q.scenes[0].sourceFactIds = ["f99"];
  assert.throws(
    () => validateDirectedPlan(q, research()),
    /отсутствующий факт/,
  );
  const r = plan();
  r.scenes[0].diagram!.nodes.push({
    id: "second",
    label: "База",
    kind: "database",
    row: 0,
    col: 1,
  });
  assert.throws(() => validateDirectedPlan(r, research()), /пересекаются/);
});
test("voice word marks override planned visual timing and exports use the same clock", () => {
  assert.equal(
    resolveBeatAt({ at: 1, cue: "сервер" }, 10, [
      { text: "сервер,", start: 12.4 },
    ]),
    2.4000000000000004,
  );
  assert.equal(resolveBeatAt({ at: 1, cue: "сервер" }, 10, []), 1);
  const p = normalizePlan(plan(), 45, true);
  assert.ok(
    Math.abs(p.scenes[0].beats![1].at - p.scenes[0].seconds / 7.5) < 1e-10,
  );
  assert.equal(
    p.scenes.reduce((n, s) => n + s.seconds, 0),
    45,
  );
  assert.match(scriptMarkdown(p), /0.00–11.27|0.00–11.25/);
});
test("source links cannot target local services or carry credentials", () => {
  for (const url of [
    "http://example.com",
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://169.254.169.254/",
    "https://[::1]/",
    "https://a:b@example.com/",
    "https://example.com:444/",
  ])
    assert.equal(publicURL(url), null, url);
  assert.equal(
    publicURL("https://docs.example.org/page#part"),
    "https://docs.example.org/page",
  );
});

test("failed page extraction deduplicates fragments and reads one bounded alternate source without trusting snippets", async () => {
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const {supplementSources} = await import('../src/lib/preproduction');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'source-fallback-')), calls:string[][]=[];
  const request=async(args:string[],file:string)=>{
    calls.push(args);
    const value=args[0]==='search' ? args.includes('--exclude-domains')
      ? {results:[{url:'https://httpwg.org/specs/rfc9110.html',title:'Official mirror',content:'A snippet is not evidence'}]}
      : {results:[1,2,3].map(n=>({url:`https://www.rfc-editor.org/rfc/rfc9110.html#section-${n}`,content:'A snippet is not evidence'}))}
      : args[1].includes('rfc-editor') ? {results:[],failed_results:[{url:args[1],error:'404'}]}
      : {results:[{url:args[1],raw_content:'Actual retrieved normative content. '.repeat(8)}]};
    await fs.writeFile(file,JSON.stringify(value));return value;
  };
  try {
    const run=()=>supplementSources(['site:rfc-editor.org/rfc/rfc9110.html 304 content'],[],dir,new AbortController().signal,request as any);
    const result=await run();assert.equal(result.length,1);assert.match(result[0].content,/Actual retrieved/);assert.ok(!result[0].content.includes('snippet'));
    assert.equal(calls.length,4);assert.equal(calls[1].filter(x=>x.startsWith('https:')).length,1);
    assert.ok(!calls[2][1].includes('site:'));assert.ok(calls[2].includes('--include-domains'));
    assert.deepEqual((await run()).map(({retrievedAt,...s})=>s),result.map(({retrievedAt,...s})=>s));assert.equal(calls.length,4,'successful and failed fetches are cached');
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});

test("a later unavailable lookup retains retrieved evidence but never promotes its search snippet",async()=>{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');
 const {supplementSources}=await import('../src/lib/preproduction');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'source-partial-'));
 const request=async(args:string[])=>{
  if(args[0]==='search'&&args[1]==='unavailable')throw new Error('Provider temporarily unavailable');
  return args[0]==='search'?{results:[{url:'https://example.org/primary',title:'Primary',content:'An unsupported search snippet'}]}:{results:[{url:'https://example.org/primary',raw_content:'Actually retrieved primary evidence. '.repeat(8)}]};
 };
 try{
  const result=await supplementSources(['available','unavailable'],[],dir,new AbortController().signal,request as any);
  assert.equal(result.length,1);assert.match(result[0].content,/Actually retrieved/);assert.ok(!result[0].content.includes('snippet'));
  assert.ok((await fs.readdir(dir)).some(f=>f.startsWith('verification-unavailable-')));
  const controller=new AbortController();controller.abort();
  await assert.rejects(supplementSources(['unavailable'],[],dir,controller.signal,request as any),/unavailable/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
