// Gegner und der Endgegner Gorm.
import { S, flashOf } from '../gfx/sprites.js';
import { ENEMIES } from '../data.js';
import { rand, randInt, rectsOverlap } from '../util.js';
import { FloatText, Drop, Projectile, burst } from './effects.js';

export class Enemy {
  constructor(game, type, x, y) {
    const d = (this.def = ENEMIES[type]);
    this.type = type;
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.hp = d.hp;
    this.maxHp = d.hp;
    this.hw = d.hw;
    this.hh = d.hh;
    this.atk = d.atk;
    this.armor = d.def;
    this.state = 'rest';
    this.timer = rand(0.3, 1.4);
    this.vx = 0;
    this.vy = 0;
    this.z = 0;
    this.stunT = 0;
    this.flashT = 0;
    this.t = rand(0, 10);
    this.dead = false;
    this.flying = d.ai === 'fly';
    this.face = 'left';
  }

  get sortY() {
    return this.y;
  }

  box() {
    return { x: this.x - this.hw, y: this.y - this.hh * 2 - (this.z > 6 ? 4 : 0), w: this.hw * 2, h: this.hh * 2 };
  }

  update(dt, game) {
    this.t += dt;
    if (this.flashT > 0) this.flashT -= dt;
    const w = game.world, p = game.player;
    if (this.stunT > 0) {
      this.stunT -= dt;
      w.move(this, this.kbx * dt, this.kby * dt, this.flying);
      this.kbx *= 0.85;
      this.kby *= 0.85;
      if (this.def.ai === 'hop') this.z = Math.max(0, this.z - dt * 40);
      return !this.dead;
    }
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    const aggro = !p.dead && d < 100 && !game.cutscene;
    const homeD = Math.hypot(this.homeX - this.x, this.homeY - this.y);
    const sp = this.def.speed;

    const pickDir = () => {
      if (aggro) return Math.atan2(dy, dx);
      if (homeD > 70) return Math.atan2(this.homeY - this.y, this.homeX - this.x);
      return rand(0, Math.PI * 2);
    };

    switch (this.def.ai) {
      case 'hop':
        this.timer -= dt;
        if (this.state === 'hop') {
          const prog = 1 - this.timer / 0.42;
          this.z = Math.sin(Math.min(1, prog) * Math.PI) * 7;
          w.move(this, this.vx * dt, this.vy * dt, false);
          if (this.timer <= 0) {
            this.state = 'rest';
            this.z = 0;
            this.timer = rand(0.35, 1.0) * (aggro ? 0.55 : 1);
          }
        } else if (this.timer <= 0) {
          this.state = 'hop';
          this.timer = 0.42;
          const a = pickDir();
          this.vx = Math.cos(a) * sp;
          this.vy = Math.sin(a) * sp;
        }
        break;
      case 'walk':
      case 'fly': {
        this.timer -= dt;
        if (aggro) {
          const a = Math.atan2(dy, dx) + (this.flying ? Math.sin(this.t * 3) * 0.9 : 0);
          this.vx = Math.cos(a) * sp * (this.flying ? 1.15 : 1);
          this.vy = Math.sin(a) * sp * (this.flying ? 1.15 : 1);
        } else if (this.timer <= 0) {
          this.timer = rand(1, 2.4);
          if (Math.random() < 0.35 && homeD < 70) {
            this.vx = 0;
            this.vy = 0;
          } else {
            const a = pickDir();
            this.vx = Math.cos(a) * sp * 0.7;
            this.vy = Math.sin(a) * sp * 0.7;
          }
        }
        w.move(this, this.vx * dt, this.vy * dt, this.flying);
        if (this.flying) this.z = 9 + Math.sin(this.t * 5) * 2;
        break;
      }
      default:
        break;
    }
    if (Math.abs(this.vx) > 1) this.face = this.vx > 0 ? 'right' : 'left';

    if (!p.dead && p.invT <= 0) {
      const pb = { x: p.x - p.hw, y: p.y - p.hh * 2, w: p.hw * 2, h: p.hh * 2 };
      if (rectsOverlap(this.box(), pb)) {
        p.hurt(this.atk, this.x, this.y);
        // nach einem Treffer kurz zurückweichen statt weiter zu drängeln
        this.kbx = (-dx / d) * 70;
        this.kby = (-dy / d) * 70;
        this.stunT = 0.6;
        this.state = 'rest';
        this.timer = 0.6;
        this.z = 0;
      }
    }
    return !this.dead;
  }

