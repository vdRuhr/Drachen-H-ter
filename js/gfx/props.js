// Grafiken für Bäume, Häuser, Truhen, Tore usw.
import { bake } from './pixel.js';
import { hash2 } from '../util.js';

export const P = {};

const TREE_PAL = [
  { d: '#2c7430', m: '#3e9638', l: '#62b848', h: '#9ad86a', t: '#7a4a26', td: '#55321a', tl: '#9a6a3a' },
  { d: '#1e5a2e', m: '#2e7a36', l: '#4a9a40', h: '#78c058', t: '#6a4024', td: '#462a16', tl: '#8a5a34' },
];

function drawTree(p, v) {
  const C = TREE_PAL[v];
  p.rect(13, 27, 6, 12, C.t);
  p.rect(17, 27, 2, 12, C.td);
  p.rect(13, 27, 1, 12, C.tl);
  p.poly([10, 39, 13, 33, 15, 39], C.t);
  p.poly([22, 39, 19, 33, 17, 39], C.td);
  const blobs = [
    [16, 13, 13, 11], [7, 19, 7, 7], [25, 19, 7, 7], [16, 22, 11, 7], [9, 8, 7, 6], [23, 8, 7, 6], [16, 4, 7, 4],
  ];
  for (const [x, y, rx, ry] of blobs) p.ell(x, y, rx, ry, C.d);
  for (const [x, y, rx, ry] of blobs) p.ell(x - 1.2, y - 1.6, rx * 0.8, ry * 0.74, C.m);
  for (const [x, y, rx, ry] of blobs.slice(0, 5)) p.ell(x - 2.5, y - 3, rx * 0.42, ry * 0.38, C.l);
  for (let i = 0; i < 9; i++) {
    const x = 5 + Math.floor(hash2(i, v, 3) * 20), y = 3 + Math.floor(hash2(i, v, 4) * 18);
    p.px(x, y, C.h);
  }
  // Blattkanten-Schatten
  p.ell(16, 26, 9, 2, C.d);
}

function drawPine(p) {
  const d = '#1a5a3a', m = '#2a7a48', l = '#48a060';
  p.rect(10, 31, 4, 8, '#5a3820');
  p.rect(12, 31, 2, 8, '#3a2412');
  const layers = [[12, 0, 5, 12], [12, 6, 8, 19], [12, 13, 10, 27], [12, 20, 12, 34]];
  for (const [cx, top, hw, bottom] of layers) {
    p.poly([cx, top, cx + hw, bottom, cx - hw, bottom], d);
    p.poly([cx - 1, top + 2, cx + hw - 4, bottom - 2, cx - hw + 1, bottom - 2], m);
    p.poly([cx - 2, top + 4, cx - 1, bottom - 4, cx - hw + 3, bottom - 3], l);
  }
}

function drawBush(p, berries) {
  p.ell(4.5, 9, 4.5, 4.5, '#2c7430');
  p.ell(11.5, 9, 4.5, 4.5, '#2c7430');
  p.ell(8, 6, 5.5, 5, '#2c7430');
  p.ell(4, 8, 3, 3, '#46a03c');
  p.ell(10.5, 7.5, 3.4, 3, '#46a03c');
  p.ell(7, 5, 3, 2.4, '#66bc50');
  p.px(5, 6, '#9ad86a');
  p.px(11, 5, '#9ad86a');
  if (berries) {
    for (const [x, y] of [[4, 10], [11, 11], [8, 8], [12, 7]]) {
      p.rect(x, y, 2, 2, '#e83850');
      p.px(x, y, '#ffa0b0');
    }
  }
}

function drawRock(p) {
  p.poly([1, 12, 0, 7, 3, 2, 8, 0, 13, 2, 15, 7, 14, 12], '#8e8ca0');
  p.poly([3, 5, 6, 2, 10, 1.5, 8, 4.5], '#bcbacc');
  p.poly([1, 12, 14, 12, 14.5, 9, 1, 9], '#66647a');
  p.px(10, 6, '#66647a');
  p.px(11, 7, '#66647a');
}

function drawSign(p) {
  p.rect(7, 9, 2, 7, '#6a4024');
  p.rect(1, 1, 14, 9, '#b8844a');
  p.rect(1, 8, 14, 2, '#8a5a2e');
  p.rect(1, 1, 14, 1, '#d8a868');
  for (const y of [3, 5]) p.rect(3, y, 10, 1, '#6a4024');
}

