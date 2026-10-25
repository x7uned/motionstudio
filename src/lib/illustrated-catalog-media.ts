// Real logo / photo tiles (user decision 2026-10-21). Drawing: renderer/IllustratedFilm.tsx (MediaTiles, HTML layer above
// the world). The picture comes only from the project's media snapshot (src/lib/media-assets.ts) whose subject matches label.
// Meta only (no React): illustrated.ts spreads these into ILLUSTRATED_KINDS, FOOTPRINT and KIND_GUIDE.
export const MEDIA_TILE_KINDS=["logo-tile","person-tile"] as const;
export type MediaTileKind=typeof MEDIA_TILE_KINDS[number];
/** Tile 200×200 plus the name line under it. */
export const MEDIA_FOOTPRINT:Record<MediaTileKind,[number,number]>={"logo-tile":[240,290],"person-tile":[240,290]};
const STATES="active 0 = спокойно; 0.5 = акцент (сиреневое кольцо, плитка чуть приподнята); 1 = потеря или сбой (розовое кольцо, розовый значок ↓, картинка тускнеет)";
export const MEDIA_GUIDE:Record<MediaTileKind,string>={
 "logo-tile":`маленькая плитка-иконка: светлый скруглённый квадрат с НАСТОЯЩИМ логотипом компании/сервиса из снимка media проекта и названием под ним. label = subject из media дословно (только те, что есть в media). Появление — на слове названия; ставь рядом с предметом, о котором речь (над табличкой с суммой, у телефона), не на полу: плитка висит на стене, низ ≥80 выше floorY. Несколько компаний — в ряд с шагом ≥260 при scale 1. scale 0.6–1. ${STATES}`,
 "person-tile":`плитка-портрет: настоящее фото/портрет человека из снимка media проекта в светлой скруглённой рамке и имя под ним. label = subject из media дословно. Появление — на имени; ставь рядом с его изобретением или событием, не на полу. Портрет называет человека, а не показывает событие: не выдавай его за снимок того момента. scale 0.6–1. ${STATES}`,
};
export const MEDIA_KEY_SECONDS:Record<MediaTileKind,number>={"logo-tile":.5,"person-tile":.5};
