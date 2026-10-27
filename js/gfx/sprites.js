// Alle Figuren-Grafiken werden beim Start im Code gezeichnet (keine Bilddateien nötig).
import { bake, flipH, silhouette } from './pixel.js';

export const S = {};

const EYE = '#201428';
const BLUSH = '#f49a9a';

// ---------------------------------------------------------------------------
// Chibi-Menschen (16x22 + Kontur). Kopf groß, Körper klein – wie im SNES-Stil.
// dir: 'down' | 'up' | 'left'; step: 0 = stehen, 1/2 = Schritt
function drawChibi(p, o, dir, step) {
  const c = o.colors;
  const Y = 2; // Platz für Dutt / Mütze
  const side = dir === 'left';

  // Beine
  const leg = (x, up) => {
    p.rect(x, Y + 16 - up, 2, 2, c.pants);
    p.rect(x, Y + 18 - up, 2, 2, c.boots);
  };
  if (o.dress) {
    if (side) {
      p.rect(step === 1 ? 5 : 6, Y + 19, 2, 1, c.boots);
      p.rect(step === 2 ? 9 : 8, Y + 19, 2, 1, c.boots);
    } else {
      p.rect(5, Y + 19 - (step === 1 ? 1 : 0), 2, 1, c.boots);
      p.rect(9, Y + 19 - (step === 2 ? 1 : 0), 2, 1, c.boots);
    }
  } else if (side) {
    if (step === 0) { leg(6, 0); leg(8, 0); }
    else if (step === 1) { leg(9, 1); leg(5, 0); }
    else { leg(5, 1); leg(9, 0); }
  } else {
    leg(5, step === 1 ? 1 : 0);
    leg(9, step === 2 ? 1 : 0);
  }

  // Körper
  if (side) {
    if (o.dress) {
      p.rect(5, Y + 10, 6, 5, c.shirt);
      p.rect(4, Y + 14, 8, 5, c.shirt);
      p.rect(10, Y + 10, 1, 9, c.shirtD);
      p.rect(4, Y + 18, 8, 1, c.shirtD);
    } else {
      p.rect(5, Y + 10, 6, 5, c.shirt);
      p.rect(10, Y + 10, 1, 5, c.shirtD);
      p.rect(5, Y + 14, 6, 1, c.belt);
      p.rect(5, Y + 15, 6, 1, c.shirtD);
    }
    if (o.apron) p.rect(4, Y + 11, 2, 6, o.apron);
    // Arm schwingt vor und zurück
    const ax = 7 + (step === 1 ? -1 : step === 2 ? 1 : 0);
    p.rect(ax, Y + 10, 2, 3, c.shirtD);
    p.rect(ax, Y + 13, 2, 1, c.skin);
  } else {
    if (o.dress) {
      p.rect(4, Y + 10, 8, 5, c.shirt);
      p.rect(3, Y + 14, 10, 5, c.shirt);
      p.rect(3, Y + 18, 10, 1, c.shirtD);
      p.rect(4, Y + 10, 1, 4, c.shirtD);
      p.rect(11, Y + 10, 1, 4, c.shirtD);
    } else {
      p.rect(4, Y + 10, 8, 5, c.shirt);
      p.rect(4, Y + 10, 1, 5, c.shirtD);
      p.rect(11, Y + 10, 1, 5, c.shirtD);
      p.rect(4, Y + 14, 8, 1, c.belt);
      if (dir === 'down' && c.buckle) p.rect(7, Y + 14, 2, 1, c.buckle);
      p.rect(4, Y + 15, 8, 1, c.shirtD);
    }
    if (o.apron && dir === 'down') {
      p.rect(5, Y + 11, 6, 6, o.apron);
      p.rect(5, Y + 16, 6, 1, '#c8c0b0');
    }
    // Arme
    const la = step === 1 ? 1 : 0, ra = step === 2 ? 1 : 0;
    p.rect(3, Y + 10 + la, 1, 3, c.shirtD);
    p.rect(3, Y + 13 + la, 1, 1, c.skin);
    p.rect(12, Y + 10 + ra, 1, 3, c.shirtD);
    p.rect(12, Y + 13 + ra, 1, 1, c.skin);
  }

  // Kopf
  if (dir === 'down') {
    p.rect(3, Y + 3, 10, 6, c.skin);
    p.rect(4, Y + 9, 8, 1, c.skin);
    p.rect(4, Y + 9, 8, 1, c.skinS);
    // Haare
    p.rect(4, Y + 0, 8, 1, c.hair);
    p.rect(3, Y + 1, 10, 1, c.hair);
    p.rect(2, Y + 2, 12, 2, c.hair);
    p.rect(3, Y + 4, 10, 1, c.hair);
    p.px(5, Y + 4, c.skin);
    p.px(10, Y + 4, c.skin);
    p.px(8, Y + 4, c.skin);
    p.rect(2, Y + 4, 1, 5, c.hair);
    p.rect(13, Y + 4, 1, 5, c.hair);
    p.rect(2, Y + 6, 1, 3, c.hairD);
    p.rect(13, Y + 6, 1, 3, c.hairD);
    p.rect(3, Y + 3, 10, 1, c.hairD);
    p.rect(5, Y + 1, 2, 1, c.hairL);
    p.px(4, Y + 2, c.hairL);
    // Gesicht
    p.rect(5, Y + 6, 1, 2, c.eye || EYE);
    p.rect(10, Y + 6, 1, 2, c.eye || EYE);
    p.px(4, Y + 8, BLUSH);
    p.px(11, Y + 8, BLUSH);
    p.rect(7, Y + 8, 2, 1, c.skinS);
  } else if (dir === 'up') {
    p.rect(4, Y + 0, 8, 1, c.hair);
    p.rect(3, Y + 1, 10, 1, c.hair);
    p.rect(2, Y + 2, 12, 6, c.hair);
    p.rect(3, Y + 8, 10, 2, c.hair);
    p.rect(3, Y + 8, 10, 2, c.hairD);
    p.rect(2, Y + 6, 1, 2, c.hairD);
    p.rect(13, Y + 6, 1, 2, c.hairD);
    p.rect(5, Y + 1, 3, 1, c.hairL);
    p.rect(4, Y + 2, 2, 1, c.hairL);
    p.rect(6, Y + 10, 4, 1, c.skinS);
  } else {
    // nach links schauend
    p.rect(3, Y + 3, 7, 6, c.skin);
    p.rect(4, Y + 9, 5, 1, c.skinS);
    p.px(2, Y + 6, c.skin);
    p.rect(5, Y + 0, 6, 1, c.hair);
    p.rect(4, Y + 1, 9, 1, c.hair);
    p.rect(3, Y + 2, 11, 2, c.hair);
    p.rect(8, Y + 4, 6, 5, c.hair);
    p.rect(9, Y + 9, 4, 1, c.hairD);
    p.rect(12, Y + 5, 2, 4, c.hairD);
    p.px(3, Y + 4, c.hair);
    p.px(4, Y + 4, c.hair);
    p.px(6, Y + 4, c.hair);
    p.rect(5, Y + 1, 3, 1, c.hairL);
    p.px(8, Y + 6, c.skin);
    p.px(8, Y + 7, c.skinS);
    p.rect(4, Y + 6, 1, 2, c.eye || EYE);
    p.px(5, Y + 8, BLUSH);
  }

  // Zubehör
  if (o.bun) {
    p.ell(8, Y - 0.5, 3, 2.2, c.hair);
    p.rect(7, Y - 2, 2, 1, c.hairL);
  }
  if (o.pigtails && !side) {
    p.ell(1.5, Y + 6, 1.6, 2.2, c.hair);
    p.ell(14.5, Y + 6, 1.6, 2.2, c.hair);
  } else if (o.pigtails) {
    p.ell(13.5, Y + 6, 1.8, 2.4, c.hair);
  }
  if (o.cap) {
    if (dir === 'down') {
      p.rect(4, Y - 1, 8, 1, o.cap);
      p.rect(3, Y + 0, 10, 3, o.cap);
      p.rect(2, Y + 3, 12, 1, o.capD);
      p.rect(5, Y + 0, 2, 1, o.capL || o.cap);
    } else if (dir === 'up') {
      p.rect(4, Y - 1, 8, 1, o.cap);
      p.rect(3, Y + 0, 10, 4, o.cap);
      p.rect(3, Y + 3, 10, 1, o.capD);
    } else {
      p.rect(5, Y - 1, 7, 1, o.cap);
      p.rect(4, Y + 0, 9, 3, o.cap);
      p.rect(1, Y + 3, 8, 1, o.capD);
      p.rect(9, Y + 3, 4, 1, o.cap);
    }
  }
  if (o.helmet) {
    const hc = o.helmet, hd = o.helmetD;
    if (dir === 'down') {
      p.rect(3, Y - 1, 10, 4, hc);
      p.rect(2, Y + 2, 12, 2, hc);
      p.rect(2, Y + 3, 12, 1, hd);
      p.rect(7, Y - 2, 2, 2, '#d04040');
      p.rect(4, Y + 0, 2, 1, '#f0f4f8');
    } else if (dir === 'up') {
      p.rect(3, Y - 1, 10, 5, hc);
      p.rect(2, Y + 2, 12, 3, hc);
      p.rect(2, Y + 4, 12, 1, hd);
      p.rect(7, Y - 2, 2, 2, '#d04040');
    } else {
      p.rect(4, Y - 1, 9, 4, hc);
      p.rect(3, Y + 2, 11, 2, hc);
      p.rect(3, Y + 3, 11, 1, hd);
      p.rect(8, Y - 2, 2, 2, '#d04040');
    }
  }
  if (o.glasses) {
    const f = o.glasses;
    if (dir === 'down') {
      for (const gx of [4, 9]) {
        p.rect(gx, Y + 5, 3, 3, f);
        p.px(gx + 1, Y + 6, c.skin);
      }
      p.rect(5, Y + 6, 1, 1, EYE);
      p.rect(10, Y + 6, 1, 1, EYE);
      p.rect(7, Y + 6, 2, 1, f);
    } else if (side) {
      p.rect(3, Y + 5, 3, 3, f);
      p.px(4, Y + 6, EYE);
      p.rect(6, Y + 6, 2, 1, f);
    }
  }
  if (o.beard) {
    if (dir === 'down') {
      p.rect(4, Y + 8, 8, 3, o.beard);
      p.rect(5, Y + 11, 6, 1, o.beard);
      p.rect(7, Y + 8, 2, 1, c.skinS);
    } else if (side) {
      p.rect(3, Y + 8, 5, 3, o.beard);
      p.rect(4, Y + 11, 3, 1, o.beard);
    }
  }
  if (o.scarf) {
    const s = o.scarf, sd = o.scarfD;
    if (dir === 'down') {
      p.rect(4, Y + 9, 8, 2, s);
      p.rect(4, Y + 10, 8, 1, sd);
      p.rect(9, Y + 11, 2, 2, s);
      p.px(10, Y + 12, sd);
    } else if (dir === 'up') {
      p.rect(4, Y + 9, 8, 2, s);
      p.rect(8, Y + 11, 2, 3 + (step ? 1 : 0), s);
      p.rect(8, Y + 13 + (step ? 1 : 0), 2, 1, sd);
    } else {
      p.rect(4, Y + 9, 6, 2, s);
      p.rect(4, Y + 10, 6, 1, sd);
      p.rect(10, Y + 10, 2 + (step ? 1 : 0), 2, s);
      p.px(11 + (step ? 1 : 0), Y + 11, sd);
    }
  }
}

