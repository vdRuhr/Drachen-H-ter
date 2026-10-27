// Die Spielwelt einer Karte: Boden, Hindernisse, Objekte, Figuren, Effekte.
import { TILE, hash2, rand, pick, makeCanvas, rectsOverlap } from '../util.js';
import { G, GROUND_CHARS, groundSolidity, renderGround } from '../gfx/tiles.js';
import { P, houseSprite } from '../gfx/props.js';
import { S } from '../gfx/sprites.js';
import { MAPS } from './maps.js';
import { Npc } from '../entities/npc.js';
import { Enemy, Gorm } from '../entities/enemies.js';
import { Drop, burst } from '../entities/effects.js';

const PROP_CHARS = new Set(['T', 'P', 'b', 'o', 'F', 'I', 'i', 't']);

// Ein festes Ding auf der Karte (Baum, Haus, Truhe …)
class Prop {
  constructor(o) {
    Object.assign(this, { ox: 0, oy: 0, shadow: null, tiles: [], talk: null }, o);
    this.sortY ??= this.y;
  }
  draw(g, cx, cy, time) {
    if (this.hidden) return;
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    if (this.shadow) {
      g.fillStyle = 'rgba(20,30,10,0.26)';
      g.beginPath();
      g.ellipse(x, y - 2, this.shadow[0], this.shadow[1], 0, 0, Math.PI * 2);
      g.fill();
    }
    if (this.seeThrough) g.globalAlpha = 0.5;
    if (this.sprite) g.drawImage(typeof this.sprite === 'function' ? this.sprite() : this.sprite, x + this.ox, y + this.oy);
    g.globalAlpha = 1;
    this.after?.(g, x, y, time);
  }
}

export class World {
  constructor(game, id) {
    const def = MAPS[id];
    if (!def) throw new Error('Unbekannte Karte: ' + id);
    this.game = game;
    this.id = id;
    this.def = def;
    this.h = def.rows.length;
    this.w = def.rows[0].length;
    def.rows.forEach((r, i) => {
      if (r.length !== this.w) throw new Error(`Karte ${id}: Zeile ${i} hat ${r.length} statt ${this.w} Zeichen`);
    });
    this.pw = this.w * TILE;
    this.ph = this.h * TILE;
    this.ground = new Uint8Array(this.w * this.h);
    this.solid = new Uint8Array(this.w * this.h);
    this.props = [];
    this.npcs = [];
    this.enemies = [];
    this.drops = [];
    this.projectiles = [];
    this.effects = [];
    this.particles = [];
    this.texts = [];
    this.ambient = [];
    this.exits = [];
    this.triggers = [];
    this.lights = [];
    this.usedRiddles = new Set();
    this.boss = null;
    this.start = null;

    const baseGround = id === 'ruine' ? G.FLOOR : G.GRASS;
    for (let ty = 0; ty < this.h; ty++) {
      for (let tx = 0; tx < this.w; tx++) {
        const ch = def.rows[ty][tx];
        const i = ty * this.w + tx;
        if (ch in GROUND_CHARS) this.ground[i] = GROUND_CHARS[ch];
        else this.ground[i] = baseGround;
        this.solid[i] = groundSolidity(this.ground[i]);
      }
    }
    for (let ty = 0; ty < this.h; ty++) {
      for (let tx = 0; tx < this.w; tx++) {
        const ch = def.rows[ty][tx];
        if (PROP_CHARS.has(ch)) this.addTileProp(ch, tx, ty);
      }
    }
    for (const o of def.objects) this.addObject(o);
    for (const [type, tx, ty] of def.spawns) {
      const [fx, fy] = this.freeTileNear(tx, ty);
      this.enemies.push(new Enemy(game, type, (fx + 0.5) * TILE, (fy + 1) * TILE - 2));
    }

    const hasWater = this.ground.includes(G.WATER);
    this.groundFrames = hasWater ? [0, 1, 2].map((f) => renderGround(this, f)) : [renderGround(this, 0)];
  }

