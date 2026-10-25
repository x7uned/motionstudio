import {z} from "zod";
export const outroMotionSchema=z.object({fadeSeconds:z.number().min(.5).max(1.1),avatarDelaySeconds:z.number().min(0).max(.5),risePixels:z.number().min(16).max(80),avatarSize:z.number().min(380).max(490)});
export const creatorBrandingSchema=z.object({
 version:z.literal(1),username:z.string().regex(/^@[A-Za-z0-9_.-]{1,31}$/),
 avatarFile:z.string().regex(/^[a-f0-9-]{36}\/branding\/[a-zA-Z0-9_-]+\.png$/),avatarSha256:z.string().regex(/^[a-f0-9]{64}$/),hideSchematicNote:z.boolean(),
 outro:z.object({sceneId:z.string().min(1),question:z.string().min(1).max(40),callToAction:z.string().min(1).max(32),motion:outroMotionSchema}),
});
export type CreatorBranding=z.infer<typeof creatorBrandingSchema>;
const smooth=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};
export function creatorOutroState(t:number,start:number,motion:z.infer<typeof outroMotionSchema>){
 const progress=smooth((t-start)/motion.fadeSeconds),avatar=smooth((t-start-motion.avatarDelaySeconds)/.75),name=smooth((t-start-.12)/.55);
 return {opacity:progress,contentOpacity:1-progress,avatarOpacity:avatar,avatarY:(1-avatar)*motion.risePixels,nameOpacity:name,nameY:(1-name)*22};
}
