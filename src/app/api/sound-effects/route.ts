import {NextResponse} from "next/server";
import {soundLibrary} from "@/lib/sound-provider";
export const runtime="nodejs";
export const dynamic="force-dynamic";
// Read-only diagnostics; opening this route never searches or downloads anything.
export async function GET(){return NextResponse.json(soundLibrary().status());}