  // ------------------------------------------------------------------ Aufbau
  setSolid(tx, ty, v = 1) {
    if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.solid[ty * this.w + tx] = v;
  }

  isProp(tx, ty, ch) {
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h && this.def.rows[ty][tx] === ch;
  }

  addTileProp(ch, tx, ty) {
    const x = tx * TILE + 8, y = ty * TILE + 16;
    this.setSolid(tx, ty);
    switch (ch) {
      case 'T': {
        const v = this.id === 'wald' ? (hash2(tx, ty, 77) < 0.7 ? 1 : 0) : hash2(tx, ty, 77) < 0.2 ? 1 : 0;
        this.props.push(new Prop({ kind: 'tree', x, y, sprite: P.tree[v], ox: -17, oy: -42, shadow: [11, 4] }));
        break;
      }
      case 'P':
        this.props.push(new Prop({ kind: 'tree', x, y, sprite: P.pine, ox: -13, oy: -42, shadow: [9, 3] }));
        break;
      case 'b': {
        const berries = hash2(tx, ty, 5) < 0.3;
        this.props.push(new Prop({ kind: 'bush', tx, ty, x, y, sprite: P.bush[berries ? 1 : 0], ox: -9, oy: -16, shadow: [7, 2.5] }));
        break;
      }
      case 'o':
        this.props.push(new Prop({ kind: 'rock', x, y, sprite: P.rock, ox: -9, oy: -15, shadow: [8, 2.5] }));
        break;
      case 'F': {
        const m = (this.isProp(tx - 1, ty, 'F') ? 1 : 0) | (this.isProp(tx + 1, ty, 'F') ? 2 : 0) |
          (this.isProp(tx, ty - 1, 'F') ? 4 : 0) | (this.isProp(tx, ty + 1, 'F') ? 8 : 0);
        this.props.push(new Prop({ kind: 'fence', x, y, sprite: P.fence[m], ox: -8, oy: -16 }));
        break;
      }
      case 'I':
      case 'i':
        this.props.push(new Prop({ kind: 'pillar', x, y, sprite: ch === 'I' ? P.pillar : P.pillarBroken, ox: -9, oy: -36, shadow: [8, 3] }));
        break;
      case 't': {
        const light = { x, y: y - 18, r: 58, flicker: true };
        this.lights.push(light);
        this.props.push(new Prop({
          kind: 'torch', x, y, sprite: P.torch, ox: -9, oy: -21,
          after: (g, sx, sy, time) => drawFlame(g, sx, sy - 19, time + tx),
        }));
        break;
      }
      default:
        break;
    }
  }

  tileRect(tx, ty, tw = 1, th = 1, pad = 2) {
    return { x: tx * TILE - pad, y: ty * TILE - pad, w: tw * TILE + pad * 2, h: th * TILE + pad * 2 };
  }

