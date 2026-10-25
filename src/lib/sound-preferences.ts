import type {EffectType} from "./sound-effects";

/** User audition decision, 2026-10-18. Snapshotted in every new cue sheet. */
export const SOUND_PREFERENCES={
 version:5,
 allowed:["ui-reveal","soft-whoosh","ui-highlight","fan-start"] as const,
 // @xtuned outro (2026-10-19): editor-chosen 8-bit click and arpeggio; used only by outro cues.
 outroEffects:["pixel-click","chiptune-arpeggio"] as const,
 excluded:["servo-motor","air-release"] as const,
 effectLevelScale:.6,
 fanLevelScale:.5,
 whooshLevelScale:.4,
 fadeInSeconds:.02,
 fadeOutSeconds:{"fan-start":.9,"soft-whoosh":.2,"ui-highlight":.16,"ui-reveal":.07,"pixel-click":.03,"chiptune-arpeggio":.15},
 backgroundGain:.009,
 minimumGapSeconds:.4,
 minimumSameEffectGapSeconds:3,
};

export function preferredSound(kind:string,effect?:EffectType):typeof SOUND_PREFERENCES.allowed[number]|typeof SOUND_PREFERENCES.outroEffects[number] {
 if(kind==="outro-click")return "pixel-click";
 if(kind==="outro-success")return "chiptune-arpeggio";
 if(effect==="fan-start"||kind==="assembly-fan")return "fan-start";
 if(effect==="soft-whoosh"||kind==="outro-transition"||kind==="assembly-cutaway")return "soft-whoosh";
 if(effect==="ui-highlight"||kind==="highlight")return "ui-highlight";
 return "ui-reveal";
}

/** Never slide a sound away from its visual event just to fill a quota. */
export function spaceSoundEffects<T extends {at:number;kind:string;effect?:EffectType}>(cues:readonly T[]):T[] {
 const kept:T[]=[],last=new Map<string,T>();
 const priority=(c:T)=>c.kind==="outro-transition"||c.kind==="outro-click"||c.kind==="outro-success"?5:c.kind==="assembly-fan"?4:c.kind.startsWith("assembly-")||["shot","hit","peekShot","rollback"].includes(c.kind)?3:c.kind==="highlight"?2:1;
 for(const cue of [...cues].sort((a,b)=>a.at-b.at)){
  const effect=preferredSound(cue.kind,cue.effect),previous=last.get(effect);
  if(previous&&cue.at-previous.at<SOUND_PREFERENCES.minimumSameEffectGapSeconds-1e-8){
   if(priority(cue)<=priority(previous))continue;
   kept.splice(kept.indexOf(previous),1);
  }
  kept.push(cue);last.set(effect,cue);
 }
 return kept;
}
