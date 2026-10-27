// Die Spielfigur: laufen, Schwert schwingen (mit Aufladeleiste wie bei Secret of Mana), Schaden nehmen.
import { S, flashOf } from '../gfx/sprites.js';
import { statsForLevel } from '../data.js';
import { DIRS, rand, rectsOverlap } from '../util.js';
import { FloatText, burst } from './effects.js';

const ATTACK_TIME = 0.28;
const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const HAND = { down: [3, -8], up: [-3, -12], left: [-4, -9], right: [4, -9] };

export class Player {
  constructor(game, save) {
    this.game = game;
    this.x = 0;
    this.y = 0;
    this.dir = save.dir || 'down';
    this.hw = 5;
    this.hh = 6;
    this.level = save.level;
    this.applyStats();
    this.hp = Math.min(save.hp ?? this.maxHp, this.maxHp);
    this.mp = Math.min(save.mp ?? this.maxMp, this.maxMp);
    this.charge = 1;
    this.attackT = 0;
    this.hurtT = 0;
    this.invT = 0;
    this.kbx = 0;
    this.kby = 0;
    this.animT = 0;
    this.moving = false;
    this.mpRegen = 0;
    this.dead = false;
  }

  applyStats() {
    Object.assign(this, statsForLevel(this.level));
  }

  get sortY() {
    return this.y;
  }

  update(dt) {
    const g = this.game, w = g.world;
    if (this.invT > 0) this.invT -= dt;
    if (this.dead) return;
    if (this.attackT <= 0) this.charge = Math.min(1, this.charge + dt / 1.1);
    // Mana füllt sich langsam von selbst
    this.mpRegen += dt;
    if (this.mpRegen > 4) {
      this.mpRegen = 0;
      if (this.mp < this.maxMp) this.mp = Math.min(this.maxMp, this.mp + 1);
    }

    if (this.hurtT > 0) {
      this.hurtT -= dt;
      w.move(this, this.kbx * dt, this.kby * dt, false);
      this.kbx *= 0.86;
      this.kby *= 0.86;
      return;
    }

    let { x: mx, y: my } = g.input.move;
    if (this.attackT > 0) {
      this.attackT -= dt;
      const d = DIRS[this.dir];
      const lunge = this.attackT > ATTACK_TIME * 0.5 ? 40 : 0;
      w.move(this, d.x * lunge * dt, d.y * lunge * dt, false);
      this.checkHits();
      mx = 0;
      my = 0;
    }
    const mag = Math.hypot(mx, my);
    this.moving = mag > 0.05;
    if (this.moving) {
      // Blickrichtung mit etwas Trägheit, damit diagonales Laufen nicht flackert
      const ax = Math.abs(mx), ay = Math.abs(my);
      const horiz = this.dir === 'left' || this.dir === 'right';
      if (ax > ay * (horiz ? 0.7 : 1.3)) this.dir = mx > 0 ? 'right' : 'left';
      else if (ay > ax * (horiz ? 1.3 : 0.7)) this.dir = my > 0 ? 'down' : 'up';
      const speed = 76;
      w.move(this, mx * speed * dt, my * speed * dt, false);
      this.animT += dt * (0.6 + mag * 0.6);
    } else {
      this.animT = 0;
    }
  }

  // Aktionsknopf: reden/öffnen, wenn etwas davor ist – sonst angreifen
  action() {
    if (this.dead || this.hurtT > 0) return;
    const target = this.game.world.findInteractable(this);
    if (target) {
      this.game.interact(target);
      return;
    }
    if (this.attackT > 0) return;
    this.attackT = ATTACK_TIME;
    this.power = this.charge;
    this.charge = 0;
    this.hitSet = new Set();
    this.game.sound.play('swing');
  }

  attackBox() {
    const x = this.x, y = this.y;
    switch (this.dir) {
      case 'down': return { x: x - 13, y: y - 6, w: 26, h: 20 };
      case 'up': return { x: x - 13, y: y - 30, w: 26, h: 22 };
      case 'left': return { x: x - 24, y: y - 20, w: 22, h: 22 };
      default: return { x: x + 2, y: y - 20, w: 22, h: 22 };
    }
  }