  addObject(o) {
    const game = this.game;
    switch (o.type) {
      case 'start':
        this.start = { x: o.x * TILE, y: o.y * TILE };
        break;
      case 'house': {
        const spr = houseSprite(o.tw, o.th, o.style);
        for (let y = o.ty + 1; y < o.ty + o.th; y++) for (let x = o.tx; x < o.tx + o.tw; x++) this.setSolid(x, y);
        const doorX = o.tx + Math.floor(o.tw / 2), doorY = o.ty + o.th - 1;
        this.props.push(new Prop({
          kind: 'house', x: o.tx * TILE, y: (o.ty + o.th) * TILE, sprite: spr, ox: -3, oy: -(o.th * 16 + 5),
          talk: this.tileRect(doorX, doorY), text: o.door,
        }));
        break;
      }
      case 'tower': {
        for (let y = o.ty + 1; y < o.ty + 5; y++) for (let x = o.tx; x < o.tx + 3; x++) this.setSolid(x, y);
        this.props.push(new Prop({
          kind: 'house', x: (o.tx + 1.5) * TILE, y: (o.ty + 5) * TILE, sprite: P.tower, ox: -27, oy: -85,
          talk: this.tileRect(o.tx + 1, o.ty + 4), text: o.door,
        }));
        break;
      }
      case 'stall':
        for (let x = o.tx; x < o.tx + 3; x++) {
          this.setSolid(x, o.ty);
          this.setSolid(x, o.ty + 1);
        }
        this.props.push(new Prop({ kind: 'stall', x: o.tx * TILE, y: (o.ty + 2) * TILE, sprite: P.stall, ox: -1, oy: -33 }));
        break;
      case 'well':
        this.setSolid(o.tx, o.ty);
        this.setSolid(o.tx + 1, o.ty);
        this.props.push(new Prop({
          kind: 'well', x: o.tx * TILE, y: (o.ty + 1) * TILE, sprite: P.well, ox: 1, oy: -25,
          talk: this.tileRect(o.tx, o.ty, 2, 1), text: 'Ein alter Brunnen. Das Wasser glitzert. Du wirfst gedanklich einen Wunsch hinein: *Ich will alles lernen!*',
        }));
        break;
      case 'statue': {
        this.setSolid(o.tx, o.ty);
        const x = o.tx * TILE + 8, y = o.ty * TILE + 16;
        this.lights.push({ x, y: y - 14, r: 40 });
        this.props.push(new Prop({
          kind: 'statue', x, y, sprite: P.statue, ox: -9, oy: -32, shadow: [8, 3],
          talk: this.tileRect(o.tx, o.ty),
          after: (g, sx, sy, time) => {
            g.globalAlpha = 0.35 + Math.sin(time * 3) * 0.2;
            g.fillStyle = '#9ae6ff';
            g.beginPath();
            g.arc(sx, sy - 14, 4, 0, Math.PI * 2);
            g.fill();
            g.globalAlpha = 1;
          },
        }));
        break;
      }
      case 'sign':
        this.setSolid(o.tx, o.ty);
        this.props.push(new Prop({
          kind: 'sign', x: o.tx * TILE + 8, y: o.ty * TILE + 16, sprite: P.sign, ox: -9, oy: -18,
          talk: this.tileRect(o.tx, o.ty), text: o.text,
        }));
        break;
      case 'chest': {
        this.setSolid(o.tx, o.ty);
        const prop = new Prop({
          kind: 'chest', id: o.id, data: o, x: o.tx * TILE + 8, y: o.ty * TILE + 16, ox: -9, oy: -16, shadow: [8, 2],
          talk: this.tileRect(o.tx, o.ty),
          sprite: () => (game.save.opened[o.id] ? P.chestOpen : P.chest),
          after: (g, sx, sy, time) => {
            if (game.save.opened[o.id] || !o.quiz) return;
            // Rätseltruhen funkeln
            if (Math.floor(time * 3 + o.tx) % 4 === 0) {
              g.fillStyle = '#fff6b0';
              g.fillRect(sx + 3, sy - 14, 1, 3);
              g.fillRect(sx + 2, sy - 13, 3, 1);
            }
          },
        });
        this.props.push(prop);
        break;
      }
      case 'riddle': {
        this.setSolid(o.tx, o.ty);
        this.props.push(new Prop({
          kind: 'riddle', id: o.id, x: o.tx * TILE + 8, y: o.ty * TILE + 16, sprite: P.rock, ox: -9, oy: -15, shadow: [8, 2.5],
          talk: this.tileRect(o.tx, o.ty),
          after: (g, sx, sy, time) => {
            const used = this.usedRiddles.has(o.id);
            g.globalAlpha = used ? 0.3 : 0.6 + Math.sin(time * 4) * 0.3;
            g.fillStyle = '#d08cff';
            g.fillRect(sx - 1, sy - 11, 2, 6);
            g.fillRect(sx - 3, sy - 9, 6, 1);
            g.fillRect(sx - 2, sy - 6, 4, 1);
            g.globalAlpha = 1;
          },
        }));
        break;
      }
      case 'gate': {
        this.setSolid(o.tx, o.ty);
        this.setSolid(o.tx + 2, o.ty);
        const open = () => !!game.save.flags[o.id];
        if (!open()) this.setSolid(o.tx + 1, o.ty);
        this.gate = { ...o };
        this.props.push(new Prop({
          kind: 'gate', id: o.id, data: o, x: o.tx * TILE, y: (o.ty + 1) * TILE, sprite: P.gate, ox: -1, oy: -45,
          talk: this.tileRect(o.tx + 1, o.ty, 1, 1, 3),
          after: (g, sx, sy, time) => {
            if (open()) return;
            for (let yy = sy - 38; yy < sy; yy++) {
              const a = 0.35 + 0.25 * Math.sin(time * 6 + yy * 0.4);
              g.fillStyle = `rgba(192,112,255,${a})`;
              g.fillRect(sx + 16, yy, 16, 1);
            }
            g.fillStyle = 'rgba(255,240,255,0.8)';
            const py = sy - 38 + ((time * 30) % 38);
            g.fillRect(sx + 18 + Math.round(Math.sin(time * 4) * 5) + 5, Math.round(py), 1, 2);
          },
        }));
        this.lights.push({ x: (o.tx + 1.5) * TILE, y: (o.ty + 0.5) * TILE, r: 46 });
        break;
      }
      case 'aurelia': {
        for (let y = o.ty; y < o.ty + 2; y++) for (let x = o.tx; x < o.tx + 4; x++) this.setSolid(x, y);
        const cx = (o.tx + 2) * TILE, by = (o.ty + 2) * TILE;
        this.props.push(new Prop({
          kind: 'aurelia', x: cx, y: by, ox: -40, oy: -48, shadow: [34, 6],
          sprite: () => (game.save.flags.aureliaAwake ? S.aurelia.awake : S.aurelia.sleep),
          talk: this.tileRect(o.tx, o.ty, 4, 2, 4),
          after: (g, sx, sy, time) => {
            if (game.save.flags.aureliaAwake) return;
            // Zzz
            for (let i = 0; i < 3; i++) {
              const t = (time * 0.5 + i / 3) % 1;
              g.globalAlpha = 1 - t;
              g.fillStyle = '#ffffff';
              const zx = Math.round(sx - 34 - t * 10 + Math.sin(t * 6) * 2), zy = Math.round(sy - 24 - t * 18);
              const s = 2 + Math.round(t * 2);
              g.fillRect(zx, zy, s + 1, 1);
              g.fillRect(zx, zy + s, s + 1, 1);
              for (let k = 0; k < s; k++) g.fillRect(zx + s - k, zy + k, 1, 1);
            }
            g.globalAlpha = 1;
          },
        }));
        break;
      }
      case 'npc': {
        const n = new Npc(o);
        this.npcs.push(n);
        break;
      }
      case 'exit':
        this.exits.push({ ...o, rect: { x: o.tx * TILE, y: o.ty * TILE, w: o.tw * TILE, h: o.th * TILE } });
        break;
      case 'trigger':
        this.triggers.push({ ...o, rect: { x: o.tx * TILE, y: o.ty * TILE, w: o.tw * TILE, h: o.th * TILE } });
        break;
      case 'boss':
        if (!game.save.flags.bossDone) {
          this.boss = new Gorm(game, o.tx * TILE, (o.ty + 1) * TILE);
          this.enemies.push(this.boss);
        } else if (!game.save.flags.crystal) {
          this.drops.push(Object.assign(new Drop('crystal', o.tx * TILE, (o.ty + 1) * TILE), { vz: 0 }));
        }
        break;
      default:
        break;
    }
  }

