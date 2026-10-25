import {portraitLayoutSchema,overlayVersionSchema} from "./illustrated-layout";
import {captionStyleSchema} from "./caption-style";
import {z} from "zod";

export const QUALITY_VERSION = "quality/2.0.0";
export const CONTENT_AGENT = {model:"gpt-6.1-sol",effort:"xhigh" as const,timeout:900_000};
// Explicit per-project override chosen by the editor. The Sol descriptor above stays byte-identical so
// existing role caches and hashes keep matching; the Opus descriptor carries its provider.
export const OPUS_CONTENT_AGENT = {provider:"claude" as const,model:"claude-opus-5-5",effort:"xhigh" as const,timeout:900_000};
// Agent mode (user decision 2026-10-19): the driving chat agent (Claude Code, Codex, ...) answers every LLM role
// through agent-tasks; the studio spawns no model CLI. The agent's model is self-declared and cannot be verified.
export type DrivingAgent = {provider:"agent";model:"driving-agent";effort:"xhigh";timeout:number;declaredAgent:string};
export const agentDescriptor=(declaredAgent:string):DrivingAgent=>({provider:"agent",model:"driving-agent",effort:"xhigh",timeout:900_000,declaredAgent});
export const agentModeSchema=z.object({version:z.literal(1),declaredAgent:z.string().min(1).max(120)});
export type AgentMode=z.infer<typeof agentModeSchema>;
export const agentModeOf=(profile?:{production?:{version?:number;agentMode?:AgentMode}}):AgentMode|undefined=>profile?.production?.agentMode;
export type ContentAgent = typeof CONTENT_AGENT | typeof OPUS_CONTENT_AGENT | DrivingAgent;
export const contentModelSchema = z.enum(["gpt-6.1-sol","claude-opus-5-5"]);
// Lenient fact checking is an explicit editor choice: only a direct contradiction of a read source blocks.
export const factCheckSchema = z.enum(["strict","lenient","off"]);
export const lenientFacts=(profile?:{production?:{version?:number;factCheck?:string}})=>profile?.production?.factCheck==="lenient";
// User rule 2026-10-19: fact checking may be switched off per project; the script retells the read material, nothing blocks TTS.
export const factCheckOff=(profile?:{production?:{version?:number;factCheck?:string}})=>profile?.production?.factCheck==="off";
export function contentAgentFor(profile?:{production?:{version?:number;contentAgent?:string;agentMode?:AgentMode}}):ContentAgent{
  const agent=profile?.production?.agentMode;
  if(agent)return agentDescriptor(agent.declaredAgent);
  return profile?.production?.contentAgent==="claude-opus-5-5"?OPUS_CONTENT_AGENT:CONTENT_AGENT;
}
// Explicit per-project film language. Absent means Russian, so legacy profiles, prompts and caches stay byte-identical.
export const projectLanguageSchema = z.enum(["ru","en"]);
export type ProjectLanguage = z.infer<typeof projectLanguageSchema>;
export const projectLanguage=(profile?:{production?:{version?:number;language?:string}}):ProjectLanguage=>profile?.production?.language==="en"?"en":"ru";
/** Natural speech density used by script budgets. English words are shorter; Russian values are unchanged. */
export const wordsPerSecond=(language:ProjectLanguage,long:boolean)=>language==="en"?(long?3:2.8):(long?2.15:1.9);
/** Appended to role prompts only for English projects; returns "" for Russian so existing prompt hashes are unchanged. */
export function languageDirective(profile?:{production?:{version?:number;language?:string;plainEnglish?:number}},kind:"content"|"motion"|"review"="content"){
  if(projectLanguage(profile)!=="en")return "";
  const common="\nЯЗЫК ПРОЕКТА — АНГЛИЙСКИЙ (явный выбор редактора). Если инструкции выше упоминают русский язык, русскоязычного зрителя, естественность русского или русские подписи, применяй их к английскому. Бренд пишется xtuned (строчными), произносится «ex-tuned».";
  // Plain English (user rule 2026-10-22): only projects created with production.plainEnglish=1; older EN prompts stay byte-identical.
  const plain=profile?.production?.plainEnglish===1;
  if(kind==="motion")return common+" Every visible label, plaque/sign text, bigWords, chip, summary and caption you return must be short natural English taken from the checked English script; never Russian. Editor-facing notes may stay Russian."+(plain?" Keep on-screen words plain: common everyday words a learner of English knows.":"");
  if(kind==="review")return common+" The film is in English: on-screen text and captions must be English; flag any Russian or mixed-language text visible in frames as a meaning finding. Write summary/detail for the editor in Russian.";
  return common+" Audience: curious English-speaking viewers without deep background knowledge. Write every spoken word, title, summary, caption, subtitle, item, node label and other on-screen text in natural, idiomatic spoken American English — written for the ear, not translated from Russian phrasing. Research facts, angles and hooks: English. Evidence quotes stay verbatim in the source language. Editor-facing fields (reason, note, findings, intent, why, caveat explanations) may be in Russian."+(plain?PLAIN_ENGLISH:"");
}
/** Plain English (user rule 2026-10-22): many viewers know only basic English and must follow the film by ear on first listen. */
export const PLAIN_ENGLISH=" PLAIN ENGLISH (editor's rule): many viewers are not native speakers and know only basic English, so every spoken and on-screen word must be easy to understand by ear on first listen. Use common everyday words; prefer the simple word (use, get, show, big, fast) to the bookish one (utilize, obtain, demonstrate, substantial, rapid). Short, direct sentences, mostly one idea each, subject → verb → object, active voice, simple tenses. No idioms, slang, rare words, wordplay that needs a native speaker, long nested clauses or stacked nouns. If a technical term is the topic, keep it, but say it once plainly and explain it right away in simple words; do not add other jargon. Simple, not childish: keep the strong hook, the causal story, the exact numbers and the natural spoken rhythm. The editor, segmentation and on-screen captions follow the same rule: rewrite any hard word or construction into a simpler one.";
/** Loop ending (user request 2026-10-22): empty for every other project, so their prompts stay byte for byte the same. */
export function loopDirective(profile?:{production?:{ending?:string}},kind:"content"|"motion"="content"){
  if(profile?.production?.ending!=="loop")return "";
  if(kind==="motion")return "\nКОНЦОВКА — ПЕТЛЯ (явный выбор редактора). Ролик крутится по кругу: последний кадр должен совпасть с первым. 1) Первый ключ камеры (начало) и последний ключ — одинаковые x, y, zoom; последний ключ ставь не позже чем за 2,4 с до конца, чтобы переезд закончился до стыка. 2) Предметы, которые видны в первом кадре (enter в начале первой главы), не уходят (exit=null) и к концу возвращаются к тому же active и тому же месту, что в начале; в первом кадре петли они уже стоят, без появления. 3) Всё остальное — предметы, потоки, выноски, крупные слова — исчезает до последних 0,5 с (или стоит вне кадра). 4) Рентген в конце такой же, как в начале. Валидатор это проверяет.";
  return "\nКОНЦОВКА — ПЕТЛЯ (явный выбор редактора, docs/publishing-and-retention.md). Заставки и призыва подписаться нет. Ролик крутится по кругу: последняя фраза рассказа должна по смыслу и грамматике продолжаться ПЕРВЫМИ словами рассказа, как будто ролик начинается снова (пример: «…That's what happens every time…» → «You press play, and the show starts in about a second»). Пиши последнюю фразу вместе с первой; сильное начало не заменяй. Последняя фраза не заканчивается точкой-итогом, а подводит к первым словам (многоточие или тире допустимы). Никаких «подпишись», «поделись», бренда в речи.";
}
export const voiceProfileSchema=z.object({
  id:z.string().max(80), voiceId:z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
  model:z.enum(["eleven_multilingual_v2","eleven_v4"]), name:z.string().max(120),
  delivery:z.string().min(10).max(1200),
});
export const DEFAULT_DELIVERY_EN="A friendly English-speaking explainer talking to a curious friend: genuine interest in the mechanism, calm confidence, meaningful emphasis and natural pauses. Clear, unhurried conclusion; the closing follow invitation is warm, never salesy. No theatrics, artificial sighs or fresh intros per chapter.";
// Editor's choice for English films (2026-10-19): the owner's professional Dennis voice on Eleven v4.
export const DEFAULT_EN_VOICE_PROFILE={id:"owner-dennis-professional-v4-en",voiceId:"Uk2wBdgJpwqwirqxDggc",model:"eleven_v4" as const,name:"Dennis · English",delivery:DEFAULT_DELIVERY_EN};
export const productionSettingsSchema=z.object({version:z.literal(2),policyVersion:z.string().max(80),instructionsHash:z.string().length(64).optional(),voiceProfile:voiceProfileSchema.optional(),visualDesignVersion:z.literal(1).optional(),contentAgent:z.literal("claude-opus-5-5").optional(),agentMode:agentModeSchema.optional(),factCheck:z.enum(["lenient","off"]).optional(),language:z.literal("en").optional(),portraitLayout:portraitLayoutSchema.optional(),overlayVersion:overlayVersionSchema.optional(),captionStyle:captionStyleSchema.optional(),coverageVersion:z.literal(1).optional(),
  // Plain English (user rule 2026-10-22): new English projects; absent = the earlier EN prompts, byte for byte.
  plainEnglish:z.literal(1).optional(),
  // Loop ending (user request 2026-10-22, «One minute on Earth»): an explicit per-project choice; the film ends on its own first
  // frame instead of the xtuned-outro/v1 plate. Absent = the old ending, byte for byte.
  ending:z.literal("loop").optional(),
  // Safe zones v1 (user decision 2026-10-25, every new 9:16 video): the final-MP4 review checks OCR text outside the caption row
  // against video-design/safe-zones.json (docs/safe-zones.md). Absent = the earlier OCR rule and review, byte for byte.
  safeZonesVersion:z.literal(1).optional()});
