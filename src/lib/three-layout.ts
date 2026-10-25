/** Portrait 3D lower-third spacing, requested by the editor. Legacy and landscape stay unchanged. */
export function threeLayout(portrait:boolean,qualityMode:boolean){
 const expanded=portrait&&qualityMode;
 return {
  stageTop:portrait?260:150,
  stageHeight:portrait?850:690,
  chapterTop:portrait?(expanded?1010:900):730,
  captionTop:expanded?1250:1124,
 };
}
