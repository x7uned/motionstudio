import {z} from "zod";
import {createProject} from "./store";
import {speechEnvironment} from "./provider";
import {voiceProfileSchema,contentModelSchema,factCheckSchema,projectLanguageSchema} from "./quality-contract";
import {DEFAULT_DELIVERY} from "./voice";
import {videoTemplateIdSchema} from "./video-templates";
import {outroBrandSchema} from "./xtuned-outro";
import {portraitLayoutSchema} from "./illustrated-layout";
import {MUSIC_BED_IDS} from "./music-bed-schema";

/** One create contract for the web UI (POST /api/studio action=create) and the agent CLI (`npm run studio -- create`). */
export const createRequestSchema=z.object({
 topic:z.string().trim().min(4).max(1500),
 duration:z.union([z.literal(30),z.literal(45),z.literal(60),z.literal(150)]),
 format:z.enum(["9:16","16:9"]),
 voice:z.boolean(),
 voiceMode:z.enum(["selected","baseline"]).optional(),
 productionTemplateId:videoTemplateIdSchema.optional(),
 authorProfileId:z.string().uuid().optional(),
 referenceSetId:z.string().uuid().optional(),
 renderMode:z.enum(["auto","2d","three"]).optional(),
 modelIds:z.array(z.string().regex(/^[a-f0-9]{24}$/)).max(8).optional(),
 contentModel:contentModelSchema.optional(),
 factCheck:factCheckSchema.optional(),
 language:projectLanguageSchema.optional(),
 /** Explicit outro brand (editor decision 2026-10-20); absent keeps @xtuned. */
 brand:outroBrandSchema.optional(),
 /** Portrait layout of illustrated films (editor decision 2026-10-20): tiktok-safe is the default for new 9:16 films; "classic" keeps the original header. */
 portraitLayout:z.union([portraitLayoutSchema,z.literal("classic")]).optional(),
 /** Explicit background music bed (docs/background-music.md); absent chooses by topic. */
 musicBed:z.enum(MUSIC_BED_IDS).optional(),
 /** Explicit film kind without a template (2026-10-21): the «Изометрия» city renderer. */
 filmKind:z.enum(["isometric"]).optional(),
 /** Explicit loop ending (user request 2026-10-22): illustrated 9:16 films end on their own first frame, no outro plate. */
 ending:z.literal("loop").optional(),
});
export type CreateRequest=z.infer<typeof createRequestSchema>;
export async function createFromRequest(input:unknown,extra:{agentMode?:{declaredAgent:string}}={}){
 const opts=createRequestSchema.parse(input);
 const config=opts.voice&&opts.voiceMode==="baseline"?await speechEnvironment():null;
 const voiceProfileOverride=config?voiceProfileSchema.parse({id:"configured-v2",voiceId:config.ELEVENLABS_VOICE_ID,model:"eleven_multilingual_v2",name:"Текущий голос · v2",delivery:DEFAULT_DELIVERY}):undefined;
 return createProject({...opts,voiceProfileOverride,...(extra.agentMode?{agentMode:extra.agentMode}:{})});
}
