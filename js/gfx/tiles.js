// Bodenkacheln: werden pro Karte einmal Pixel für Pixel vorgerendert.
import { TILE, hash2, vnoise, makeCanvas } from '../util.js';

export const G = {
  GRASS: 0, FLOWERS: 1, PATH: 2, COBBLE: 3, WATER: 4, SAND: 5,
  BRIDGE: 6, FLOOR: 7, WALL: 8, DARK: 9, VOID: 10,
};

export const GROUND_CHARS = {
  '.': G.GRASS, ',': G.FLOWERS, ':': G.PATH, '=': G.COBBLE, '~': G.WATER,
  '_': G.SAND, '#': G.BRIDGE, f: G.FLOOR, w: G.WALL, d: G.DARK, x: G.VOID,
};

// 0 = begehbar, 1 = fest, 2 = Wasser (nur für Fliegende passierbar)
export function groundSolidity(t) {
  if (t === G.WATER) return 2;
  if (t === G.WALL || t === G.VOID) return 1;
  return 0;
}

const isGrassy = (t) => t === G.GRASS || t === G.FLOWERS;
const isSoft = (t) => t === G.PATH || t === G.SAND || t === G.COBBLE;
const isLand = (t) => t !== G.WATER && t !== G.BRIDGE && t !== -1;

const GRASS = [
  [54, 124, 42], [70, 146, 48], [86, 166, 58], [106, 186, 70], [132, 204, 88],
];
const PATH = [[150, 108, 64], [178, 134, 82], [198, 156, 98], [218, 182, 124]];
const SAND = [[206, 178, 118], [228, 204, 142], [242, 222, 168]];

function grassAt(X, Y) {
  const n = vnoise(X, Y, 26, 1) + (hash2(X, Y, 9) - 0.5) * 0.07;
  let i = n < 0.3 ? 1 : n < 0.68 ? 2 : 3;
  const h = hash2(X, Y, 3);
  if (h < 0.09) i -= 1;
  else if (h > 0.965) i += 1;
  return GRASS[Math.max(0, Math.min(4, i))];
}

function pathAt(X, Y) {
  const n = vnoise(X, Y, 12, 4);
  let i = n < 0.35 ? 1 : 2;
  const h = hash2(X, Y, 5);
  if (h < 0.12) i -= 1;
  else if (h > 0.93) i += 1;
  return PATH[Math.max(0, Math.min(3, i))];
}

function sandAt(X, Y) {
  const h = hash2(X, Y, 6);
  return SAND[h < 0.1 ? 0 : h > 0.92 ? 2 : 1];
}

function cobbleAt(X, Y) {
  const row = Math.floor(Y / 7);
  const ox = (row % 2) * 4;
  const sx = (X + ox) % 9, sy = Y % 7;
  const id = Math.floor((X + ox) / 9);
  if (sx === 0 || sy === 0) return [118, 108, 100];
  const v = hash2(id, row, 11);
  const base = v < 0.33 ? [178, 170, 156] : v < 0.66 ? [192, 184, 168] : [168, 162, 152];
  if (sx === 1 || sy === 1) return [base[0] + 22, base[1] + 22, base[2] + 22];
  if (sx === 8 || sy === 6) return [base[0] - 26, base[1] - 26, base[2] - 24];
  return base;
}

// Abstand eines Pixels zur nächsten Kante, an der ein Nachbar die Bedingung erfüllt.
function edgeDist(get, tx, ty, lx, ly, cond) {
  let d = 99;
  const u = cond(get(tx, ty - 1)), dn = cond(get(tx, ty + 1));
  const l = cond(get(tx - 1, ty)), r = cond(get(tx + 1, ty));
  if (u) d = Math.min(d, ly);
  if (dn) d = Math.min(d, 15 - ly);
  if (l) d = Math.min(d, lx);
  if (r) d = Math.min(d, 15 - lx);
  if (!u && !l && cond(get(tx - 1, ty - 1))) d = Math.min(d, Math.hypot(lx + 0.5, ly + 0.5) - 0.5);
  if (!u && !r && cond(get(tx + 1, ty - 1))) d = Math.min(d, Math.hypot(15.5 - lx, ly + 0.5) - 0.5);
  if (!dn && !l && cond(get(tx - 1, ty + 1))) d = Math.min(d, Math.hypot(lx + 0.5, 15.5 - ly) - 0.5);
  if (!dn && !r && cond(get(tx + 1, ty + 1))) d = Math.min(d, Math.hypot(15.5 - lx, 15.5 - ly) - 0.5);
  return d;
}