function chibiSet(o) {
  const out = { down: [], up: [], left: [], right: [] };
  for (const dir of ['down', 'up', 'left']) {
    for (let step = 0; step < 3; step++) {
      out[dir].push(bake(16, 22, (p) => drawChibi(p, o, dir, step)));
    }
  }
  out.right = out.left.map(flipH);
  return out;
}

// ---------------------------------------------------------------------------
// Professor Uhu – eine Eule mit Brille und Doktorhut.
function drawUhu(p, blink) {
  const b = '#9a6a3c', bd = '#6e4626', bl = '#d8b080', belly = '#f0dcb0';
  p.ell(9, 14, 7, 7.5, b);
  p.ell(9, 15.5, 4.5, 5, belly);
  for (let i = 0; i < 3; i++) {
    p.px(7 + i * 2, 14 + (i % 2), bd);
    p.px(8 + i * 2, 17 - (i % 2), bd);
  }
  p.ell(2.5, 14, 2, 4.5, bd); // Flügel
  p.ell(15.5, 14, 2, 4.5, bd);
  p.ell(9, 7.5, 7, 5.5, b); // Kopf
  p.poly([2, 5, 3, 0, 5, 4], b); // Federohren
  p.poly([16, 5, 15, 0, 13, 4], b);
  p.ell(9, 8.5, 5.5, 3.6, bl);
  // Brille + Augen
  for (const ex of [6, 12]) {
    p.ell(ex, 7.5, 2.6, 2.6, '#f0c840');
    p.ell(ex, 7.5, 1.9, 1.9, '#ffffff');
    if (blink) p.rect(ex - 1, 7, 3, 1, EYE);
    else {
      p.rect(ex - 1, 7, 2, 2, EYE);
      p.px(ex - 1, 7, '#ffffff');
    }
  }
  p.rect(8, 7, 2, 1, '#f0c840');
  p.poly([8, 10, 10, 10, 9, 12.5], '#f09030'); // Schnabel
  p.rect(5, 21, 3, 1, '#f09030');
  p.rect(10, 21, 3, 1, '#f09030');
  // Doktorhut
  p.poly([1, 3, 9, 0, 17, 3, 9, 6], '#2a2a3a');
  p.rect(6, 3, 6, 2, '#2a2a3a');
  p.rect(9, 1, 1, 1, '#f0c840');
  p.rect(15, 3, 1, 4, '#f0c840');
}