  hurt(game, dmg, sx, sy, kb = 1, spell = null, crit = false) {
    if (this.dead) return;
    this.hp -= dmg;
    const w = game.world;
    w.texts.push(new FloatText(this.x, this.y - 18 - this.z, crit ? `${dmg}!` : String(dmg), crit ? '#ffe14d' : '#ffffff', crit));
    const d = Math.hypot(this.x - sx, this.y - sy) || 1;
    this.kbx = ((this.x - sx) / d) * 110 * kb;
    this.kby = ((this.y - sy) / d) * 110 * kb;
    this.stunT = 0.28;
    this.flashT = 0.14;
    game.sound.play('hit');
    burst(w, this.x, this.y - 8, 5, ['#ffffff', '#fff6a0'], { speed: 50, life: 0.25 });
    if (this.hp <= 0) this.die(game);
  }

  die(game) {
    this.dead = true;
    const w = game.world;
    burst(w, this.x, this.y - 6, 16, ['#ffffff', '#e8e8f0', '#b8b8c8'], { speed: 45, life: 0.6, up: 15 });
    game.sound.play('enemyDie');
    game.gainXp(this.def.xp);
    const [a, b] = this.def.coins;
    w.drops.push(new Drop('coin', this.x, this.y, randInt(a, b)));
    if (Math.random() < 0.18) w.drops.push(new Drop('heart', this.x + 4, this.y));
  }

  sprite() {
    switch (this.type) {
      case 'hoppel': {
        if (this.state === 'hop') {
          const prog = 1 - this.timer / 0.42;
          return S.hoppel[prog < 0.15 || prog > 0.85 ? 1 : 2];
        }
        return S.hoppel[this.timer < 0.12 ? 1 : 0];
      }
      case 'pilz':
        return S.pilz[Math.hypot(this.vx, this.vy) > 1 ? Math.floor(this.t * 5) % 2 : 0];
      case 'summsel':
        return (this.face === 'right' ? S.summselR : S.summsel)[Math.floor(this.t * 14) % 2];
      case 'stein':
        return S.stein[Math.hypot(this.vx, this.vy) > 1 ? Math.floor(this.t * 4) % 2 : 0];
      default:
        return S.hoppel[0];
    }
  }

  draw(g, cx, cy) {
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    g.fillStyle = 'rgba(20,30,10,0.28)';
    g.beginPath();
    g.ellipse(x, y, this.hw + 1, 2.5, 0, 0, Math.PI * 2);
    g.fill();
    let spr = this.sprite();
    if (this.flashT > 0) spr = flashOf(spr);
    g.drawImage(spr, Math.round(x - spr.width / 2), Math.round(y - spr.height + 1 - this.z));
  }
}

// ---------------------------------------------------------------------------
class Shockwave {
  constructor(x, y) {
    Object.assign(this, { x, y, t: 0, dur: 0.55, maxR: 64, hit: false });
  }
  update(dt, game) {
    this.t += dt;
    const r = (this.t / this.dur) * this.maxR;
    const p = game.player;
    const d = Math.hypot(p.x - this.x, (p.y - this.y) * 1.6);
    if (!this.hit && Math.abs(d - r) < 9) {
      this.hit = true;
      p.hurt(11, this.x, this.y);
    }
    return this.t < this.dur;
  }
  draw(g, cx, cy) {
    const r = (this.t / this.dur) * this.maxR;
    g.strokeStyle = `rgba(255,236,200,${1 - this.t / this.dur})`;
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(Math.round(this.x - cx), Math.round(this.y - cy), r, r / 1.6, 0, 0, Math.PI * 2);
    g.stroke();
  }
}

export class Gorm extends Enemy {
  constructor(game, x, y) {
    super(game, 'gorm', x, y);
    this.shield = 2;
    this.vulnT = 0;
    this.atkT = 2.4;
    this.awake = false;
    this.windT = 0;
    this.isBoss = true;
  }