function waterAt(get, tx, ty, lx, ly, X, Y, frame) {
  let c = [56, 118, 214];
  if (vnoise(X, Y, 20, 8) < 0.4) c = [48, 106, 200];
  // Wellen
  const wy = Y % 6;
  const wx = (X + frame * 3 + Math.floor(Y / 6) * 7) % 26;
  if (wy === 0 && wx < 5) c = [104, 164, 240];
  else if (wy === 1 && wx > 0 && wx < 4) c = [80, 142, 228];
  if (hash2(X, Y, 20 + frame) > 0.996) c = [230, 246, 255];
  const d = edgeDist(get, tx, ty, lx, ly, isLand);
  const th = 1 + vnoise(X, Y, 3, 30 + frame) * 1.4;
  if (d < th) c = [214, 238, 255];
  else if (d < th + 1.5) c = [120, 178, 244];
  if (isLand(get(tx, ty - 1)) && ly < 4) c = [c[0] * 0.72, c[1] * 0.75, c[2] * 0.85];
  return c;
}

function bridgeAt(get, tx, ty, lx, ly) {
  const water = (t) => t === G.WATER;
  const vertical = water(get(tx - 1, ty)) || water(get(tx + 1, ty));
  const a = vertical ? ly : lx; // Laufrichtung
  const b = vertical ? lx : ly; // Querrichtung
  const sideA = vertical ? water(get(tx - 1, ty)) : water(get(tx, ty - 1));
  const sideB = vertical ? water(get(tx + 1, ty)) : water(get(tx, ty + 1));
  if ((sideA && b < 2) || (sideB && b > 13)) return b === 0 || b === 15 ? [86, 54, 30] : [128, 84, 44];
  if (a % 4 === 3) return [100, 64, 34];
  const grain = hash2(tx * 16 + lx, ty * 16 + ly, 40);
  if (grain < 0.15) return [150, 100, 54];
  if ((b === 3 || b === 12) && a % 4 === 1) return [70, 50, 40];
  return [182, 126, 70];
}

function floorAt(get, tx, ty, lx, ly, X, Y) {
  if (lx === 0 || ly === 0) return [78, 74, 96];
  let c = [128, 124, 146];
  if (lx === 1 || ly === 1) c = [152, 148, 170];
  if (lx === 15 || ly === 15) c = [108, 104, 126];
  const h = hash2(X, Y, 50);
  if (h < 0.08) c = [114, 110, 132];
  else if (h > 0.96) c = [146, 142, 164];
  // Risse
  const th = hash2(tx, ty, 51);
  if (th > 0.72) {
    const cx = 4 + Math.floor(hash2(tx, ty, 52) * 8);
    if (Math.abs(lx - cx - Math.round(Math.sin(ly * 0.9) * 1.5)) < 1 && ly > 3 && ly < 13) c = [86, 82, 102];
  }
  // Moos
  if (vnoise(X, Y, 10, 53) > 0.74 && hash2(X, Y, 54) > 0.3) c = [88, 136, 70];
  // Schatten unter Wänden
  if (get(tx, ty - 1) === G.WALL && ly < 4) c = [c[0] * 0.7, c[1] * 0.7, c[2] * 0.75];
  return c;
}

function wallAt(get, tx, ty, lx, ly, X, Y) {
  const wall = (t) => t === G.WALL || t === -1;
  if (wall(get(tx, ty + 1))) {
    // Oberseite der Mauer
    let c = vnoise(X, Y, 6, 60) > 0.55 ? [74, 70, 94] : [66, 62, 86];
    if (hash2(X, Y, 61) > 0.95) c = [88, 84, 108];
    if ((!wall(get(tx - 1, ty)) && lx === 0) || (!wall(get(tx + 1, ty)) && lx === 15) || (!wall(get(tx, ty - 1)) && ly === 0)) {
      c = [132, 128, 152];
    }
    return c;
  }
  // Mauerfront mit Ziegeln
  if (ly === 0) return [150, 146, 170];
  if (ly === 15) return [50, 46, 64];
  const row = Math.floor((ly - 1) / 5);
  const by = (ly - 1) % 5;
  const ox = (row % 2) * 5;
  const bx = (X + ox) % 10;
  if (by === 4 || bx === 0) return [58, 54, 74];
  const v = hash2(Math.floor((X + ox) / 10), ty * 3 + row, 62);
  const base = v < 0.5 ? [116, 110, 136] : [104, 100, 126];
  if (by === 0) return [base[0] + 18, base[1] + 18, base[2] + 18];
  return base;
}

