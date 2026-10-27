// Partikel, schwebende Zahlen, Geschosse und Fundstücke.
import { rand, pick, dist } from '../util.js';
import { S } from '../gfx/sprites.js';

export class Particle {
  constructor(x, y, vx, vy, life, color, size = 1, grav = 0, front = true) {
    Object.assign(this, { x, y, vx, vy, life, max: life, color, size, grav, front });
  }
  update(dt) {
    this.vy += this.grav * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life > 0;
  }
  draw(g, cx, cy) {
    g.globalAlpha = Math.min(1, (this.life / this.max) * 2);
    g.fillStyle = this.color;
    const s = this.size;
    g.fillRect(Math.round(this.x - cx - s / 2), Math.round(this.y - cy - s / 2), s, s);
    g.globalAlpha = 1;
  }
}

export function burst(world, x, y, n, colors, { speed = 50, life = 0.5, grav = 0, size = 1, up = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.6);
    world.particles.push(
      new Particle(x, y, Math.cos(a) * v, Math.sin(a) * v - up, life * (0.6 + Math.random() * 0.6), pick(colors), size, grav)
    );
  }
}

// Schwebender Text (Schaden, "+1 ⭐" ...). Wird gestochen scharf über dem Pixelbild gezeichnet.
export class FloatText {
  constructor(x, y, text, color = '#fff', big = false) {
    Object.assign(this, { x, y, text, color, big, t: 0, dur: big ? 1.4 : 0.9 });
  }
  update(dt) {
    this.t += dt;
    return this.t < this.dur;
  }
}

// ---------------------------------------------------------------------------
export class Projectile {
  constructor(o) {
    Object.assign(this, { r: 4, life: 2.5, homing: 0, t: 0, dead: false }, o);
  }
  get sortY() {
    return this.y + 4;
  }
  update(dt, game) {
    const w = game.world;
    this.t += dt;
    this.life -= dt;
    if (this.homing && this.target && !this.target.dead) {
      const d = dist(this.x, this.y, this.target.x, this.target.y - 6) || 1;
      const sp = Math.hypot(this.vx, this.vy);
      const tx = ((this.target.x - this.x) / d) * sp, ty = ((this.target.y - 6 - this.y) / d) * sp;
      const k = Math.min(1, this.homing * dt);
      this.vx += (tx - this.vx) * k;
      this.vy += (ty - this.vy) * k;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Schweif
    if (this.kind !== 'rock' && Math.random() < 0.8) {
      const cols = this.kind === 'funki' ? ['#ffd040', '#ff8020'] : ['#fff080', '#ffb030', '#ff5020'];
      w.particles.push(new Particle(this.x + rand(-2, 2), this.y + rand(-2, 2), rand(-10, 10), rand(-20, 0), 0.35, pick(cols), this.kind === 'funki' ? 1 : 2));
    }
    if (this.life <= 0 || w.isSolidPx(this.x, this.y + 4, true)) return this.explode(game, false);
    if (this.owner === 'player') {
      for (const e of w.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - this.x) < e.hw + this.r && Math.abs(e.y - e.hh / 2 - this.y) < e.hh + this.r + 4) {
          e.hurt(game, this.dmg, this.x - this.vx, this.y - this.vy, 1.2, this.spell);
          return this.explode(game, true);
        }
      }
    } else {
      const p = game.player;
      if (Math.abs(p.x - this.x) < p.hw + this.r && Math.abs(p.y - 6 - this.y) < 10) {
        p.hurt(this.dmg, this.x - this.vx, this.y - this.vy);
        return this.explode(game, true);
      }
    }
    return true;
  }
  explode(game, hit) {
    this.dead = true;
    const cols = this.kind === 'rock' ? ['#9a98ac', '#686680', '#c4c2d4'] : ['#fff080', '#ffb030', '#ff5020', '#ffffff'];
    burst(game.world, this.x, this.y, this.kind === 'bigfire' ? 26 : 10, cols, { speed: this.kind === 'bigfire' ? 80 : 45, life: 0.45 });
    if (this.kind === 'bigfire' && hit) game.shake(4);
    return false;
  }
  draw(g, cx, cy, time) {
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(x - 3, y + 6, 6, 2);
    if (this.kind === 'rock') {
      g.fillStyle = '#5c5a74';
      g.fillRect(x - 3, y - 3, 7, 7);
      g.fillStyle = '#9a98ac';
      g.fillRect(x - 2, y - 2, 5, 5);
      g.fillStyle = '#c4c2d4';
      g.fillRect(x - 2, y - 2, 2, 2);
      return;
    }
    const big = this.kind === 'bigfire';
    const r = big ? 5 + Math.sin(time * 30) : this.kind === 'funki' ? 2 : 3;
    g.fillStyle = '#ff5020';
    g.beginPath();
    g.arc(x, y, r + 1.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffb030';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff6b0';
    g.beginPath();
    g.arc(x - 0.5, y - 0.5, r * 0.5, 0, Math.PI * 2);
    g.fill();
  }
}

// ---------------------------------------------------------------------------
export class Drop {
  constructor(kind, x, y, value = 1) {
    Object.assign(this, { kind, x, y, value, z: 0, vz: 70, t: 0, life: 12, dead: false });
    this.vx = rand(-25, 25);
    this.vy = rand(-12, 12);
  }
  get sortY() {
    return this.y;
  }
  update(dt, game) {
    this.t += dt;
    if (this.kind !== 'crystal') this.life -= dt;
    if (this.z > 0 || this.vz > 0) {
      this.vz -= 260 * dt;
      this.z = Math.max(0, this.z + this.vz * dt);
      if (this.z === 0 && this.vz < 0) this.vz = Math.abs(this.vz) > 40 ? -this.vz * 0.4 : 0;
      const w = game.world;
      if (!w.isSolidPx(this.x + this.vx * dt, this.y, false)) this.x += this.vx * dt;
      if (!w.isSolidPx(this.x, this.y + this.vy * dt, false)) this.y += this.vy * dt;
    }
    if (this.life <= 0) return false;
    const p = game.player;
    if (this.t > 0.35 && Math.abs(p.x - this.x) < 9 && Math.abs(p.y - 4 - this.y) < 10) {
      game.collect(this);
      return false;
    }
    return true;
  }
  draw(g, cx, cy, time) {
    if (this.life < 3 && Math.floor(this.t * 10) % 2) return;
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(x - 3, y - 1, 7, 2);
    const bob = this.kind === 'crystal' ? 6 + Math.sin(time * 3) * 2 : 0;
    const zz = Math.round(this.z + bob);
    if (this.kind === 'coin') {
      const f = S.coin[Math.floor(time * 8) % 3];
      g.drawImage(f, x - 5, y - 10 - zz);
    } else if (this.kind === 'heart') {
      g.drawImage(S.heart, x - 5, y - 11 - zz);
    } else if (this.kind === 'crystal') {
      g.globalAlpha = 0.35 + Math.sin(time * 4) * 0.15;
      g.fillStyle = '#a8ecff';
      g.beginPath();
      g.arc(x, y - 12 - zz, 12, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      g.drawImage(S.crystal, x - 7, y - 22 - zz);
    }
  }
}