// ---------------------------------------------------------------------------
// Funki, der kleine Feuerdrache (schaut nach rechts, wird gespiegelt).
function drawFunki(p, wingUp, scale) {
  const g = p.g;
  g.save();
  g.scale(scale, scale);
  const body = '#f08838', bodyD = '#c05820', belly = '#f8e088', wing = '#e05030', wingL = '#f8a060';
  // Schwanz
  p.poly([6, 11, 0.5, 7, 1.5, 12, 6, 14], body);
  p.poly([0, 5.5, 2.5, 7.5, 0.5, 9], '#f8d050');
  // Hinterer Flügel
  if (wingUp) p.poly([8, 8, 6, 0.5, 2, 3, 5, 8], wing);
  else p.poly([8, 9, 3, 13.5, 1.5, 10, 5, 8], wing);
  p.ell(10, 10.5, 5.5, 4.5, body);
  p.ell(10.5, 12, 3.5, 2.8, belly);
  p.ell(15, 6, 4.2, 3.8, body);
  p.ell(18, 7.2, 2.6, 2.1, body);
  p.rect(17, 8, 3, 1, bodyD);
  p.px(19, 6, bodyD);
  // Hörner
  p.poly([12.5, 3.5, 12, 0.5, 14, 3], '#f8f0d0');
  p.poly([15, 3, 16, 0.5, 16.5, 3.5], '#f8f0d0');
  // Auge
  p.rect(15, 5, 2, 2, EYE);
  p.px(15, 5, '#ffffff');
  // Vorderer Flügel
  if (wingUp) {
    p.poly([9, 8, 11, 0, 14, 2, 12, 8], wing);
    p.poly([10.5, 7, 11.5, 2, 13, 3, 11.8, 7], wingL);
  } else {
    p.poly([9, 9, 12, 14, 14.5, 11, 12, 8], wing);
    p.poly([10.5, 9.5, 12.3, 13, 13.5, 11, 12, 9], wingL);
  }
  // Füßchen
  p.rect(8, 14, 2, 2, bodyD);
  p.rect(12, 14, 2, 2, bodyD);
  g.restore();
}

