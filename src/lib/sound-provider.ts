import {SoundLibrary} from "./sound-effects";
import {ROOT,db} from "./store";
import {FFMPEG} from "./provider";
export function soundLibrary(){return new SoundLibrary(ROOT,db(),{ffmpeg:FFMPEG});}
