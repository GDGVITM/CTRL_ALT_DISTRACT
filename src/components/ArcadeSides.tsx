import type { CSSProperties } from "react";

type Screen = "pong" | "invaders" | "runner" | "eq";

interface CabSpec {
  accent: string;
  screen: Screen;
  delay: number;
}

// index 0 is the nearest cabinet; each one further back is smaller and closer to the vanishing point
const SPECS: CabSpec[] = [
  { accent: "#FF3EA5", screen: "invaders", delay: 0 },
  { accent: "#38E1FF", screen: "pong", delay: 0.7 },
  { accent: "#FFD23F", screen: "runner", delay: 1.4 },
  { accent: "#2EE59D", screen: "eq", delay: 0.3 },
  { accent: "#FF3EA5", screen: "pong", delay: 1.1 },
];
// depth 0, 240, 480… with a 900px focal length -> scale = 900 / (900 + depth)
const SCALES = [1, 0.79, 0.65, 0.55, 0.48];

function ScreenContent({ screen }: { screen: Screen }) {
  switch (screen) {
    case "pong":
      return (
        <>
          <i className="pong-pad pong-l" />
          <i className="pong-pad pong-r" />
          <i className="pong-ball" />
          <i className="pong-net" />
        </>
      );
    case "invaders":
      return (
        <>
          <span className="inv-grid">
            {Array.from({ length: 15 }).map((_, i) => (
              <i key={i} />
            ))}
          </span>
          <u className="inv-ship" />
        </>
      );
    case "runner":
      return (
        <>
          <i className="run-dino" />
          <i className="run-cactus" />
          <i className="run-ground" />
        </>
      );
    case "eq":
      return (
        <span className="eq-bars">
          {Array.from({ length: 6 }).map((_, i) => (
            <i key={i} style={{ animationDelay: `${i * 0.13}s` }} />
          ))}
        </span>
      );
  }
}

// Side-on cabinet outline (x: 0 = back, 100 = front): overhanging marquee, recessed screen, jutting control deck.
const PROFILE: Array<[number, number]> = [
  [0, 9], [16, 0], [96, 0], [96, 11], [86, 13], [86, 40], [100, 44], [100, 53], [93, 54], [93, 100], [0, 100],
];

function Cabinet({ spec, index }: { spec: CabSpec; index: number }) {
  const pts = PROFILE.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <div
      className={`arcade-cab cab-${index + 1}`}
      style={{ "--c": spec.accent, "--d": `${spec.delay}s`, "--i": index, "--s": SCALES[index] } as CSSProperties}
    >
      <span className="cab-pool" />
      {/* solid side panel */}
      <svg className="cab-side" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={pts} className="cab-side-fill" vectorEffect="non-scaling-stroke" />
        <line x1="8" y1="58" x2="8" y2="94" className="cab-side-trim" vectorEffect="non-scaling-stroke" />
        <line x1="40" y1="58" x2="40" y2="94" className="cab-side-trim" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* solid front face */}
      <div className="cab-front">
        <div className="cab-top">
          <span className="cab-marquee" />
        </div>
        <div className="cab-bezel">
          <div className="cab-screen">
            <ScreenContent screen={spec.screen} />
            <span className="cab-glare" />
          </div>
        </div>
        <div className="cab-deck">
          <b className="cab-joy" />
          <b className="cab-btn cab-btn-a" />
          <b className="cab-btn cab-btn-b" />
        </div>
        <div className="cab-body">
          <span className="cab-coin" />
        </div>
      </div>
    </div>
  );
}

function Side({ side }: { side: "left" | "right" }) {
  // painted far -> near so nearer cabinets correctly cover the ones behind them
  const order = SPECS.map((spec, i) => ({ spec, i })).reverse();
  return (
    <div className={`arcade-side arcade-${side}`}>
      <div className="arcade-wall" />
      <div className="arcade-scene">
        <div className="arcade-floor" />
      </div>
      <div className="arcade-row">
        {order.map(({ spec, i }) => (
          <Cabinet key={i} spec={spec} index={i} />
        ))}
      </div>
    </div>
  );
}

/** Decorative arcade hall for the empty gutters beside centred page content:
 *  a receding line of solid, flickering cabinets on each side. */
export function ArcadeSides({ contentMax = 1280 }: { contentMax?: number }) {
  return (
    <div
      className="arcade-sides"
      aria-hidden="true"
      style={{ "--content-max": `${contentMax}px` } as CSSProperties}
    >
      <Side side="left" />
      <Side side="right" />
    </div>
  );
}