// ---------------------------------------------------------------------------
// Aurelia, die große Drachenmutter.
function drawAurelia(p, awake) {
  const body = '#f0c040', bodyD = '#c08820', bodyL = '#f8e070', belly = '#f8eab0';
  const wing = '#d86a30', wingD = '#a84a20';
  // Schwanz rollt sich um den Körper
  p.ell(46, 37, 24, 6, bodyD);
  p.ell(46, 36, 22, 4.5, body);
  p.poly([68, 35, 74, 30, 72, 38], body);
  p.poly([71, 29, 76, 27, 74, 33], '#e85a30');
  // Körper
  p.ell(44, 25, 22, 13, body);
  p.ell(44, 30, 18, 7, belly);
  p.ell(40, 18, 14, 5, bodyL);
  // Rückenzacken
  for (let i = 0; i < 6; i++) p.poly([30 + i * 6, 13 - (i % 2), 33 + i * 6, 7 + (i === 2 ? -1 : 0), 36 + i * 6, 13], '#e85a30');
  // Gefalteter Flügel
  p.poly([32, 22, 44, 6, 56, 4, 66, 14, 60, 24, 46, 26], wing);
  p.poly([36, 22, 46, 9, 50, 22], wingD);
  p.poly([48, 23, 56, 8, 60, 22], wingD);
  // Kopf
  const hy = awake ? -4 : 0;
  p.ell(20, 26 + hy, 8, 6, body);
  p.ell(15, 32 + hy, 13, 6.5, body);
  p.ell(6, 34 + hy, 7, 5, body);
  p.ell(8, 36 + hy, 6, 3, belly);
  p.px(2, 33 + hy, bodyD);
  p.px(3, 33 + hy, bodyD);
  // Hörner
  p.poly([16, 27 + hy, 26, 17 + hy, 20, 28 + hy], '#f8f0d0');
  p.poly([20, 29 + hy, 30, 22 + hy, 24, 30 + hy], '#e8e0c0');
  // Auge
  if (awake) {
    p.ell(12, 30 + hy, 2.4, 2.4, '#ffffff');
    p.rect(11, 29 + hy, 2, 3, '#208040');
    p.px(11, 29 + hy, '#ffffff');
  } else {
    p.rect(9, 30, 5, 1, bodyD);
    p.px(9, 29, bodyD);
  }
  // Vorderpfote
  p.ell(26, 40, 6, 3, bodyD);
  p.ell(26, 39.5, 5, 2.4, body);
}

