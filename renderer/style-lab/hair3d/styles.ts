// Five 3D looks over one world. A style changes materials, light, sky, geometry kit and post — never the story clock.
import * as THREE from "three";

export type StyleId = "toon" | "clay" | "voxel" | "ps1" | "toy";
export type Pal = {
  sky: [string, string]; fog?: string; hair: string; hairTip: string; skin: string; hoodie: string; pants: string; shoe: string;
  floor: string; wall: string; roof: string; ground: string; road: string; line: string; tree: string; trunk: string; cat: string; catBelly: string;
  houses: string[]; roofs: string[]; window: string; sun: string; ambient: string;
};
export type Style = {
  id: StyleId; name: string; ru: string; pal: Pal;
  outline: boolean; voxel: boolean; scale: number; step: number; exposure: number; shadows: boolean;
  hud: { fg: string; bg: string; accent: string; font: string; stroke?: string };
  strands: number; strandR: number; radial: number;
  key: number; fill: number; hemi: number;
};

const P = (p: Partial<Pal> & Pick<Pal, "hair">): Pal => ({
  sky: ["#8FD3FF", "#E9F6FF"], hairTip: p.hair, skin: "#F2C29E", hoodie: "#4A6CF7", pants: "#2B2F45", shoe: "#F4F4F4",
  floor: "#C98E5A", wall: "#F1E4CF", roof: "#C2483D", ground: "#7CC35A", road: "#5A5D6B", line: "#F4E9B5", tree: "#3E9E4A", trunk: "#7A4E2D",
  cat: "#F0952F", catBelly: "#FFE4C2", houses: ["#F6D7A7", "#BFE3F2", "#F2B9C6", "#D9E8B0", "#E8D2F2", "#FFF1C9"], roofs: ["#C2483D", "#3D6FC2", "#5A5A6E", "#8A4FB8", "#2F8F6B"],
  window: "#20263A", sun: "#FFF4DD", ambient: "#B9D7FF", ...p,
});

export const STYLES: Record<StyleId, Style> = {
  toon: {
    id: "toon", name: "Toon cel", ru: "Мульт с контуром", outline: true, voxel: false, scale: 1, step: 0, exposure: 1, shadows: true,
    pal: P({ hair: "#2A1F5C", hairTip: "#5B4BD6", hoodie: "#FF5A3C", skin: "#FFD3B0", sky: ["#5FC8FF", "#D8F3FF"], ground: "#6FD15A", floor: "#E8A15C", wall: "#FFF0D6" }),
    hud: { fg: "#FFFFFF", bg: "#1B1440", accent: "#FFD84A", font: "'Manrope Variable',sans-serif", stroke: "#1B1440" },
    strands: 70, strandR: .024, radial: 6, key: 2.4, fill: .55, hemi: .9,
  },
  clay: {
    id: "clay", name: "Clay stop-motion", ru: "Пластилин", outline: false, voxel: false, scale: 1, step: 1 / 15, exposure: 1.05, shadows: true,
    pal: P({ hair: "#7A3B1E", hairTip: "#B2602F", hoodie: "#3FA37A", skin: "#F0B48E", pants: "#3B3A5C", sky: ["#F6C48A", "#FFE9CF"], ground: "#8DBF5A", floor: "#B87A4B", wall: "#F3D9B8", roof: "#B8503A", cat: "#E58A3A" }),
    hud: { fg: "#FFF3E2", bg: "#6B3A22", accent: "#FFC75A", font: "'Manrope Variable',sans-serif" },
    strands: 46, strandR: .04, radial: 8, key: 2.6, fill: .7, hemi: .8,
  },
  voxel: {
    id: "voxel", name: "Voxel blocks", ru: "Воксели", outline: false, voxel: true, scale: 1, step: 0, exposure: 1, shadows: true,
    pal: P({ hair: "#5A3A1E", hairTip: "#7A5230", hoodie: "#2EA6D9", skin: "#E8B98F", sky: ["#7EB6FF", "#CFE6FF"], ground: "#5DAA3C", floor: "#9C6B3E", wall: "#D8C7A6", roof: "#8E4B32", road: "#6B6B6B" }),
    hud: { fg: "#FFFFFF", bg: "#2B2B2B", accent: "#FFE05A", font: "'JetBrains Mono',monospace" },
    strands: 60, strandR: .03, radial: 4, key: 2.3, fill: .6, hemi: .85,
  },
  ps1: {
    id: "ps1", name: "PS1 retro", ru: "Ретро PS1", outline: false, voxel: false, scale: .25, step: 0, exposure: 1, shadows: false,
    pal: P({ hair: "#3A2414", hairTip: "#6A4428", hoodie: "#8C2F39", skin: "#D9A07A", pants: "#26324A", sky: ["#2C3E66", "#C98A6B"], fog: "#B07E6A", ground: "#5E7A3A", floor: "#7A5434", wall: "#C9B89A", roof: "#6E3A34", road: "#4A4A52", tree: "#2F5E33" }),
    hud: { fg: "#F2F2F2", bg: "#101018", accent: "#FF4F6A", font: "'JetBrains Mono',monospace" },
    strands: 40, strandR: .03, radial: 3, key: 2.0, fill: .7, hemi: 1.0,
  },
  toy: {
    id: "toy", name: "Glossy toy", ru: "Глянцевая игрушка", outline: false, voxel: false, scale: 1, step: 0, exposure: .92, shadows: true,
    pal: P({ hair: "#FF5FA8", hairTip: "#FFB3D6", hoodie: "#7B6CFF", skin: "#FFD9C2", pants: "#4B4F8C", shoe: "#FFFFFF", sky: ["#B9A8FF", "#FFE3F1"], ground: "#9EE6B8", floor: "#FFD08A", wall: "#FFF4FA", roof: "#7B6CFF", road: "#9A9CC8", line: "#FFFFFF", tree: "#5FD39A", trunk: "#C98A6B", cat: "#FFB347",
      houses: ["#FFE3A3", "#BDEBFF", "#FFC7DE", "#D6F5C3", "#E6D6FF", "#FFFFFF"], roofs: ["#FF7A9C", "#6C8CFF", "#A27BFF", "#5FD3B0", "#FFB347"] }),
    hud: { fg: "#FFFFFF", bg: "#7B6CFF", accent: "#FFE45A", font: "'Manrope Variable',sans-serif" },
    strands: 56, strandR: .03, radial: 8, key: 2.0, fill: .5, hemi: .7,
  },
};

