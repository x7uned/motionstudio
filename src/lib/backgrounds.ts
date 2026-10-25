import {z} from "zod";

/** Approved 2026-10-18. IDs retain the original audition numbering; 07 is excluded. */
export const BACKGROUND_IDS=["01","02","03","04","05","06","08","09","10"] as const;
export const BACKGROUND_NAMES={"01":"Точечная матрица","02":"Инженерная сетка","03":"Звёздная пыль","04":"Топографические линии","05":"Мягкий свет","06":"Диагональная штриховка","08":"Дымчатое стекло","09":"Поток линий","10":"Печатная плата"} as const;
export const BACKGROUND_OPACITY=.5;
export const backgroundDesignSchema=z.object({version:z.literal(1),id:z.enum(BACKGROUND_IDS),opacity:z.number().min(0).max(1).optional()});
export type BackgroundDesign=z.infer<typeof backgroundDesignSchema>;
export function backgroundAt(index:number):BackgroundDesign {
 if(!Number.isInteger(index)||index<0||index>=BACKGROUND_IDS.length)throw new Error("Неизвестный фон.");
 return {version:1,id:BACKGROUND_IDS[index],opacity:BACKGROUND_OPACITY};
}
