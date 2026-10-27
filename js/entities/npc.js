// Dorfbewohner und andere Figuren, mit denen man reden kann.
import { S } from '../gfx/sprites.js';
import { rand } from '../util.js';

export const NPC_INFO = {
  uhu: { name: 'Prof. Uhu', sprite: 'uhu' },
  oma: { name: 'Oma Kräuter', sprite: 'oma' },
  kurt: { name: 'Krämer Kurt', sprite: 'kurt' },
  bruno: { name: 'Wache Bruno', sprite: 'bruno' },
  lia: { name: 'Lia', sprite: 'lia' },
  finn: { name: 'Finn', sprite: 'finn' },
};

export class Npc {
  constructor(o) {
    const info = NPC_INFO[o.id];
    this.id = o.id;
    this.name = info.name;
    this.spriteKey = info.sprite;
    this.x = (o.tx + 0.5) * 16;
    this.y = (o.ty + 1) * 16 - 2;
    this.homeX = this.x;
    this.homeY = this.y;
    this.dir = o.dir || 'down';
    this.baseDir = this.dir;
    this.wander = !!o.wander;
    this.hw = 6;
    this.hh = 5;
    this.t = rand(0, 5);
    this.moveT = rand(1, 3);
    this.vx = 0;
    this.vy = 0;
  }

  get sortY() {
    return this.y;
  }

  get portrait() {
    return this.spriteKey === 'uhu' ? S.uhu[0] : S[this.spriteKey].down[0];
  }

  get talkRect() {
    return { x: this.x - 10, y: this.y - 20, w: 20, h: 22 };
  }

  update(dt, game) {
    this.t += dt;
    if (!this.wander || game.cutscene) return true;
    this.moveT -= dt;
    if (this.moveT <= 0) {
      this.moveT = rand(1, 2.6);
      const homeD = Math.hypot(this.homeX - this.x, this.homeY - this.y);
      if (Math.random() < 0.45) {
        this.vx = 0;
        this.vy = 0;
      } else {
        const a = homeD > 30 ? Math.atan2(this.homeY - this.y, this.homeX - this.x) : Math.floor(rand(0, 4)) * (Math.PI / 2);
        this.vx = Math.round(Math.cos(a)) * 22;
        this.vy = Math.round(Math.sin(a)) * 22;
        if (this.vx || this.vy) this.dir = Math.abs(this.vx) > Math.abs(this.vy) ? (this.vx > 0 ? 'right' : 'left') : this.vy > 0 ? 'down' : 'up';
      }
    }
    const p = game.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < 22) {
      this.vx = 0;
      this.vy = 0;
    }
    game.world.move(this, this.vx * dt, this.vy * dt, false);
    return true;
  }

  faceTo(px, py) {
    const dx = px - this.x, dy = py - this.y;
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  draw(g, cx, cy) {
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    g.fillStyle = 'rgba(20,30,10,0.28)';
    g.beginPath();
    g.ellipse(x, y, 6, 2.5, 0, 0, Math.PI * 2);
    g.fill();
    if (this.spriteKey === 'uhu') {
      const blink = Math.floor(this.t * 10) % 40 === 0;
      const bob = Math.floor(this.t * 2) % 2;
      g.drawImage(S.uhu[blink ? 1 : 0], x - 10, y - 23 + bob);
      return;
    }
    const moving = this.vx || this.vy;
    const frame = moving ? [1, 0, 2, 0][Math.floor(this.t * 7) % 4] : 0;
    g.drawImage(S[this.spriteKey][this.dir][frame], x - 9, y - 23);
  }
}
