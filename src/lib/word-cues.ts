export function cueWord(text:string){return text.toLocaleLowerCase("ru").replace(/[^a-zа-яё0-9-]/g,"");}
/** occurrence is one-based; omitted means the legacy first occurrence. */
export function findCue<T extends {text:string}>(words:T[],cue:string,occurrence=1):T|undefined{
  return words.filter(w=>cueWord(w.text)===cueWord(cue))[occurrence-1];
}
export function cueCount(text:string,cue:string){return text.split(/\s+/).filter(w=>cueWord(w)===cueWord(cue)).length;}