// ---------------------------------------------------------------------------
// Gegner
function drawHoppel(p, f) {
  const body = '#f8d048', shade = '#e0a830', belly = '#fff2b8', ear = '#f8a0b0';
  const v = [
    { rx: 6.5, ry: 5.5, cy: 10.5, ear: 6 },
    { rx: 7.5, ry: 4.5, cy: 11.5, ear: 5 },
    { rx: 5.5, ry: 6.2, cy: 9, ear: 7 },
  ][f];
  const top = v.cy - v.ry;
  p.rect(4, top - v.ear + 2, 2, v.ear, body);
  p.rect(10, top - v.ear + 2, 2, v.ear, body);
  p.rect(4, top - v.ear + 3, 1, v.ear - 3, ear);
  p.rect(11, top - v.ear + 3, 1, v.ear - 3, ear);
  p.ell(8, v.cy, v.rx, v.ry, body);
  p.ell(8, v.cy + v.ry * 0.45, v.rx * 0.9, v.ry * 0.55, shade);
  p.ell(8, v.cy + 1, v.rx * 0.6, v.ry * 0.55, belly);
  p.rect(5, Math.round(v.cy - 2), 2, 2, EYE);
  p.rect(10, Math.round(v.cy - 2), 2, 2, EYE);
  p.px(5, Math.round(v.cy - 2), '#ffffff');
  p.px(10, Math.round(v.cy - 2), '#ffffff');
  p.rect(7, Math.round(v.cy + 1), 3, 1, '#7a3020');
  p.px(8, Math.round(v.cy + 2), '#ffffff');
}