  freeTileNear(tx, ty) {
    for (let r = 0; r < 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = tx + dx, y = ty + dy;
          if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
          if (this.solid[y * this.w + x] === 0) return [x, y];
        }
      }
    }
    return [tx, ty];
  }

  // ------------------------------------------------------------- Kollision
  tileSolid(tx, ty, flying) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
    const s = this.solid[ty * this.w + tx];
    return s === 1 || (s === 2 && !flying);
  }

  isSolidPx(px, py, flying) {
    return this.tileSolid(Math.floor(px / TILE), Math.floor(py / TILE), flying);
  }

  boxFree(x, y, e, flying) {
    const x0 = x - e.hw, x1 = x + e.hw - 0.01, y0 = y - e.hh, y1 = y - 0.01;
    for (let ty = Math.floor(y0 / TILE); ty <= Math.floor(y1 / TILE); ty++) {
      for (let tx = Math.floor(x0 / TILE); tx <= Math.floor(x1 / TILE); tx++) {
        if (this.tileSolid(tx, ty, flying)) return false;
      }
    }
    // Figuren blockieren sich gegenseitig (Spieler ↔ Dorfbewohner)
    const p = this.game.player;
    const blockers = e === p ? this.npcs : this.npcs.includes(e) ? [p, ...this.npcs] : null;
    if (blockers) {
      for (const n of blockers) {
        if (n === e || !n) continue;
        if (x0 < n.x + n.hw && x1 > n.x - n.hw && y0 < n.y && y1 > n.y - n.hh) return false;
      }
    }
    return true;
  }

  move(e, dx, dy, flying) {
    if (dx) this.moveAxis(e, dx, 0, flying, !dy);
    if (dy) this.moveAxis(e, 0, dy, flying, !dx);
  }

  moveAxis(e, dx, dy, flying, canSlide) {
    if (this.boxFree(e.x + dx, e.y + dy, e, flying)) {
      e.x += dx;
      e.y += dy;
      return;
    }
    // so nah wie möglich heranrücken
    const steps = Math.ceil(Math.abs(dx + dy));
    const sx = Math.sign(dx), sy = Math.sign(dy);
    for (let i = 0; i < steps; i++) {
      const fx = i === steps - 1 ? dx - sx * i : sx, fy = i === steps - 1 ? dy - sy * i : sy;
      if (!this.boxFree(e.x + fx, e.y + fy, e, flying)) break;
      e.x += fx;
      e.y += fy;
    }
    // um Ecken herumgleiten (fühlt sich mit dem Touch-Stick viel besser an)
    if (!canSlide) return;
    for (let k = 1; k <= 7; k++) {
      for (const s of [1, -1]) {
        const ox = dx ? 0 : s * k, oy = dx ? s * k : 0;
        if (this.boxFree(e.x + ox, e.y + oy, e, flying) && this.boxFree(e.x + ox + dx, e.y + oy + dy, e, flying)) {
          const amt = Math.min(1, Math.abs(dx + dy)) * s;
          if (dx) e.y += amt;
          else e.x += amt;
          return;
        }
      }
    }
  }

  // --------------------------------------------------------- Interaktion
  findInteractable(p) {
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[p.dir];
    const fx = p.x + d[0] * 12, fy = p.y - 4 + d[1] * 12;
    const hit = (r) => fx >= r.x && fx <= r.x + r.w && fy >= r.y && fy <= r.y + r.h;
    for (const n of this.npcs) if (hit(n.talkRect)) return n;
    for (const pr of this.props) if (pr.talk && !pr.hidden && hit(pr.talk)) return pr;
    return null;
  }

  cutBushes(box) {
    for (const pr of this.props) {
      if (pr.kind !== 'bush' || pr.hidden) continue;
      const r = { x: pr.tx * TILE + 2, y: pr.ty * TILE + 2, w: 12, h: 12 };
      if (!rectsOverlap(box, r)) continue;
      pr.hidden = true;
      this.setSolid(pr.tx, pr.ty, 0);
      this.game.sound.play('bush');
      burst(this, pr.x, pr.y - 8, 14, ['#2c7430', '#46a03c', '#66bc50', '#9ad86a'], { speed: 55, life: 0.6, grav: 120, up: 30 });
      const r2 = Math.random();
      if (r2 < 0.25) this.drops.push(new Drop('coin', pr.x, pr.y - 2, 1));
      else if (r2 < 0.35) this.drops.push(new Drop('heart', pr.x, pr.y - 2));
    }
  }

  enemiesInView() {
    const c = this.game.cam;
    return this.enemies.filter((e) => !e.dead && (!e.isBoss || e.awake) && e.x > c.x - 8 && e.x < c.x + c.w + 8 && e.y > c.y - 8 && e.y < c.y + c.h + 24);
  }

  // ------------------------------------------------------------ Ablauf
  update(dt) {
    const g = this.game;
    for (const n of this.npcs) n.update(dt, g);
    this.enemies = this.enemies.filter((e) => e.update(dt, g));
    this.projectiles = this.projectiles.filter((p) => p.update(dt, g));
    this.drops = this.drops.filter((d) => d.update(dt, g));
    this.effects = this.effects.filter((e) => e.update(dt, g));
    this.particles = this.particles.filter((p) => p.update(dt));
    this.texts = this.texts.filter((t) => t.update(dt));
    this.updateAmbient(dt);
  }

  updateAmbient(dt) {
    const kind = this.def.ambient, c = this.game.cam;
    const max = kind === 'butterflies' ? 5 : kind === 'leaves' ? 14 : 18;
    if (this.ambient.length < max && Math.random() < dt * 4) {
      if (kind === 'butterflies') {
        this.ambient.push({ x: c.x + rand(0, c.w), y: c.y + rand(0, c.h), t: rand(0, 9), vx: rand(-14, 14), vy: rand(-8, 8), col: pick(['#ffffff', '#f8e048', '#f890c0', '#90b8ff']), life: rand(6, 12) });
      } else if (kind === 'leaves') {
        this.ambient.push({ x: c.x + rand(-40, c.w), y: c.y - 6, t: rand(0, 9), vx: rand(6, 16), vy: rand(10, 18), col: pick(['#62b848', '#9ad86a', '#e8c040', '#3e9638']), life: 12 });
      } else {
        this.ambient.push({ x: c.x + rand(0, c.w), y: c.y + rand(0, c.h), t: rand(0, 9), vx: rand(-3, 3), vy: rand(-6, -2), col: '#e8e0ff', life: rand(3, 6) });
      }
    }
    this.ambient = this.ambient.filter((a) => {
      a.t += dt;
      a.life -= dt;
      if (kind === 'butterflies') {
        if (Math.random() < dt) { a.vx = rand(-16, 16); a.vy = rand(-10, 10); }
        a.x += a.vx * dt;
        a.y += a.vy * dt + Math.sin(a.t * 9) * 0.3;
      } else if (kind === 'leaves') {
        a.x += (a.vx + Math.sin(a.t * 2) * 10) * dt;
        a.y += a.vy * dt;
      } else {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
      }
      return a.life > 0 && a.y < c.y + c.h + 10;
    });
  }

  render(g, cam, time) {
    const cx = Math.round(cam.x), cy = Math.round(cam.y);
    const frames = this.groundFrames;
    g.drawImage(frames[Math.abs(Math.floor(time * 2.5)) % frames.length], -cx, -cy);

    for (const e of this.effects) e.draw(g, cx, cy, time);

    const x0 = cx - 48, x1 = cx + cam.w + 48, y0 = cy - 8, y1 = cy + cam.h + 100;
    const list = [];
    const pl = this.game.player;
    for (const p of this.props) {
      if (p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) {
        // Bäume und Säulen werden durchsichtig, wenn die Figur dahinter steht
        p.seeThrough = !!pl && (p.kind === 'tree' || p.kind === 'pillar') && pl.y < p.y - 2 && pl.y > p.y - 44 && Math.abs(pl.x - p.x) < 20;
        list.push(p);
      }
    }
    for (const n of this.npcs) list.push(n);
    for (const e of this.enemies) list.push(e);
    for (const d of this.drops) list.push(d);
    for (const p of this.projectiles) list.push(p);
    const game = this.game;
    if (game.player) list.push(game.player);
    if (game.funki && game.save.flags.metUhu) list.push(game.funki);
    list.sort((a, b) => a.sortY - b.sortY || a.x - b.x);
    for (const d of list) d.draw(g, cx, cy, time);

    for (const p of this.particles) p.draw(g, cx, cy);

    if (this.def.dark) this.renderDark(g, cam, time);

    for (const a of this.ambient) {
      const x = Math.round(a.x - cx), y = Math.round(a.y - cy);
      g.fillStyle = a.col;
      if (this.def.ambient === 'butterflies') {
        const open = Math.floor(a.t * 10) % 2;
        g.fillRect(x - (open ? 2 : 1), y, open ? 2 : 1, 2);
        g.fillRect(x + 1, y, open ? 2 : 1, 2);
        g.fillStyle = '#3a2a20';
        g.fillRect(x, y, 1, 2);
      } else if (this.def.ambient === 'leaves') {
        g.fillRect(x, y, Math.floor(a.t * 4) % 2 ? 2 : 1, 1);
      } else {
        g.globalAlpha = Math.min(1, a.life) * 0.5;
        g.fillRect(x, y, 1, 1);
        g.globalAlpha = 1;
      }
    }
  }

  renderDark(g, cam, time) {
    const w = Math.ceil(cam.w), h = Math.ceil(cam.h);
    if (!this.darkCanvas || this.darkCanvas.width !== w || this.darkCanvas.height !== h) this.darkCanvas = makeCanvas(w, h);
    const d = this.darkCanvas.getContext('2d');
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, w, h);
    d.fillStyle = `rgba(10,4,30,${this.def.dark})`;
    d.fillRect(0, 0, w, h);
    d.globalCompositeOperation = 'destination-out';
    const lights = [...this.lights];
    const p = this.game.player;
    if (p) lights.push({ x: p.x, y: p.y - 10, r: 74 });
    for (const dr of this.drops) if (dr.kind === 'crystal') lights.push({ x: dr.x, y: dr.y - 14, r: 60 });
    for (const pr of this.projectiles) if (pr.kind !== 'rock') lights.push({ x: pr.x, y: pr.y, r: 30 });
    for (const L of lights) {
      const x = L.x - cam.x, y = L.y - cam.y;
      if (x < -L.r || y < -L.r || x > w + L.r || y > h + L.r) continue;
      const r = L.r * (L.flicker ? 1 + Math.sin(time * 9 + L.x) * 0.05 : 1);
      const grd = d.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(0.55, 'rgba(0,0,0,0.75)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = grd;
      d.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.drawImage(this.darkCanvas, 0, 0);
    // warmer Schein der Fackeln
    g.globalCompositeOperation = 'lighter';
    for (const L of this.lights) {
      if (!L.flicker) continue;
      const x = L.x - cam.x, y = L.y - cam.y;
      if (x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
      const grd = g.createRadialGradient(x, y, 0, x, y, 28);
      grd.addColorStop(0, 'rgba(255,150,40,0.22)');
      grd.addColorStop(1, 'rgba(255,150,40,0)');
      g.fillStyle = grd;
      g.fillRect(x - 28, y - 28, 56, 56);
    }
    g.globalCompositeOperation = 'source-over';
  }
}

function drawFlame(g, x, y, t) {
  const f = Math.sin(t * 12) * 1.2;
  const pts = [
    ['#ff5020', 4, 6],
    ['#ffb030', 3, 4.5],
    ['#fff6b0', 1.6, 2.6],
  ];
  for (const [c, rx, ry] of pts) {
    g.fillStyle = c;
    g.beginPath();
    g.ellipse(x, y - ry * 0.6 + f * 0.3, rx, ry + f * 0.4, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (Math.random() < 0.3) {
    g.fillStyle = '#ffb030';
    g.fillRect(Math.round(x + Math.sin(t * 7) * 2), Math.round(y - 8 - (t * 20) % 6), 1, 1);
  }
}