  update(dt, game) {
    this.t += dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (!this.awake || this.dead) return !this.dead;
    const w = game.world, p = game.player;
    if (this.vulnT > 0) {
      this.vulnT -= dt;
      if (this.vulnT <= 0 && this.shield === 0) {
        this.shield = 2;
        game.toast.show('Gorm erneuert seinen Kristallschild!');
        game.sound.play('clank');
      }
    }
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    if (this.windT > 0) {
      this.windT -= dt;
      if (this.windT <= 0) {
        w.effects.push(new Shockwave(this.x, this.y));
        game.sound.play('stomp');
        game.shake(6);
      }
    } else if (!p.dead && !game.cutscene) {
      const slow = this.vulnT > 0 ? 0.4 : 1;
      if (d > 34) w.move(this, (dx / d) * this.def.speed * slow * dt, (dy / d) * this.def.speed * slow * dt, false);
      this.atkT -= dt;
      if (this.atkT <= 0) {
        const angry = this.hp < this.maxHp * 0.5;
        if (d < 56) {
          this.windT = 0.7;
        } else {
          const n = angry ? 3 : 1;
          for (let i = 0; i < n; i++) {
            const a = Math.atan2(dy, dx) + (i - (n - 1) / 2) * 0.35;
            w.projectiles.push(new Projectile({
              x: this.x, y: this.y - 30, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, owner: 'enemy', dmg: 8, kind: 'rock', r: 4, life: 3,
            }));
          }
          game.sound.play('throw');
        }
        this.atkT = rand(1.9, 3.0) * (angry ? 0.75 : 1);
      }
    }
    if (!p.dead && p.invT <= 0) {
      const pb = { x: p.x - p.hw, y: p.y - p.hh * 2, w: p.hw * 2, h: p.hh * 2 };
      if (rectsOverlap(this.box(), pb)) p.hurt(this.atk, this.x, this.y);
    }
    return true;
  }

  hurt(game, dmg, sx, sy, kb, spell = null, crit = false) {
    if (this.dead || !this.awake) return;
    const w = game.world;
    if (this.shield > 0) {
      if (!spell) {
        w.texts.push(new FloatText(this.x, this.y - 44, 'Klonk!', '#c8d8ff'));
        game.sound.play('clank');
        burst(w, sx, sy - 8, 4, ['#c8d8ff', '#ffffff'], { speed: 40, life: 0.2 });
        if (!this.clankHint) {
          this.clankHint = true;
          game.toast.show('Der Kristallschild hält dein Schwert ab – benutze Zauber! 🔥⚡', 3200);
        }
        return;
      }
      this.shield--;
      dmg = Math.round(dmg * 0.5);
      burst(w, this.x, this.y - 24, 18, ['#d8a8ff', '#9a50e8', '#ffffff'], { speed: 70, life: 0.6 });
      if (this.shield === 0) {
        this.vulnT = 9;
        game.sound.play('shieldBreak');
        game.banner.show('Schild zerbrochen!<small>Jetzt mit dem Schwert angreifen!</small>', 2200);
      }
    }
    if (this.vulnT > 0 && !spell) dmg = Math.round(dmg * 1.4);
    this.hp -= dmg;
    w.texts.push(new FloatText(this.x, this.y - 44, crit ? `${dmg}!` : String(dmg), crit ? '#ffe14d' : '#ffffff', crit));
    this.flashT = 0.14;
    game.sound.play('hit');
    if (this.hp <= 0) this.die(game);
  }

  die(game) {
    this.dead = true;
    const w = game.world;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        burst(w, this.x + rand(-14, 14), this.y - rand(6, 36), 20, ['#ffffff', '#c4c2d4', '#9a50e8', '#ffb030'], { speed: 80, life: 0.8 });
        game.sound.play('enemyDie');
        game.shake(5);
      }, i * 220);
    }
    game.gainXp(this.def.xp);
    w.drops.push(new Drop('coin', this.x - 10, this.y, 40));
    game.onBossDefeated(this);
  }

  draw(g, cx, cy, time) {
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    g.fillStyle = 'rgba(20,10,30,0.35)';
    g.beginPath();
    g.ellipse(x, y, 18, 5, 0, 0, Math.PI * 2);
    g.fill();
    const shakeX = this.windT > 0 ? Math.round(Math.sin(time * 60) * 1.5) : 0;
    let spr = S.gorm[Math.floor(this.t * 2.5) % 2];
    if (this.flashT > 0 || (this.windT > 0 && Math.floor(time * 12) % 2)) spr = flashOf(spr);
    g.drawImage(spr, x - 23 + shakeX, y - 46);
    if (this.shield > 0) {
      g.globalAlpha = 0.22 + Math.sin(time * 5) * 0.08 + (this.shield === 1 ? -0.08 : 0);
      g.fillStyle = '#b070ff';
      g.beginPath();
      g.ellipse(x, y - 22, 28, 28, 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 0.6;
      g.strokeStyle = '#e0c8ff';
      g.lineWidth = 1;
      g.stroke();
      g.globalAlpha = 1;
    } else if (this.vulnT > 0) {
      for (let i = 0; i < 3; i++) {
        const a = time * 4 + (i * Math.PI * 2) / 3;
        g.fillStyle = '#ffe14d';
        g.fillRect(Math.round(x + Math.cos(a) * 12), Math.round(y - 52 + Math.sin(a) * 3), 2, 2);
      }
    }
  }
}