function drawChest(p, open) {
  const wood = '#b06a30', woodD = '#7a4420', band = '#f0c040', bandD = '#b88a20';
  p.rect(1, 6, 14, 8, wood);
  p.rect(1, 12, 14, 2, woodD);
  if (open) {
    p.rect(1, 0, 14, 5, woodD);
    p.rect(2, 1, 12, 3, '#4a2810');
    p.rect(2, 5, 12, 2, '#2a1408');
    p.rect(4, 5, 3, 1, '#f8e080');
  } else {
    p.ell(8, 5, 7, 3.5, wood);
    p.rect(1, 5, 14, 2, wood);
    p.rect(1, 3, 14, 1, '#c8844a');
  }
  p.rect(3, open ? 6 : 2, 2, open ? 8 : 12, band);
  p.rect(11, open ? 6 : 2, 2, open ? 8 : 12, band);
  p.rect(4, open ? 6 : 2, 1, open ? 8 : 12, bandD);
  p.rect(12, open ? 6 : 2, 1, open ? 8 : 12, bandD);
  if (!open) {
    p.rect(7, 6, 2, 3, band);
    p.px(7, 8, '#4a2810');
  }
}

function drawStatue(p) {
  const s = '#9a98ae', sd = '#6c6a84', sl = '#c8c6da';
  p.rect(1, 22, 14, 8, sd);
  p.rect(1, 22, 14, 2, sl);
  p.rect(2, 20, 12, 2, s);
  // kleine Drachenfigur
  p.ell(8, 15, 5, 5, s);
  p.ell(6, 15, 2.5, 4, sl);
  p.ell(10, 7, 3.5, 3.5, s);
  p.poly([8, 4, 7, 0, 9.5, 3.5], sl);
  p.poly([12, 4, 13, 0, 11, 3.5], sl);
  p.poly([3, 14, 0, 6, 5, 11], sd);
  p.poly([13, 14, 16, 6, 11, 11], sd);
  p.rect(9, 6, 1, 1, '#3a3850');
  p.rect(12, 7, 2, 1, sd);
  p.ell(8, 17, 2, 2, '#58c8f8');
  p.px(7, 16, '#ffffff');
}

function drawPillar(p, broken) {
  const s = '#a8a6bc', sd = '#787690', sl = '#cac8dc';
  const top = broken ? 14 : 0;
  if (!broken) {
    p.rect(0, 0, 16, 4, s);
    p.rect(0, 0, 16, 1, sl);
    p.rect(0, 3, 16, 1, sd);
  } else {
    p.poly([2, 16, 4, 12, 7, 15, 10, 11, 14, 14, 14, 18, 2, 18], s);
  }
  p.rect(2, top + 4, 12, 26 - top, s);
  p.rect(3, top + 4, 2, 26 - top, sl);
  p.rect(10, top + 4, 1, 26 - top, sd);
  p.rect(12, top + 4, 2, 26 - top, sd);
  p.rect(0, 29, 16, 5, s);
  p.rect(0, 29, 16, 1, sl);
  p.rect(0, 33, 16, 1, sd);
  if (!broken) p.ell(5, 14, 2, 3, '#5a9a48');
}

function drawTorchStand(p) {
  p.rect(6, 6, 4, 12, '#5a4a40');
  p.rect(7, 6, 1, 12, '#7a6a5a');
  p.rect(3, 3, 10, 4, '#7a6a5a');
  p.rect(3, 6, 10, 1, '#4a3a30');
  p.rect(4, 17, 8, 2, '#4a3a30');
}

function drawGate(p) {
  const s = '#8a88a4', sd = '#5c5a78', sl = '#b6b4cc';
  for (const x of [0, 32]) {
    p.rect(x + 1, 8, 14, 36, s);
    p.rect(x + 2, 8, 3, 36, sl);
    p.rect(x + 12, 8, 3, 36, sd);
    p.rect(x, 40, 16, 4, sd);
    p.rect(x, 4, 16, 5, s);
    p.rect(x, 4, 16, 1, sl);
    // Runen
    for (let i = 0; i < 3; i++) {
      p.rect(x + 7, 14 + i * 9, 2, 5, '#c070ff');
      p.rect(x + 6, 15 + i * 9, 4, 1, '#c070ff');
    }
  }
  // Bogen
  p.rect(0, 0, 48, 6, s);
  p.rect(0, 0, 48, 1, sl);
  p.rect(0, 5, 48, 1, sd);
  p.poly([14, 6, 34, 6, 30, 10, 18, 10], s);
  p.ell(24, 3, 4, 3, '#c070ff');
  p.ell(24, 3, 2, 1.5, '#f0d8ff');
}

const HOUSE_STYLES = {
  red: { roof: '#c84a32', roofD: '#8c2c20', roofL: '#ec7050' },
  blue: { roof: '#3c64c0', roofD: '#24408a', roofL: '#6a92e8' },
  green: { roof: '#3c9a50', roofD: '#24683a', roofL: '#6ac078' },
};

