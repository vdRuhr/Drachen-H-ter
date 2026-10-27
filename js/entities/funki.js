// Funki, der kleine Drache: folgt dir, spuckt kleine Feuerbälle und wächst mit jeder richtigen Antwort.
import { S } from '../gfx/sprites.js';
import { DIRS, dist } from '../util.js';
import { funkiLevel } from '../data.js';
import { Projectile } from './effects.js';

export class Funki {
  constructor(game) {
    this.game = game;
    this.x = 0;
    this.y = 0;
    this.z = 12;
    this.t = 0;
    this.face = 'right';
    this.cool = 2;
    this.castT = 0;
  }

  get level() {
    return funkiLevel(this.game.save.learn.correct);
  }

  get sortY() {
    return this.y;
  }

  place(x, y) {
    this.x = x - 14;
    this.y = y + 2;
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.t += dt;
    const d = DIRS[p.dir];
    let tx = p.x - d.x * 16 - (d.y ? 14 : 0), ty = p.y - d.y * 12 + 2;
    if (this.castT > 0) {
      this.castT -= dt;
      tx = p.x + d.x * 14;
      ty = p.y + d.y * 10 + (d.y ? 0 : 2);
    }
    if (dist(this.x, this.y, tx, ty) > 140) {
      this.x = tx;
      this.y = ty;
    }
    const k = Math.min(1, dt * 4);
    const ox = this.x;
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
    if (Math.abs(this.x - ox) > 0.05) this.face = this.x > ox ? 'right' : 'left';
    this.z = 12 + Math.sin(this.t * 4) * 2.5;

    // Kleine Feuerbälle auf Gegner in der Nähe
    if (g.player.dead) return;
    this.cool -= dt;
    if (this.cool <= 0) {
      const lv = this.level;
      let best = null, bd = 95;
      for (const e of g.world.enemies) {
        if (e.dead) continue;
        const dd = dist(this.x, this.y, e.x, e.y);
        if (dd < bd) { bd = dd; best = e; }
      }
      if (best) {
        this.spit(best, 2 + lv * 2, 'funki');
        this.cool = Math.max(1.4, 3.6 - lv * 0.3);
      } else {
        this.cool = 0.5;
      }
    }
  }

  spit(target, dmg, kind, spell = null) {
    const g = this.game;
    const sx = this.x + (this.face === 'right' ? 6 : -6), sy = this.y - this.z - 4;
    const d = dist(sx, sy, target.x, target.y - 6) || 1;
    const sp = kind === 'bigfire' ? 150 : 120;
    this.face = target.x > this.x ? 'right' : 'left';
    g.world.projectiles.push(new Projectile({
      x: sx, y: sy, vx: ((target.x - sx) / d) * sp, vy: ((target.y - 6 - sy) / d) * sp,
      owner: 'player', dmg, kind, target, homing: kind === 'bigfire' ? 8 : 3, r: kind === 'bigfire' ? 6 : 3, spell,
    }));
    g.sound.play(kind === 'bigfire' ? 'fire' : 'funkiFire');
  }

  draw(g, cx, cy) {
    const lv = this.level;
    const set = S.funki[lv >= 5 ? 2 : lv >= 3 ? 1 : 0];
    const spr = set[this.face][Math.floor(this.t * 6) % 2];
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    g.fillStyle = 'rgba(20,30,10,0.22)';
    g.beginPath();
    g.ellipse(x, y, 5, 2, 0, 0, Math.PI * 2);
    g.fill();
    g.drawImage(spr, Math.round(x - spr.width / 2), Math.round(y - this.z - spr.height));
  }
}
