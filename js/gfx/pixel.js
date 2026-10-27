// Werkzeuge, um Pixel-Grafiken im Code zu "backen":
// Formen werden gezeichnet, die Kanten hart gemacht und eine dunkle Kontur ergänzt.
import { makeCanvas } from '../util.js';

export const OUTLINE = '#1c1424';

export function parseColor(c) {
  if (c[0] !== '#') throw new Error('Farbe erwartet: ' + c);
  let h = c.slice(1);
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Alpha hart machen (keine halbtransparenten Kantenpixel).
function hardenAlpha(g, w, h, threshold = 110) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > threshold ? 255 : 0;
  g.putImageData(img, 0, 0);
}

// 1px-Kontur um alle undurchsichtigen Pixel. Ergebnis ist 2px breiter und höher.
export function outline(src, color = OUTLINE) {
  const w = src.width + 2, h = src.height + 2;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.drawImage(src, 1, 1);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const [r, gg, b] = parseColor(color);
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) continue;
      const n =
        (x > 0 && solid[i - 1]) ||
        (x < w - 1 && solid[i + 1]) ||
        (y > 0 && solid[i - w]) ||
        (y < h - 1 && solid[i + w]);
      if (n) {
        d[i * 4] = r;
        d[i * 4 + 1] = gg;
        d[i * 4 + 2] = b;
        d[i * 4 + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function flipH(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

// Weiße Silhouette (für Treffer-Blitzen).
export function silhouette(src, color = '#ffffff') {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// Zeichenhilfen, die an eine Zeichenfunktion übergeben werden.
export function painter(g) {
  return {
    g,
    rect(x, y, w, h, c) {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    },
    px(x, y, c) {
      g.fillStyle = c;
      g.fillRect(x, y, 1, 1);
    },
    ell(cx, cy, rx, ry, c) {
      g.fillStyle = c;
      g.beginPath();
      g.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
      g.fill();
    },
    poly(points, c) {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
      g.closePath();
      g.fill();
    },
    line(x0, y0, x1, y1, c) {
      // Bresenham – pixelgenaue Linie
      g.fillStyle = c;
      x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        g.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    },
  };
}

// Backt eine Grafik: zeichnen → Alpha härten → optional Kontur.
export function bake(w, h, draw, { outlined = true, olColor = OUTLINE, threshold = 110 } = {}) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  draw(painter(g), w, h);
  hardenAlpha(g, w, h, threshold);
  return outlined ? outline(c, olColor) : c;
}