function drawHouse(p, tw, th, styleName) {
  const st = HOUSE_STYLES[styleName] || HOUSE_STYLES.red;
  const W = tw * 16 + 4, H = th * 16 + 4;
  const wallTop = Math.round(H * 0.5);
  const wl = 2, wr = W - 2; // Wandkanten
  // Wand
  p.rect(wl, wallTop, wr - wl, H - wallTop, '#f2e2c0');
  p.rect(wl, H - 3, wr - wl, 3, '#c8b088');
  p.rect(wl, wallTop, 2, H - wallTop, '#7a4a22');
  p.rect(wr - 2, wallTop, 2, H - wallTop, '#7a4a22');
  p.rect(wl, wallTop + 4, wr - wl, 2, '#7a4a22');
  // Tür
  const dx = Math.round(W / 2 - 6);
  p.rect(dx - 1, H - 17, 14, 17, '#5a3218');
  p.rect(dx, H - 16, 12, 16, '#9a5a2c');
  p.ell(dx + 6, H - 16, 6, 3, '#9a5a2c');
  p.rect(dx + 5, H - 15, 1, 15, '#7a4220');
  p.rect(dx + 9, H - 8, 1, 2, '#f0c040');
  p.rect(dx - 2, H - 1, 16, 1, '#a89878');
  // Fenster
  const winY = wallTop + 9;
  const wins = tw >= 5 ? [8, W - 20] : [6, W - 18];
  for (const wx of wins) {
    p.rect(wx - 1, winY - 1, 14, 11, '#7a4a22');
    p.rect(wx, winY, 12, 9, '#7ac0f0');
    p.rect(wx, winY, 12, 3, '#b8e4ff');
    p.rect(wx + 5, winY, 2, 9, '#7a4a22');
    p.rect(wx, winY + 4, 12, 1, '#7a4a22');
    p.rect(wx - 1, winY + 10, 14, 3, '#8a5a30');
    for (let i = 0; i < 4; i++) p.rect(wx + i * 3, winY + 9, 2, 2, i % 2 ? '#f86080' : '#f8e050');
  }
  // Dach
  p.poly([0, wallTop + 2, 8, 2, W - 8, 2, W, wallTop + 2], st.roof);
  for (let y = 6; y < wallTop; y += 4) {
    const inset = 8 - (y / wallTop) * 8;
    p.rect(Math.round(inset), y, Math.round(W - inset * 2), 1, st.roofD);
  }
  p.rect(8, 2, W - 16, 2, st.roofL);
  p.rect(0, wallTop, W, 3, st.roofD);
  // Schornstein
  p.rect(W - 22, 0, 7, 9, '#9a5a3c');
  p.rect(W - 23, 0, 9, 2, '#6a3a26');
}

function drawTower(p) {
  const W = 52, H = 84;
  const wallTop = 34;
  p.rect(4, wallTop, W - 8, H - wallTop, '#b8b4c8');
  for (let y = wallTop + 4; y < H - 2; y += 6) {
    const off = (y / 6) % 2 ? 0 : 5;
    for (let x = 4 + off; x < W - 4; x += 10) p.rect(x, y, 1, 6, '#8a86a0');
    p.rect(4, y, W - 8, 1, '#8a86a0');
  }
  p.rect(4, wallTop, 5, H - wallTop, '#d8d4e6');
  p.rect(W - 10, wallTop, 6, H - wallTop, '#8a86a0');
  // Tür
  const dx = W / 2 - 7;
  p.rect(dx, H - 18, 14, 18, '#3a4a8a');
  p.ell(dx + 7, H - 18, 7, 4, '#3a4a8a');
  p.rect(dx + 2, H - 17, 10, 17, '#5a6ab0');
  p.ell(dx + 7, H - 17, 5, 3, '#5a6ab0');
  p.rect(dx + 10, H - 9, 1, 2, '#f0c040');
  // Rundfenster
  p.ell(W / 2, wallTop + 14, 6, 6, '#5a4a30');
  p.ell(W / 2, wallTop + 14, 4.5, 4.5, '#f8e080');
  p.rect(W / 2 - 0.5, wallTop + 9, 1, 10, '#5a4a30');
  p.rect(W / 2 - 5, wallTop + 13.5, 10, 1, '#5a4a30');
  // Spitzdach
  p.poly([0, wallTop + 3, W / 2, 0, W, wallTop + 3], '#3c58b8');
  p.poly([W / 2, 0, W / 2 - 4, wallTop + 3, 2, wallTop + 3], '#5a7ad8');
  p.rect(0, wallTop + 1, W, 3, '#243c84');
  for (let i = 0; i < 4; i++) {
    const sx = 10 + i * 9, sy = 18 + (i % 2) * 6;
    p.rect(sx, sy, 2, 2, '#f8e070');
  }
  p.rect(W / 2 - 1, 0, 2, 2, '#f8e070');
}