export type VoiceProfile=z.infer<typeof voiceProfileSchema>;
export const narrativeSchema=z.object({
  version:z.literal(2),title:z.string().min(1).max(72),summary:z.string().max(200),
  mainPoint:z.string().min(10).max(400),fullText:z.string().min(40).max(9000),
  caption:z.string().max(350),selectedAngleId:z.string().max(24),selectedHookId:z.string().max(24),
});
export type Narrative=z.infer<typeof narrativeSchema>;
export const editorialSchema=z.object({
  verdict:z.enum(["pass","changes"]),fullText:z.string().min(40).max(9000),summary:z.string().max(600),
  findings:z.array(z.object({span:z.string().max(500),note:z.string().max(500),category:z.enum(["clarity","causality","rhythm","hook","ending"])})).max(20),
});
export const claimSchema=z.object({id:z.string().regex(/^c\d+$/),span:z.string().min(1).max(800),claim:z.string().min(3).max(800),kind:z.enum(["fact","illustration"])});
export const claimsSchema=z.object({claims:z.array(claimSchema).min(1).max(100)});
export const factResultSchema=z.object({
  summary:z.string().max(800),
  claims:z.array(claimSchema.extend({status:z.enum(["supported","contradicted","uncertain","illustration"]),reason:z.string().max(800),evidence:z.array(z.object({sourceId:z.string().max(24),quote:z.string().min(8).max(800)})).max(4)})).min(1).max(100),
  queries:z.array(z.string().min(5).max(220)).max(3),
});
export type FactResult=z.infer<typeof factResultSchema>;
export const voicePlanSchema=z.object({
  version:z.literal(2),inputHash:z.string().length(64),plainText:z.string().max(9000),ttsInput:z.string().max(12000),
  profile:voiceProfileSchema.nullable(),delivery:z.string().max(1200),
  directions:z.array(z.object({wordIndex:z.number().int().min(0),tag:z.enum(["curious","thoughtful","confident","warm"])})).max(8),
  preservePauses:z.literal(true),
  language:z.literal("en").optional(),
  // Spoken-only replacements (TTS input), e.g. the brand read as «экс-тюнд»; captions and screen keep the written form.
  pronunciations:z.array(z.object({written:z.string().min(1).max(40),spoken:z.string().min(1).max(40)})).max(8).optional(),
});
export const qualityFindingSchema=z.object({kind:z.enum(["readability","safe-zone","continuity","synchronization","meaning"]),start:z.number().min(0),end:z.number().min(0),detail:z.string().max(700),severity:z.enum(["warning","error"])});
export const frameReviewSchema=z.object({verdict:z.enum(["pass","changes"]),summary:z.string().max(800),findings:z.array(qualityFindingSchema).max(30)});
export const qualityReportSchema=z.object({version:z.literal(2),artifactHash:z.string().length(64),inputHash:z.string().length(64),checkedAt:z.string(),coverage:z.object({decoded:z.boolean(),sampledFrames:z.number().int(),frameModel:z.boolean(),audioText:z.boolean(),humanPlayback:z.literal(false),humanListening:z.literal(false)}),findings:z.array(qualityFindingSchema),status:z.enum(["pass","changes","unavailable"])});