function groundPixel(get, tx, ty, lx, ly, frame) {
  const t = get(tx, ty);
  const X = tx * TILE + lx, Y = ty * TILE + ly;
  let c;
  switch (t) {
    case G.GRASS:
    case G.FLOWERS:
      c = grassAt(X, Y);
      break;
    case G.PATH:
      c = pathAt(X, Y);
      break;
    case G.SAND:
      c = sandAt(X, Y);
      break;
    case G.COBBLE:
      c = cobbleAt(X, Y);
      break;
    case G.WATER:
      return waterAt(get, tx, ty, lx, ly, X, Y, frame);
    case G.BRIDGE:
      return bridgeAt(get, tx, ty, lx, ly);
    case G.FLOOR:
      return floorAt(get, tx, ty, lx, ly, X, Y);
    case G.WALL:
      return wallAt(get, tx, ty, lx, ly, X, Y);
    case G.DARK: {
      const h = hash2(X, Y, 70);
      c = h < 0.1 ? [46, 42, 58] : h > 0.95 ? [72, 68, 88] : [56, 52, 70];
      if (get(tx, ty - 1) === G.WALL && ly < 4) c = [40, 36, 52];
      return c;
    }
    default:
      return [14, 10, 22];
  }
  // Gras wächst unregelmäßig über Weg-, Sand- und Pflasterkanten
  if (isSoft(t)) {
    const d = edgeDist(get, tx, ty, lx, ly, isGrassy);
    if (d < 99) {
      const th = 1.2 + vnoise(X, Y, 3, 12) * 2.6;
      if (d < th) c = grassAt(X, Y);
      else if (d < th + 1) c = t === G.COBBLE ? [120, 112, 100] : t === G.SAND ? SAND[0] : PATH[0];
    }
  }
  // Uferböschung, wenn unten Wasser ist
  if (get(tx, ty + 1) === G.WATER) {
    if (ly === 12) c = isGrassy(t) ? GRASS[0] : [c[0] * 0.8, c[1] * 0.8, c[2] * 0.8];
    else if (ly === 13) c = [138, 98, 60];
    else if (ly >= 14) c = [104, 70, 42];
  }
  return c;
}

function drawDetails(g, get, w, h) {
  const FLOWER_COLORS = [
    ['#ffffff', '#f8d040'], ['#f8e048', '#f08020'], ['#f890c0', '#ffffff'],
    ['#90b8ff', '#ffffff'], ['#ff6060', '#f8e048'],
  ];
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const t = get(tx, ty);
      const x0 = tx * TILE, y0 = ty * TILE;
      const below = get(tx, ty + 1);
      const maxY = below === G.WATER ? 10 : 14;
      if (t === G.GRASS && hash2(tx, ty, 7) < 0.45) {
        const x = x0 + 2 + Math.floor(hash2(tx, ty, 8) * 9);
        const y = y0 + 4 + Math.floor(hash2(tx, ty, 9) * (maxY - 4));
        g.fillStyle = 'rgb(50,112,38)';
        g.fillRect(x, y, 1, 2);
        g.fillRect(x + 2, y - 1, 1, 3);
        g.fillRect(x + 4, y, 1, 2);
        g.fillStyle = 'rgb(130,204,90)';
        g.fillRect(x + 2, y - 2, 1, 1);
      }
      if (t === G.FLOWERS) {
        const n = 2 + Math.floor(hash2(tx, ty, 10) * 3);
        const pal = FLOWER_COLORS[Math.floor(hash2(tx, ty, 11) * FLOWER_COLORS.length)];
        for (let i = 0; i < n; i++) {
          const x = x0 + 2 + Math.floor(hash2(tx, ty, 12 + i) * 11);
          const y = y0 + 2 + Math.floor(hash2(tx, ty, 20 + i) * (maxY - 3));
          g.fillStyle = 'rgb(46,104,36)';
          g.fillRect(x, y + 2, 1, 1);
          g.fillStyle = pal[0];
          g.fillRect(x - 1, y, 3, 1);
          g.fillRect(x, y - 1, 1, 3);
          g.fillStyle = pal[1];
          g.fillRect(x, y, 1, 1);
        }
      }
      if (t === G.PATH && hash2(tx, ty, 30) < 0.35) {
        const x = x0 + 4 + Math.floor(hash2(tx, ty, 31) * 8);
        const y = y0 + 4 + Math.floor(hash2(tx, ty, 32) * 8);
        g.fillStyle = 'rgb(226,204,160)';
        g.fillRect(x, y, 2, 1);
        g.fillStyle = 'rgb(140,100,60)';
        g.fillRect(x, y + 1, 2, 1);
      }
    }
  }
}

// Rendert den Boden einer Karte in eine Leinwand (für Wasser mehrere Animationsbilder).
export function renderGround(map, frame = 0) {
  const { w, h, ground } = map;
  const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : ground[y * w + x]);
  const W = w * TILE, H = h * TILE;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const d = img.data;
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      for (let ly = 0; ly < TILE; ly++) {
        for (let lx = 0; lx < TILE; lx++) {
          const col = groundPixel(get, tx, ty, lx, ly, frame);
          const i = ((ty * TILE + ly) * W + tx * TILE + lx) * 4;
          d[i] = col[0];
          d[i + 1] = col[1];
          d[i + 2] = col[2];
          d[i + 3] = 255;
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
  drawDetails(g, get, w, h);
  return c;
}
