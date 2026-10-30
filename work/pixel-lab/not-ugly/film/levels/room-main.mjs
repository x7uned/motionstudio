// «You're not ugly» — Builder ROOM's level module: the side-view bedroom at night (cached, room-set.mjs), the mirror
// with your reflection, and the cast (room-cast.mjs: YOU, the friend, the phone, the distance line, rings, hearts).
import { drawRoom, drawRoomLive } from "./room-set.mjs";
import { drawMirror, drawCast } from "./room-cast.mjs";

export function back(c, V, t) { drawRoom(c, V); drawRoomLive(c, V, t); drawMirror(c, V, t); }
export function actors(c, V, t) { drawCast(c, V, t); }