function drawPilz(p, f) {
  const cap = '#d83838', capD = '#9c2028', dot = '#fff4e0', stem = '#f2e2c4', stemD = '#cdb48c';
  p.rect(4 + (f ? 1 : 0), 15, 3, 2, '#6a4024');
  p.rect(9 - (f ? 1 : 0), 15, 3, 2, '#6a4024');
  p.ell(8, 11.5, 4.5, 4.5, stem);
  p.rect(4, 12, 8, 1, stemD);
  p.ell(8, 6, 7.5, 5.2, cap);
  p.rect(1, 7, 14, 2, capD);
  p.ell(5, 4, 1.6, 1.3, dot);
  p.ell(11, 3.5, 1.4, 1.2, dot);
  p.ell(8.5, 7, 1.2, 1, dot);
  p.ell(2.8, 6.5, 0.9, 0.9, dot);
  p.ell(13.4, 6.5, 0.9, 0.9, dot);
  p.rect(5, 10, 2, 2, EYE);
  p.rect(9, 10, 2, 2, EYE);
  p.px(5, 9, EYE);
  p.px(10, 9, EYE);
  p.rect(7, 13, 2, 1, '#7a3020');
}

function drawSummsel(p, f) {
  const y = '#f8c830', d = '#2a2030', w = '#e4f6ff';
  if (f) {
    p.ell(5, 4.5, 3.4, 2.2, w);
    p.ell(11, 4.5, 3.4, 2.2, w);
  } else {
    p.ell(5, 2.5, 2.4, 3.4, w);
    p.ell(11, 2.5, 2.4, 3.4, w);
  }
  p.ell(8, 8.5, 5.5, 4.2, y);
  p.rect(6, 5, 1, 8, d);
  p.rect(9, 5, 1, 8, d);
  p.poly([12, 8, 16, 9, 12, 10], d);
  p.ell(3.5, 8, 2.8, 2.8, y);
  p.rect(2, 7, 2, 2, EYE);
  p.px(2, 7, '#ffffff');
  p.rect(1, 3, 1, 3, d);
  p.rect(4, 3, 1, 2, d);
}

function drawStein(p, f) {
  const r = '#9a98ac', rd = '#686680', rl = '#c4c2d4', moss = '#5ca848';
  const o = f ? 1 : 0;
  p.rect(3, 13, 4, 3, rd);
  p.rect(11, 13, 4, 3, rd);
  p.poly([2, 13 - o, 1, 7, 4, 3, 9, 1, 14, 3, 17, 7, 16, 13 - o], r);
  p.poly([3, 6, 6, 3.5, 10, 2.5, 8, 5], rl);
  p.poly([4, 3.5, 8, 0.5, 13, 2, 10, 3.2, 6, 4], moss);
  p.poly([2, 13 - o, 16, 13 - o, 15, 10, 3, 10], rd);
  p.rect(6, 7, 2, 2, '#ffb030');
  p.rect(11, 7, 2, 2, '#ffb030');
  p.px(6, 7, '#fff0a0');
  p.px(11, 7, '#fff0a0');
  p.rect(0, 8 + o, 2, 4, rd);
  p.rect(16, 8 - o, 2, 4, rd);
}