// ---- textures (drawn once in the browser canvas) -----------------------------------------------------------------------
const rand = (s: number) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, nearest = false) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; } else t.anisotropy = 4;
  return t;
}
/** Lines along U: rope fibres. */
export const fibreTex = (base: string, tip: string, nearest = false, size = 256) => canvasTex(size, size, g => {
  const r = rand(7); g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 1.4; i++) {
    const y = r() * size, a = .25 + r() * .5; g.strokeStyle = r() < .5 ? tip : "#000000"; g.globalAlpha = a * (g.strokeStyle === "#000000" ? .35 : .55); g.lineWidth = size / 128 * (1 + r() * 2);
    g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= size; x += size / 16) g.lineTo(x, y + Math.sin(x / size * Math.PI * 2 + i) * size / 64); g.stroke();
  }
  g.globalAlpha = 1;
}, nearest);
/** Curly mass: arcs in all directions, tiles seamlessly enough under planar UVs. */
export const curlTex = (base: string, tip: string, nearest = false, size = 256) => canvasTex(size, size, g => {
  const r = rand(19); g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 1.2; i++) {
    const x = r() * size, y = r() * size, rad = size * (.03 + r() * .09), a0 = r() * 6.28, dark = r() < .45;
    g.strokeStyle = dark ? "#000000" : tip; g.globalAlpha = dark ? .3 : .5; g.lineWidth = size / 128 * (1 + r() * 1.5);
    for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) { g.beginPath(); g.arc(x + ox, y + oy, rad, a0, a0 + 1.5 + r() * 2); g.stroke(); }
  }
  g.globalAlpha = 1;
}, nearest);
/** Fingerprint-ish bump for clay. */
export const clayBump = () => canvasTex(256, 256, g => {
  const r = rand(3); g.fillStyle = "#808080"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) { g.strokeStyle = r() < .5 ? "#9a9a9a" : "#666666"; g.globalAlpha = .5; g.lineWidth = 1 + r() * 2; g.beginPath(); const x = r() * 256, y = r() * 256; g.arc(x, y, 6 + r() * 26, r() * 6, r() * 6 + 2); g.stroke(); }
  for (let i = 0; i < 1800; i++) { g.fillStyle = r() < .5 ? "#a0a0a0" : "#5e5e5e"; g.globalAlpha = .35; g.fillRect(r() * 256, r() * 256, 2, 2); }
  g.globalAlpha = 1;
});
/** 16×16 block noise for voxel/PS1 surfaces (white-based, tinted by material colour). */
export const blockTex = (seed = 5, amount = .22) => canvasTex(16, 16, g => {
  const r = rand(seed); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = Math.round(255 * (1 - amount + amount * r())); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); }
}, true);
export const toonRamp = () => { const d = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; return t; };

