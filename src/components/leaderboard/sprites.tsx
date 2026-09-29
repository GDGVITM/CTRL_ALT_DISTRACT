// Hand-built pixel-art podium characters (original fan-style sprites, drawn in code).

type Grid = string[][];
const W = 16;

const blank = (h: number): Grid => Array.from({ length: h }, () => Array<string>(W).fill("."));
const fill = (g: Grid, x0: number, x1: number, y: number, ch: string, y1 = y) => {
  for (let yy = y; yy <= y1; yy++) for (let x = x0; x <= x1; x++) g[yy][x] = ch;
};
const put = (g: Grid, x: number, y: number, ch: string) => {
  g[y][x] = ch;
};
const toRows = (g: Grid) => g.map((r) => r.join(""));

// ───────── The plumber brothers (cap/shirt colour and height differ) ─────────
function plumber(armsUp: boolean, tall: boolean): string[] {
  const legs = tall ? 4 : 2;
  const h = 16 + legs;
  const g = blank(h);

  // cap
  fill(g, 5, 10, 0, "C");
  fill(g, 4, 11, 1, "C");
  fill(g, 7, 8, 1, "W"); // cap badge
  fill(g, 3, 12, 2, "C");
  fill(g, 10, 13, 3, "c"); // visor

  // face
  fill(g, 3, 4, 3, "B"); // hair
  fill(g, 5, 9, 3, "S");
  fill(g, 3, 3, 4, "B");
  fill(g, 4, 12, 4, "S");
  put(g, 7, 4, "E");
  put(g, 10, 4, "E");
  fill(g, 3, 3, 5, "B");
  fill(g, 4, 13, 5, "S"); // nose
  fill(g, 4, 5, 6, "S");
  fill(g, 6, 12, 6, "B"); // moustache
  put(g, 13, 6, "S");
  fill(g, 5, 11, 7, "S");

  // torso
  fill(g, 3, 12, 8, "C");
  put(g, 5, 8, "U");
  put(g, 10, 8, "U");
  for (let y = 9; y <= 12; y++) fill(g, 5, 10, y, "U");
  put(g, 5, 9, "Y");
  put(g, 10, 9, "Y");
  fill(g, 5, 10, 13, "U");

  if (!armsUp) {
    fill(g, 3, 4, 9, "C", 10);
    fill(g, 11, 12, 9, "C", 10);
    fill(g, 3, 4, 11, "W", 12);
    fill(g, 11, 12, 11, "W", 12);
  } else {
    fill(g, 1, 2, 5, "C", 8);
    fill(g, 13, 14, 5, "C", 8);
    fill(g, 2, 3, 8, "C");
    fill(g, 12, 13, 8, "C");
    fill(g, 0, 2, 3, "W", 4);
    fill(g, 13, 15, 3, "W", 4);
  }

  // legs + shoes
  fill(g, 4, 7, 14, "U", 13 + legs);
  fill(g, 8, 11, 14, "U", 13 + legs);
  fill(g, 3, 7, 14 + legs, "B", 15 + legs);
  fill(g, 8, 12, 14 + legs, "B", 15 + legs);
  return toRows(g);
}

// ───────── The princess ─────────
function princess(armsUp: boolean): string[] {
  const g = blank(20);

  // crown
  put(g, 6, 0, "Y");
  put(g, 8, 0, "Y");
  put(g, 10, 0, "Y");
  fill(g, 6, 10, 1, "Y");
  put(g, 8, 1, "J");

  // hair + face
  fill(g, 4, 11, 2, "L");
  fill(g, 3, 12, 3, "L", 8);
  fill(g, 5, 10, 3, "S", 6);
  fill(g, 6, 9, 7, "S");
  put(g, 6, 4, "E");
  put(g, 9, 4, "E");
  fill(g, 7, 8, 6, "p");
  put(g, 5, 5, "p");
  put(g, 10, 5, "p");
  put(g, 4, 5, "J");
  put(g, 11, 5, "J");
  fill(g, 3, 3, 6, "l", 8);
  fill(g, 12, 12, 6, "l", 8);
  fill(g, 7, 8, 8, "S"); // neck

  // dress
  fill(g, 5, 10, 8, "P", 9);
  fill(g, 5, 10, 10, "p");
  fill(g, 4, 11, 11, "P", 12);
  fill(g, 3, 12, 13, "P", 14);
  fill(g, 2, 13, 15, "P", 16);
  fill(g, 1, 14, 17, "P");
  fill(g, 1, 14, 18, "p");
  fill(g, 5, 6, 19, "W");
  fill(g, 9, 10, 19, "W");
  put(g, 8, 11, "J"); // brooch
  put(g, 7, 11, "J");

  if (!armsUp) {
    fill(g, 3, 4, 9, "S", 10);
    fill(g, 11, 12, 9, "S", 10);
    fill(g, 3, 4, 11, "W", 12);
    fill(g, 11, 12, 11, "W", 12);
  } else {
    fill(g, 1, 2, 5, "S", 9);
    fill(g, 13, 14, 5, "S", 9);
    fill(g, 0, 2, 3, "W", 4);
    fill(g, 13, 15, 3, "W", 4);
  }
  return toRows(g);
}

export type Palette = Record<string, string>;

const COMMON: Palette = {
  S: "#FFC79A",
  s: "#E39A6B",
  B: "#6B3A16",
  W: "#FFFFFF",
  E: "#141414",
  Y: "#FFD23F",
  U: "#2C5FD9",
  u: "#1B3C96",
  J: "#3AA0FF",
};

export const CHARACTERS = {
  mario: {
    label: "Mario",
    frames: [plumber(false, false), plumber(true, false)],
    palette: { ...COMMON, C: "#E52521", c: "#A31510" } as Palette,
  },
  luigi: {
    label: "Luigi",
    frames: [plumber(false, true), plumber(true, true)],
    palette: { ...COMMON, C: "#3DB043", c: "#1F7A26" } as Palette,
  },
  peach: {
    label: "Princess Peach",
    frames: [princess(false), princess(true)],
    palette: { ...COMMON, P: "#FF8FC7", p: "#E0559E", L: "#FFD15C", l: "#D9A02B" } as Palette,
  },
};
export type CharacterKey = keyof typeof CHARACTERS;

export function PixelSprite({
  rows,
  palette,
  className,
}: {
  rows: string[];
  palette: Palette;
  className?: string;
}) {
  const h = rows.length;
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === "." || !palette[ch]) {
        x++;
        continue;
      }
      let end = x;
      while (end + 1 < row.length && row[end + 1] === ch) end++;
      rects.push(<rect key={`${y}-${x}`} x={x} y={y} width={end - x + 1} height={1} fill={palette[ch]} />);
      x = end + 1;
    }
  });
  return (
    <svg viewBox={`0 0 ${W} ${h}`} shapeRendering="crispEdges" className={className} aria-hidden="true">
      {rects}
    </svg>
  );
}