function drawGorm(p, f) {
  const r = '#8c8aa0', rd = '#5c5a74', rl = '#b8b6cc', moss = '#5ca848';
  const a = f ? 2 : 0;
  // Beine
  p.rect(11, 35, 8, 8, rd);
  p.rect(25, 35, 8, 8, rd);
  p.rect(10, 41, 10, 3, '#4a4862');
  p.rect(24, 41, 10, 3, '#4a4862');
  // Arme
  p.ell(5, 22 + a, 5, 8, rd);
  p.ell(39, 22 - a, 5, 8, rd);
  p.ell(5, 30 + a, 5.5, 4.5, r);
  p.ell(39, 30 - a, 5.5, 4.5, r);
  // Rumpf
  p.poly([8, 34, 6, 18, 12, 9, 22, 6, 32, 9, 38, 18, 36, 34], r);
  p.poly([12, 12, 22, 8, 30, 11, 20, 15], rl);
  p.poly([8, 34, 36, 34, 34, 29, 10, 29], rd);
  // Kopf
  p.poly([15, 9, 16, 2, 22, 0, 28, 2, 29, 9], r);
  p.poly([16, 3, 22, 0.5, 28, 3, 22, 4], moss);
  p.rect(18, 5, 2, 2, '#ff5030');
  p.rect(25, 5, 2, 2, '#ff5030');
  // Kristall in der Brust
  p.poly([22, 15, 27, 21, 22, 28, 17, 21], '#9a50e8');
  p.poly([22, 16, 25, 21, 22, 23], '#d8a8ff');
  p.px(21, 18, '#ffffff');
  // Moos auf den Schultern
  p.ell(10, 15, 3, 1.6, moss);
  p.ell(34, 15, 3, 1.6, moss);
}

// ---------------------------------------------------------------------------
// Gegenstände
function drawCoin(p, f) {
  const rx = [3.5, 2.2, 0.9][f];
  p.ell(4, 4, rx, 3.5, '#c89820');
  p.ell(4 - rx * 0.15, 4, rx * 0.75, 2.8, '#f8d040');
  if (f === 0) p.rect(3, 2, 1, 3, '#fff4a0');
}

function drawHeart(p) {
  p.ell(2.5, 2.5, 2.4, 2.4, '#e82848');
  p.ell(6.5, 2.5, 2.4, 2.4, '#e82848');
  p.poly([0.3, 3.2, 8.7, 3.2, 4.5, 8], '#e82848');
  p.rect(2, 1, 1, 2, '#ff9cb0');
}

function drawCrystal(p) {
  p.poly([6, 0, 11.5, 7, 6, 17, 0.5, 7], '#5ad0f8');
  p.poly([6, 0, 11.5, 7, 6, 7], '#a8ecff');
  p.poly([0.5, 7, 6, 7, 6, 17], '#3890d8');
  p.poly([6, 7, 11.5, 7, 6, 17], '#4ab0f0');
  p.rect(4, 3, 1, 3, '#ffffff');
}

function drawSword(p) {
  p.rect(1, 0, 3, 10, '#dce4f0');
  p.rect(1, 0, 1, 10, '#ffffff');
  p.rect(3, 1, 1, 9, '#9aa4b8');
  p.px(2, 0, '#ffffff');
  p.rect(0, 10, 5, 1, '#f0c040');
  p.rect(2, 11, 1, 3, '#7a4a22');
  p.px(2, 14, '#f0c040');
}

// ---------------------------------------------------------------------------
const flashCache = new WeakMap();
export function flashOf(sprite) {
  let f = flashCache.get(sprite);
  if (!f) {
    f = silhouette(sprite);
    flashCache.set(sprite, f);
  }
  return f;
}

