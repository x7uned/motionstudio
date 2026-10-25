import { z } from "zod";
export const IMPORT_LIMIT = 20;
export const APIFY_CAP_USD = 1;
export const MAX_VIDEO_SECONDS = 600;
export const MAX_CORPUS_SECONDS = 2700;
export function instagramAccount(input: string) {
  let username = input.trim();
  if (/^https?:\/\//i.test(username)) {
    const url = new URL(username);
    if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname) || url.username || url.password || url.port)
      throw new Error("Нужна ссылка на профиль instagram.com.");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 1 || ["reel", "reels", "p", "stories", "explore", "accounts", "direct"].includes(parts[0]))
      throw new Error("Вставьте профиль автора, а не отдельный ролик.");
    username = parts[0];
  }
  username = username.replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/.test(username) || username.includes(".."))
    throw new Error("Проверьте Instagram username или ссылку на профиль.");
  return { username, url: `https://www.instagram.com/${username}/` };
}
export const wordSchema = z.object({text:z.string().max(300), start:z.number().nonnegative(), end:z.number().nonnegative()});
export type Word = z.infer<typeof wordSchema>;
export const observationSchema = z.object({
  category:z.enum(["hook","writing","structure","design","motion","voice","camera","lighting","assets","editing"]),
  rule:z.string().min(5).max(400),
  at:z.number().nonnegative(), end:z.number().nonnegative(),
  evidence:z.string().min(3).max(400),
  basis:z.enum(["transcript","frames","timing"]),
  confidence:z.enum(["high","medium","low"]),
});
export const videoAnalysisSchema=z.object({
  summary:z.string().max(600),
  structure:z.array(z.object({at:z.number().nonnegative(),label:z.string().max(160)})).max(15),
  observations:z.array(observationSchema).min(3).max(16),
  limitations:z.array(z.string().max(300)).max(8),
});
export type VideoAnalysis=z.infer<typeof videoAnalysisSchema>;
export const corpusSchema=z.object({
  summary:z.string().max(900),
  rules:z.array(z.object({
    category:observationSchema.shape.category,
    rule:z.string().min(5).max(400),
    confidence:z.enum(["high","medium","low"]),
    evidence:z.array(z.object({videoId:z.string(),observationIndex:z.number().int().nonnegative()})).min(1).max(20),
  })).min(3).max(24),
  limitations:z.array(z.string().max(400)).max(12),
});
export type CorpusProfile=z.infer<typeof corpusSchema>;
export function validateVideoAnalysis(raw:unknown,duration:number){
 const v=videoAnalysisSchema.parse(raw);
 for(const o of v.observations)if(o.end<o.at||o.end>duration+.1)throw new Error("Разбор содержит таймкод за пределами видео.");
 for(const s of v.structure)if(s.at>duration+.1)throw new Error("Структура содержит неверный таймкод.");
 return v;
}
export function validateCorpus(raw:unknown,videos:{id:string;analysis:VideoAnalysis}[]){
 const p=corpusSchema.parse(raw);
 for(const rule of p.rules){
  const seen=new Set<string>();
  for(const e of rule.evidence){
   const v=videos.find(v=>v.id===e.videoId);
   const o=v?.analysis.observations[e.observationIndex];
   if(!o||o.category!==rule.category)throw new Error("Правило ссылается на отсутствующее наблюдение.");
   if(seen.has(`${e.videoId}:${e.observationIndex}`))throw new Error("Повторное доказательство правила.");
   seen.add(`${e.videoId}:${e.observationIndex}`);
  }
  const count=new Set(rule.evidence.map(e=>e.videoId)).size;
  if(rule.confidence==="high"&&count<Math.min(3,videos.length))rule.confidence="medium";
 }
 return p;
}
export function speechMetrics(words:Word[],duration:number){
 const gaps=words.slice(1).map((w,i)=>Math.max(0,w.start-words[i].end));
 return {wordCount:words.length,wordsPerMinute:duration?Math.round(words.length/duration*60):0,maxPause:Math.max(0,...gaps),pausesOverOneSecond:gaps.filter(g=>g>1).length};
}