// ---- material kit ----------------------------------------------------------------------------------------------------
export type MatKind = "plain" | "hair" | "hairMass" | "rope" | "glow" | "glass" | "flat";
export type Kit = { mat: (color: string, kind?: MatKind) => THREE.Material; outline: THREE.Material | null; dispose: () => void };

/** PS1: snap clip-space vertices to a coarse grid (the jitter of the original hardware). */
function ps1Snap(m: THREE.Material) {
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n if (gl_Position.w > 0.05) gl_Position.xy = floor(gl_Position.xy / gl_Position.w * vec2(135.0, 240.0) + .5) / vec2(135.0, 240.0) * gl_Position.w;"); };
  m.customProgramCacheKey = () => "ps1snap";
  return m;
}
export function makeKit(s: Style): Kit {
  const cache = new Map<string, THREE.Material>(), owned: { dispose: () => void }[] = [];
  const own = <T extends { dispose: () => void }>(x: T) => { owned.push(x); return x; };
  const ramp = s.id === "toon" ? own(toonRamp()) : null;
  const bump = s.id === "clay" ? own(clayBump()) : null;
  const block = s.voxel || s.id === "ps1" ? own(blockTex(5, s.id === "ps1" ? .3 : .2)) : null;
  const fibre = own(fibreTex(s.pal.hair, s.pal.hairTip, s.voxel || s.id === "ps1", s.id === "ps1" ? 32 : s.voxel ? 32 : 256));
  const curl = own(curlTex(s.pal.hair, s.pal.hairTip, s.voxel || s.id === "ps1", s.id === "ps1" ? 32 : s.voxel ? 32 : 256));
  curl.repeat.set(s.voxel || s.id === "ps1" ? 1 : 2.2, s.voxel || s.id === "ps1" ? 1 : 2.2);
  const build = (color: string, kind: MatKind): THREE.Material => {
    const c = new THREE.Color(color), vc = kind === "hair";
    if (kind === "glow") return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    const map = kind === "rope" ? fibre : kind === "hairMass" ? curl : block;
    const base = kind === "rope" || kind === "hairMass" ? new THREE.Color("#ffffff") : vc ? new THREE.Color("#ffffff") : c;
    switch (s.id) {
      case "toon": return new THREE.MeshToonMaterial({ color: base, gradientMap: ramp!, vertexColors: vc, map: kind === "rope" || kind === "hairMass" ? map : null });
      case "clay": return new THREE.MeshStandardMaterial({ color: base, roughness: kind === "glass" ? .3 : .92, metalness: 0, vertexColors: vc, bumpMap: bump, bumpScale: 1.2, map: kind === "rope" || kind === "hairMass" ? map : null });
      case "voxel": return new THREE.MeshLambertMaterial({ color: base, vertexColors: vc, map, flatShading: true });
      case "ps1": { const m = new THREE.MeshLambertMaterial({ color: base, vertexColors: vc, map, flatShading: true }); return kind === "flat" ? m : ps1Snap(m); }
      case "toy": { const hairy = kind === "hair" || kind === "rope" || kind === "hairMass";
        return new THREE.MeshPhysicalMaterial({ color: kind === "hair" ? new THREE.Color(s.pal.hair) : base, roughness: kind === "glass" ? .05 : hairy ? .45 : .32, metalness: 0, clearcoat: hairy ? .35 : 1, clearcoatRoughness: .2, envMapIntensity: hairy ? .45 : 1, map: kind === "rope" || kind === "hairMass" ? map : null }); }
    }
  };
  const outline = s.outline ? (() => {
    const m = new THREE.MeshBasicMaterial({ color: "#14102A", side: THREE.BackSide });
    m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed += normalize(objectNormal) * 0.016;"); };
    m.customProgramCacheKey = () => "outline";
    return m;
  })() : null;
  return {
    mat: (color, kind = "plain") => { const k = color + kind; let m = cache.get(k); if (!m) { m = build(color, kind); cache.set(k, m); } return m; },
    outline,
    dispose: () => { cache.forEach(m => m.dispose()); outline?.dispose(); owned.forEach(o => o.dispose()); },
  };
}
/** Hair-mass textures scroll outward while the hair grows. */
export function hairTextures(kit: Kit, s: Style) { return [kit.mat(s.pal.hair, "rope"), kit.mat(s.pal.hair, "hairMass")].map(m => (m as THREE.MeshStandardMaterial).map).filter(Boolean) as THREE.Texture[]; }