export const CAST = {
  hero: {
    colors: {
      skin: '#f8c898', skinS: '#e09868', hair: '#8c4a20', hairD: '#5a2c14', hairL: '#c07038',
      shirt: '#3c78d8', shirtD: '#28509c', pants: '#e8dcb0', boots: '#6a3c1c', belt: '#7a4a22', buckle: '#f0c040',
    },
    scarf: '#e03838', scarfD: '#a02028',
  },
  oma: {
    colors: {
      skin: '#f4c8a0', skinS: '#d8a078', hair: '#dcdce6', hairD: '#a8a8b8', hairL: '#ffffff',
      shirt: '#4a8a4a', shirtD: '#2e6030', pants: '#4a8a4a', boots: '#5a3a28', belt: '#2e6030',
    },
    dress: true, bun: true, glasses: '#c8a040', apron: '#f4f0e0',
  },
  kurt: {
    colors: {
      skin: '#f0b888', skinS: '#c88a60', hair: '#3a2a20', hairD: '#24180f', hairL: '#5a4030',
      shirt: '#e0b860', shirtD: '#a88438', pants: '#5a4a8a', boots: '#4a2e1a', belt: '#6a4020',
    },
    cap: '#c83838', capD: '#8c2020', capL: '#f06060', beard: '#5a3420', apron: '#f2ead8',
  },
  bruno: {
    colors: {
      skin: '#e8b080', skinS: '#c08860', hair: '#4a3020', hairD: '#2a1a10', hairL: '#6a4a30',
      shirt: '#a8b0c0', shirtD: '#707890', pants: '#5a3a28', boots: '#3a2418', belt: '#5a3a28', buckle: '#f0c040',
    },
    helmet: '#c4ccd8', helmetD: '#8890a0',
  },
  lia: {
    colors: {
      skin: '#fcd4b0', skinS: '#e4a888', hair: '#f0c838', hairD: '#c89818', hairL: '#fff080',
      shirt: '#e870a8', shirtD: '#b84880', pants: '#e870a8', boots: '#a03050', belt: '#b84880',
    },
    dress: true, pigtails: true,
  },
  finn: {
    colors: {
      skin: '#c88858', skinS: '#a06840', hair: '#2a1a14', hairD: '#140c08', hairL: '#4a3024',
      shirt: '#48a860', shirtD: '#2e7840', pants: '#7a6040', boots: '#4a2e1a', belt: '#5a3a20',
    },
  },
};

export function buildSprites() {
  for (const [name, def] of Object.entries(CAST)) S[name] = chibiSet(def);

  S.uhu = [bake(18, 22, (p) => drawUhu(p, false)), bake(18, 22, (p) => drawUhu(p, true))];

  const funki = (scale) => {
    const w = Math.ceil(21 * scale), h = Math.ceil(17 * scale);
    const right = [bake(w, h, (p) => drawFunki(p, true, scale)), bake(w, h, (p) => drawFunki(p, false, scale))];
    return { right, left: right.map(flipH) };
  };
  S.funki = [funki(1), funki(1.3), funki(1.6)];

  S.aurelia = { sleep: bake(78, 46, (p) => drawAurelia(p, false)), awake: bake(78, 46, (p) => drawAurelia(p, true)) };

  S.hoppel = [0, 1, 2].map((f) => bake(16, 17, (p) => drawHoppel(p, f)));
  S.pilz = [0, 1].map((f) => bake(16, 17, (p) => drawPilz(p, f)));
  S.summsel = [0, 1].map((f) => bake(17, 14, (p) => drawSummsel(p, f)));
  S.summselR = S.summsel.map(flipH);
  S.stein = [0, 1].map((f) => bake(18, 16, (p) => drawStein(p, f)));
  S.gorm = [0, 1].map((f) => bake(45, 45, (p) => drawGorm(p, f)));

  S.coin = [0, 1, 2].map((f) => bake(8, 8, (p) => drawCoin(p, f)));
  S.heart = bake(9, 9, drawHeart);
  S.crystal = bake(12, 18, drawCrystal);
  S.sword = bake(5, 15, drawSword);
  return S;
}
