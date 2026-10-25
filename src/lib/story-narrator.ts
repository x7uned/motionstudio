/** Local, versioned storyteller atlas. It is deliberately independent of the Codex pet protocol. */
export const STORY_NARRATOR_PACK="denis-story/v1" as const;
export const STORY_NARRATOR_SHEET={columns:8,cell:[192,208] as const,size:[1536,2080] as const};
export const STORY_NARRATOR_STATES=["idle","wave","talk","explain","point","think","skeptical","surprised","sad","happy"] as const;
export type StoryNarratorState=typeof STORY_NARRATOR_STATES[number];
export const STORY_NARRATOR_LABELS:Record<StoryNarratorState,string>={
 idle:"Спокойствие",wave:"Приветствие",talk:"Рассказывает",explain:"Объясняет",point:"Обращает внимание",think:"Размышляет",skeptical:"Сомневается",surprised:"Удивляется",sad:"Сожалеет",happy:"Радуется",
};
export function narratorState(emotion:string):StoryNarratorState{
 if(emotion==="jump")return "surprised";
 if(emotion==="shrug")return "skeptical";
 return (STORY_NARRATOR_STATES as readonly string[]).includes(emotion)?emotion as StoryNarratorState:"idle";
}
export function narratorPose(emotion:string,seconds:number){
 const state=narratorState(emotion),row=STORY_NARRATOR_STATES.indexOf(state),frames=state==="idle"?7:state==="wave"?4:6;
 // Walk the generated pose sequence forwards and backwards: smooth endpoints, no reset to frame zero.
 const tick=Math.floor(Math.max(0,seconds)*(state==="idle"?3:4));
 const period=2*(frames-1),phase=tick%period;
 return {state,row,frame:phase<frames?phase:period-phase};
}
export function narratorLayers(t:number,keys:{start:number;emotion:string}[]){
 let i=0;for(let k=1;k<keys.length;k++){if(keys[k].start>t)break;i=k;}
 const key=keys[i]??{start:0,emotion:"idle"};
 const p=Math.max(0,Math.min(1,(t-key.start)/.3)),opacity=p*p*(3-2*p);
 const current={...narratorPose(key.emotion,t-key.start),opacity:i?opacity:1};
 if(!i||opacity===1)return [current];
 const prior=keys[i-1];
 return [{...narratorPose(prior.emotion,t-prior.start),opacity:1-opacity},current];
}
