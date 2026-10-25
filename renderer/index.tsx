import {StudioBackground} from "./StudioBackground";
import React from "react";
import {
  AbsoluteFill,
  Composition,
  registerRoot,
  useCurrentFrame,
  interpolate,
  spring,
  Audio,
  staticFile,
} from "remotion";
import "@fontsource-variable/manrope";

import "@fontsource-variable/inter";
import { ExplainerFilm, type SpeechAlignment } from "./Explainer";
import { TelephoneFilm } from "./TelephoneFilm";
import {ThreeFilm} from "./ThreeFilm";
import {LandscapeExplainer} from "./PersistentDiagram";
import {NetcodeFilm} from "./NetcodeFilm";
import {IllustratedFilm} from "./IllustratedFilm";
import {IsometricFilm} from "./IsometricFilm";
import {XtunedOutro,OutroFreeze,filmPlan} from "./XtunedOutro";

import {
  sceneClock,
  type Storyboard,
  type StyleProfile,
} from "../src/lib/model";
type Props = {
  plan: Storyboard;
  profile: StyleProfile;
  format: string;
  audio?: string;
  alignment?: SpeechAlignment[];
  models?: {id:string;file:string;animations:string[]}[];
  modelBase?: string;
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
function Film({ plan, profile: p, format, audio }: Props) {
  const frame = useCurrentFrame();
  const portrait = format === "9:16";
  const w = portrait ? 1080 : 1920;
  const h = portrait ? 1920 : 1080;
  const clock = sceneClock(plan);
  const i = Math.max(
    0,
    clock.findIndex(
      (s) => frame >= s.startFrame && frame < s.startFrame + s.frames,
    ),
  );
  const s = clock[i];
  const f = frame - s.startFrame;
  const appear = spring({
    frame: f,
    fps: 30,
    config: { damping: 22, stiffness: 160, mass: 0.8 },
  });
  const out =
    i === clock.length - 1
      ? 1
      : interpolate(f, [s.frames - 7, s.frames], [1, 0], clamp);
  const x = portrait ? 88 : 140;
  const titleSize = portrait ? (s.title.length > 34 ? 80 : 94) : 105;
  return (
    <AbsoluteFill
      style={{
        background: p.background,
        color: p.foreground,
        fontFamily: `'${p.font} Variable',sans-serif`,
        overflow: "hidden",
      }}
    >
      <StudioBackground design={p.backgroundDesign}/>
      {audio && <Audio src={staticFile(audio)} />}
      {!p.backgroundDesign&&<AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle at 85% 35%, ${p.accent}19, transparent 45%)`,
        }}
      />}
      <div
        style={{
          position: "absolute",
          top: portrait ? 145 : 78,
          left: x,
          right: x,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 24,
          letterSpacing: 3,
          opacity: 0.65,
        }}
      >
        <span>ПРОСТЫМИ СЛОВАМИ</span>
        <span>
          {String(i + 1).padStart(2, "0")} /{" "}
          {String(clock.length).padStart(2, "0")}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: x,
          right: x,
          top: portrait ? 255 : 170,
          opacity: out,
          transform: `translateY(${(1 - appear) * 40}px)`,
        }}
      >
        <div
          style={{
            color: p.accent,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 3,
            marginBottom: 24,
          }}
        >
          {i === 0
            ? "РАЗБЕРЁМСЯ ЗА МИНУТУ"
            : i === clock.length - 1
              ? "СОБЕРЁМ ВСЁ ВМЕСТЕ"
              : `ШАГ ${i}`}
        </div>
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 750,
            letterSpacing: -4,
            lineHeight: 1.08,
            maxWidth: portrait ? 920 : 1580,
            textWrap: "balance",
          }}
        >
          {s.title}
        </div>
        <div
          style={{
            fontSize: portrait ? 38 : 38,
            lineHeight: 1.4,
            opacity: 0.65,
            marginTop: 28,
            maxWidth: portrait ? 900 : 1500,
          }}
        >
          {s.subtitle}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: x,
          right: x,
          top: portrait ? 790 : 510,
          opacity: out,
          transform: `translateY(${(1 - appear) * 28}px)`,
        }}
      >
        {s.visual === "spotlight" ? (
          <div
            style={{
              padding: portrait ? "80px 45px" : "55px",
              display: "grid",
              gridTemplateColumns: portrait ? "1fr" : "200px 1fr",
              columnGap: 60,
              alignItems: "center",
              border: `1px solid ${p.accent}70`,
              borderRadius: 32,
              background: `${p.accent}0D`,
            }}
          >
            <div
              style={{
                fontSize: portrait ? 140 : 120,
                gridRow: portrait ? undefined : "1 / 3",
                color: p.accent,
                lineHeight: 1,
                fontWeight: 650,
                letterSpacing: -7,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div
              style={{
                fontSize: portrait ? 54 : 52,
                fontWeight: 650,
                lineHeight: 1.25,
                marginTop: portrait ? 38 : 0,
              }}
            >
              {s.items[0]}
            </div>
            <div
              style={{
                fontSize: 30,
                opacity: 0.58,
                marginTop: 28,
                gridColumn: portrait ? undefined : 2,
              }}
            >
              {s.items.slice(1).join("  ·  ")}
            </div>
          </div>
        ) : s.visual === "compare" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: portrait
                ? "1fr 1fr"
                : `repeat(${s.items.length},1fr)`,
              gap: 24,
            }}
          >
            {s.items.map((item, n) => (
              <div
                key={n}
                style={{
                  padding: portrait ? 30 : s.items.length > 2 ? 30 : 45,
                  border: `1px solid ${p.accent}${n === 1 ? "AA" : "35"}`,
                  borderRadius: 24,
                  background: n === 1 ? `${p.accent}15` : "transparent",
                }}
              >
                <div style={{ fontSize: 24, opacity: 0.5, marginBottom: 24 }}>
                  {String(n + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontSize: portrait ? 42 : s.items.length > 2 ? 36 : 48,
                    fontWeight: 650,
                    lineHeight: 1.25,
                  }}
                >
                  {item}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: portrait ? "column" : "row",
              gap: portrait ? 22 : 20,
            }}
          >
            {s.items.map((item, n) => {
              const a = spring({
                frame: f - 8 - n * 6,
                fps: 30,
                config: { damping: 24 },
              });
              return (
                <div
                  key={n}
                  style={{
                    position: "relative",
                    flex: 1,
                    padding: portrait ? "32px 36px" : "34px 28px",
                    borderRadius: 22,
                    border: `1px solid ${p.accent}${n === s.items.length - 1 ? "90" : "30"}`,
                    background: `${p.accent}${n === s.items.length - 1 ? "19" : "07"}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 26,
                    opacity: a,
                    transform: `translateY(${(1 - a) * 25}px)`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 24,
                      color: p.accent,
                      fontFamily: "monospace",
                    }}
                  >
                    {s.visual === "code"
                      ? "</>"
                      : s.visual === "checklist"
                        ? "✓"
                        : String(n + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontSize: portrait ? 42 : 33,
                      fontWeight: 600,
                      lineHeight: 1.25,
                    }}
                  >
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: x,
          right: x,
          bottom: portrait ? 270 : 125,
          fontSize: portrait ? 32 : 28,
          opacity: 0.55,
          lineHeight: 1.4,
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 8,
            background: p.accent,
            flexShrink: 0,
          }}
        />
        {plan.title}
      </div>
      <div
        style={{
          position: "absolute",
          left: x,
          right: x,
          bottom: portrait ? 210 : 80,
          height: 4,
          background: `${p.foreground}18`,
        }}
      >
        <div
          style={{
            height: 4,
            background: p.accent,
            width: `${(frame / (clock.at(-1)!.startFrame + clock.at(-1)!.frames - 1)) * 100}%`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
const fallback: any = {
  plan: {
    title: "Motion Studio",
    summary: "",
    factNotes: "",
    scenes: [
      {
        id: "s",
        title: "Собираем историю",
        subtitle: "От идеи до готового ролика",
        narration: "",
        visual: "flow",
        items: ["Идея", "Сценарий", "Видео"],
        seconds: 10,
      },
    ],
  },
  profile: {
    background: "#101B2D",
    foreground: "#F3F6FC",
    accent: "#A9C9FF",
    font: "Manrope",
  },
  format: "9:16",
};
registerRoot(() => (
  <Composition
    id="StudioFilm"
    component={(props: Props) => <AbsoluteFill><OutroFreeze plan={props.plan}>{props.plan.filmKind === "isometric" && props.plan.isometric && props.format === "9:16" ? <IsometricFilm {...props}/> : props.plan.filmKind === "illustrated" && props.plan.illustrated && props.format === "9:16" ? <IllustratedFilm {...props}/> : props.profile.production?.version===2 && !["three","netcode","telephone-history","illustrated","isometric"].includes(props.plan.filmKind||"") ? (props.format==="9:16" ? <ExplainerFilm {...props} plan={filmPlan(props.plan)}/> : <LandscapeExplainer {...props} plan={filmPlan(props.plan)}/>) : props.plan.filmKind === "netcode" && props.plan.netcode && props.format === "9:16" ? <NetcodeFilm {...props}/> : props.plan.filmKind === "three" && props.plan.world3d ? <ThreeFilm {...props}/> : props.plan.filmKind === "telephone-history" && props.format === "9:16" ? <TelephoneFilm {...props}/> : props.profile.template === "explainer" && props.format === "9:16" ? <ExplainerFilm {...props} plan={filmPlan(props.plan)} /> : <Film {...props} plan={filmPlan(props.plan)} />}</OutroFreeze><XtunedOutro plan={props.plan} alignment={props.alignment} format={props.format} backgroundDesign={props.profile.backgroundDesign} layout={props.profile.production?.portraitLayout}/></AbsoluteFill>}
    defaultProps={fallback}
    durationInFrames={300}
    fps={30}
    width={1080}
    height={1920}
    calculateMetadata={({ props }: any) => ({
      width: props.format === "9:16" ? 1080 : 1920,
      height: props.format === "9:16" ? 1920 : 1080,
      durationInFrames: Math.round(
        props.plan.scenes.reduce((n: number, s: any) => n + s.seconds, 0) * 30,
      ),
    })}
  />
));