function drawStall(p) {
  const W = 48;
  p.rect(2, 14, 3, 18, '#7a4a22');
  p.rect(W - 5, 14, 3, 18, '#7a4a22');
  // Markise
  for (let i = 0; i < 6; i++) p.rect(i * 8, 0, 8, 12, i % 2 ? '#f4f0e8' : '#d83838');
  for (let i = 0; i < 6; i++) p.ell(i * 8 + 4, 12, 4, 2.5, i % 2 ? '#f4f0e8' : '#d83838');
  p.rect(0, 0, W, 2, '#a02828');
  // Theke
  p.rect(0, 20, W, 12, '#b8844a');
  p.rect(0, 20, W, 2, '#d8a868');
  p.rect(0, 30, W, 2, '#8a5a2e');
  for (let x = 6; x < W; x += 12) p.rect(x, 22, 1, 8, '#8a5a2e');
  // Waren
  const goods = ['#e83838', '#f8d040', '#f09030', '#60c040', '#e83838'];
  goods.forEach((col, i) => {
    p.ell(6 + i * 9, 18, 3, 2.6, col);
    p.px(5 + i * 9, 17, '#ffffff');
  });
}

function drawWell(p) {
  p.rect(3, 4, 2, 14, '#6a4024');
  p.rect(23, 4, 2, 14, '#6a4024');
  p.poly([0, 6, 14, 0, 28, 6], '#c84a32');
  p.rect(0, 5, 28, 2, '#8c2c20');
  p.rect(12, 7, 4, 1, '#6a4024');
  p.rect(13, 8, 1, 6, '#a0a0a0');
  p.ell(14, 20, 12, 6, '#8e8ca0');
  p.ell(14, 19, 9, 4, '#3a68b8');
  p.ell(14, 18.5, 6, 2, '#5a90e0');
  p.rect(2, 20, 24, 4, '#8e8ca0');
  p.rect(2, 23, 24, 1, '#66647a');
}

function drawFence(p, mask) {
  // mask: 1 = links, 2 = rechts, 4 = oben, 8 = unten
  const wood = '#c08a50', woodD = '#7a5030', woodL = '#e0b07a', ol = '#3a2418';
  const rail = (x, y, w, h) => {
    p.rect(x, y - 1, w, h + 2, ol);
    p.rect(x, y, w, h, wood);
    p.rect(x, y, w, 1, woodL);
  };
  if (mask & 1) { rail(0, 6, 7, 2); rail(0, 11, 7, 2); }
  if (mask & 2) { rail(9, 6, 7, 2); rail(9, 11, 7, 2); }
  if (mask & 4) { p.rect(6, 0, 4, 4, ol); p.rect(7, 0, 2, 4, wood); }
  if (mask & 8) { p.rect(6, 13, 4, 3, ol); p.rect(7, 13, 2, 3, wood); }
  p.rect(5, 2, 6, 13, ol);
  p.rect(6, 3, 4, 11, wood);
  p.rect(6, 3, 4, 1, woodL);
  p.rect(9, 4, 1, 10, woodD);
}

export function buildProps() {
  P.tree = [bake(32, 40, (p) => drawTree(p, 0)), bake(32, 40, (p) => drawTree(p, 1))];
  P.pine = bake(24, 40, drawPine);
  P.bush = [bake(16, 14, (p) => drawBush(p, false)), bake(16, 14, (p) => drawBush(p, true))];
  P.rock = bake(16, 13, drawRock);
  P.sign = bake(16, 16, drawSign);
  P.chest = bake(16, 14, (p) => drawChest(p, false));
  P.chestOpen = bake(16, 14, (p) => drawChest(p, true));
  P.statue = bake(16, 30, drawStatue);
  P.pillar = bake(16, 34, (p) => drawPillar(p, false));
  P.pillarBroken = bake(16, 34, (p) => drawPillar(p, true));
  P.torch = bake(16, 19, drawTorchStand);
  P.gate = bake(48, 44, drawGate);
  P.tower = bake(52, 84, drawTower);
  P.stall = bake(48, 32, drawStall);
  P.well = bake(28, 24, drawWell);
  P.house = {};
  P.fence = [];
  for (let m = 0; m < 16; m++) P.fence[m] = bake(16, 16, (p) => drawFence(p, m), { outlined: false });
  return P;
}

export function houseSprite(tw, th, style) {
  const key = `${tw}x${th}:${style}`;
  if (!P.house[key]) P.house[key] = bake(tw * 16 + 4, th * 16 + 4, (p) => drawHouse(p, tw, th, style));
  return P.house[key];
}
