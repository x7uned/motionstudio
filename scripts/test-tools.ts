// Tools for tests on any OS: the studio venv Python (or the system one) and the studio FFmpeg.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {venvBin,localTool,IS_WIN} from "../src/lib/platform";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const venv=venvBin(path.join(ROOT,".runtime","venv"),"python");
export const TEST_PYTHON=process.env.STUDIO_PYTHON||(fs.existsSync(venv)?venv:IS_WIN?"python":"python3");
export const TEST_FFMPEG=localTool(ROOT,"ffmpeg",process.env.STUDIO_FFMPEG);
process.env.PYTHONUTF8??="1";process.env.PYTHONIOENCODING??="utf-8";
