import fs from "node:fs";
import path from "node:path";
import {bundle} from "@remotion/bundler";

/**
 * Remotion bundle whose public folder is the live project folder, on every OS.
 * Remotion ignores symlinkPublicDir on Windows and copies the whole folder once (files written later — audio.wav, media,
 * models of new projects — would be missing). There the bundle gets an empty public folder and then a directory
 * junction (no admin rights needed) to the real one.
 */
type BundleOpts=Exclude<Parameters<typeof bundle>[0],string>;
export async function bundleLive(opts:BundleOpts&{publicDir:string}){
 if(process.platform!=="win32")return bundle({...opts,symlinkPublicDir:true});
 const empty=path.join(path.dirname(opts.publicDir),".remotion-empty-public");
 fs.mkdirSync(empty,{recursive:true});
 const serveUrl=await bundle({...opts,publicDir:empty,symlinkPublicDir:false});
 const target=path.join(serveUrl,"public");
 fs.rmSync(target,{recursive:true,force:true});
 fs.symlinkSync(path.resolve(opts.publicDir),target,"junction");
 return serveUrl;
}