  checkHits() {
    const prog = 1 - this.attackT / ATTACK_TIME;
    if (prog < 0.15 || prog > 0.8) return;
    const g = this.game, box = this.attackBox();
    for (const e of g.world.enemies) {
      if (e.dead || this.hitSet.has(e)) continue;
      const eb = { x: e.x - e.hw - 2, y: e.y - e.hh * 2 - 6 - (e.z || 0), w: e.hw * 2 + 4, h: e.hh * 2 + 8 };
      if (!rectsOverlap(box, eb)) continue;
      this.hitSet.add(e);
      const pw = this.power ?? 1;
      const crit = pw >= 1 && Math.random() < 0.15;
      let dmg = this.atk * (0.2 + 0.8 * Math.pow(pw, 1.5)) - e.armor;
      dmg = Math.max(1, Math.round(dmg * rand(0.85, 1.15) * (crit ? 1.6 : 1)));
      e.hurt(g, dmg, this.x, this.y, 0.6 + pw, null, crit);
      g.hitStop = 0.045;
    }
    g.world.cutBushes(box);
  }

  hurt(dmg, fromX, fromY) {
    const g = this.game;
    if (this.invT > 0 || this.dead || g.cutscene) return;
    dmg = Math.max(1, Math.round(dmg - this.def * 0.5));
    this.hp = Math.max(0, this.hp - dmg);
    g.world.texts.push(new FloatText(this.x, this.y - 22, String(dmg), '#ff6b6b'));
    const d = Math.hypot(this.x - fromX, this.y - fromY) || 1;
    this.kbx = ((this.x - fromX) / d) * 150;
    this.kby = ((this.y - fromY) / d) * 150;
    this.hurtT = 0.22;
    this.invT = 1.1;
    this.attackT = 0;
    g.sound.play('hurt');
    g.shake(3);
    burst(g.world, this.x, this.y - 8, 6, ['#ffffff', '#ff8080'], { speed: 40, life: 0.3 });
    if (this.hp <= 0) {
      this.dead = true;
      g.onPlayerDown();
    }
  }

  revive() {
    this.dead = false;
    this.hurtT = 0;
    this.attackT = 0;
    this.kbx = 0;
    this.kby = 0;
    this.invT = 1.5;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
  }

  frame() {
    if (this.attackT > 0) return 1;
    if (!this.moving) return 0;
    return [1, 0, 2, 0][Math.floor(this.animT * 8) % 4];
  }

  draw(g, cx, cy, time) {
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    g.fillStyle = 'rgba(20,30,10,0.28)';
    g.beginPath();
    g.ellipse(x, y, 6, 2.5, 0, 0, Math.PI * 2);
    g.fill();
    if (this.dead) {
      // umgefallen
      g.save();
      g.translate(x, y - 4);
      g.rotate(Math.PI / 2);
      g.drawImage(S.hero.down[0], -12, -9);
      g.restore();
      return;
    }
    let spr = S.hero[this.dir][this.frame()];
    if (this.hurtT > 0) spr = flashOf(spr);
    const swordBehind = this.dir === 'up' || this.dir === 'left';
    if (this.attackT > 0 && swordBehind) this.drawSword(g, x, y);
    // nach einem Treffer kurz blinken – aber nie ganz verschwinden
    if (this.invT > 0 && Math.floor(time * 16) % 2) g.globalAlpha = 0.4;
    g.drawImage(spr, x - 9, y - 23);
    g.globalAlpha = 1;
    if (this.attackT > 0 && !swordBehind) this.drawSword(g, x, y);
  }

  drawSword(g, x, y) {
    const prog = 1 - this.attackT / ATTACK_TIME;
    const ease = 1 - Math.pow(1 - Math.min(1, prog * 1.6), 3);
    const base = DIR_ANGLE[this.dir];
    const sweep = 1.35;
    const start = base - sweep, a = start + ease * sweep * 2;
    const [hx, hy] = HAND[this.dir];
    const px = x + hx, py = y + hy;
    // Schwung-Spur
    if (prog < 0.85) {
      g.strokeStyle = this.power >= 1 ? 'rgba(255,240,140,0.75)' : 'rgba(255,255,255,0.6)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(px, py, 13, start + 0.2, a, false);
      g.stroke();
    }
    g.save();
    g.translate(px, py);
    g.rotate(a + Math.PI / 2);
    g.drawImage(S.sword, -3, -16);
    g.restore();
  }
}
