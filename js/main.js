// Drachen-Hüter – Hauptprogramm: Spielschleife, Kamera, Zauber, Kartenwechsel.
import { TILE, clamp, makeCanvas, sleep, rand } from './util.js';
import { buildSprites } from './gfx/sprites.js';
import { buildProps } from './gfx/props.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { loadSettings, loadSave, writeSave } from './save.js';
import { World } from './world/world.js';
import { Player } from './entities/player.js';
import { Funki } from './entities/funki.js';
import { Npc } from './entities/npc.js';
import { FloatText, Drop, Particle, burst } from './entities/effects.js';
import { Hud, Toast, Banner, Dialog } from './ui/ui.js';
import { QuizUI } from './ui/quiz.js';
import { RingMenu } from './ui/ring.js';
import { Screens } from './ui/screens.js';
import { Story } from './story.js';
import { Tutor, newLearnState } from './learn/tutor.js';
import { SPELLS, ITEMS, xpToNext, funkiLevel } from './data.js';
import { MAPS } from './world/maps.js';

function newSave(name) {
  return {
    version: 1, name, map: 'dorf', x: null, y: null, dir: 'down',
    level: 1, xp: 0, hp: null, mp: null, coins: 0,
    items: { candy: 1, potion: 0 }, spells: [], quickSpell: 'fire',
    flags: {}, opened: {}, learn: newLearnState(),
    respawn: { map: 'dorf', x: 6.5 * TILE, y: 15 * TILE },
    playTime: 0, created: Date.now(),
  };
}

class Game {
  constructor() {
    this.app = document.getElementById('app');
    this.canvas = document.getElementById('screen');
    this.ctx = this.canvas.getContext('2d');
    this.buf = makeCanvas(320, 240);
    this.bctx = this.buf.getContext('2d');
    this.cam = { x: 0, y: 0, w: 320, h: 240 };
    this.settings = loadSettings();
    this.sound = new Sound();
    this.applySoundSettings();
    this.input = new Input(this.app);
    this.input.onAnyInput = (kind) => this.setInputMode(kind);
    this.hud = new Hud();
    this.toast = new Toast();
    this.banner = new Banner();
    this.dialog = new Dialog(this);
    this.quiz = new QuizUI(this);
    this.ring = new RingMenu(this);
    this.screens = new Screens(this);
    this.story = new Story(this);
    this.modals = new Map();
    this.scriptDepth = 0;
    this.transitioning = false;
    this.state = 'title';
    this.time = 0;
    this.hitStop = 0;
    this.shakeT = 0;
    this.shakeMag = 0;
    this.flash = 0;
    this.fade = 1;
    this.fadeTarget = 0;
    this.save = null;
    this.player = null;
    this.funki = null;
    this.world = null;
    this.lastA = 0;

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
    const unlock = () => this.sound.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('touchend', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'play' && !this.scriptDepth && !this.player?.dead) this.saveGame();
    });
    this.resize();
  }

  // --------------------------------------------------------------- Bildschirm
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = window.innerWidth, h = window.innerHeight;
    const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
    this.canvas.width = cw;
    this.canvas.height = ch;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.dpr = dpr;
    // Die kürzere Bildschirmseite zeigt etwa 15 Kacheln – egal ob quer oder hochkant
    this.scale = Math.max(1, Math.floor(Math.min(cw, ch) / 248));
    this.buf.width = Math.ceil(cw / this.scale);
    this.buf.height = Math.ceil(ch / this.scale);
    this.cam.w = this.buf.width;
    this.cam.h = this.buf.height;
    if (this.player) this.updateCamera(0, true);
  }

  setInputMode(kind) {
    if (this.inputMode === kind) return;
    this.inputMode = kind;
    this.app.classList.toggle('keyboard', kind === 'key');
  }

  applySoundSettings() {
    this.sound.sfxOn = this.settings.sfx;
    this.sound.setMusic(this.settings.music);
  }

  updateUiVisibility() {
    const playing = this.state === 'play';
    const busy = this.modals.size > 0 || this.scriptDepth > 0;
    this.app.classList.toggle('playing', playing);
    this.app.classList.toggle('busy', busy);
  }

  openModal(name) {
    this.modals.set(name, (this.modals.get(name) || 0) + 1);
    this.input.clear();
    this.updateUiVisibility();
  }

  closeModal(name) {
    const n = (this.modals.get(name) || 0) - 1;
    if (n > 0) this.modals.set(name, n);
    else this.modals.delete(name);
    this.input.clear();
    this.updateUiVisibility();
  }

  get cutscene() {
    return this.scriptDepth > 0;
  }

  get paused() {
    return this.modals.size > 0 || this.scriptDepth > 0 || this.transitioning;
  }

  // ------------------------------------------------------------ Hilfen für Skripte
  async run(fn) {
    this.scriptDepth++;
    this.updateUiVisibility();
    try {
      await fn();
    } catch (e) {
      console.error(e);
    } finally {
      this.scriptDepth--;
      this.input.clear();
      this.updateUiVisibility();
    }
  }

  say(name, pages, sprite) {
    return this.dialog.show(name, pages, { sprite });
  }

  choose(name, text, choices, sprite) {
    return this.dialog.show(name, [text], { sprite, choices });
  }

  wait(ms) {
    return sleep(ms);
  }

  shake(mag) {
    this.shakeT = 0.3;
    this.shakeMag = Math.max(this.shakeMag, mag);
  }

  // ------------------------------------------------------------------ Start
  async boot() {
    buildSprites();
    buildProps();
    this.showTitle();
    let last = performance.now();
    const seen = new Set();
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      try {
        this.update(dt);
        this.render();
      } catch (e) {
        // ein Fehler soll nie das ganze Spiel einfrieren
        if (!seen.has(e.message)) {
          seen.add(e.message);
          console.error(e);
        }
      }
    };
    requestAnimationFrame(loop);
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  showTitle() {
    this.state = 'title';
    const saved = loadSave();
    this.save = saved || newSave('');
    this.player = null;
    this.funki = null;
    this.world = new World(this, 'dorf');
    this.cam.x = 0;
    this.cam.y = 4 * TILE;
    this.titlePan = 0;
    this.fadeTarget = 0;
    this.updateUiVisibility();
    this.sound.music('dorf');
    this.screens.showTitle(saved);
  }

  backToTitle(skipSave = false) {
    if (this.state === 'play' && !skipSave) this.saveGame();
    this.screens.root.innerHTML = '';
    this.modals.clear();
    this.showTitle();
  }

  continueGame() {
    this.save = loadSave() || newSave('Mika');
    this.enterGame();
    this.toast.show(`Willkommen zurück, ${this.save.name}! 🐉`);
  }

  startNewGame(name) {
    this.save = newSave(name);
    writeSave(this.save);
    this.enterGame();
    this.run(async () => {
      await this.wait(700);
      await this.say(null, [
        'Drachenwinkel – ein kleines Dorf, in dem Menschen und Drachen beste Freunde sind.',
        `Du bist *${name}*, ein junger Drachenhüter. Dein kleiner Drache *Funki* schläft noch tief in seinem Körbchen.`,
        'Doch heute Morgen ist etwas Seltsames passiert … Die große Drachenmutter *Aurelia* wacht nicht mehr auf!',
        '*Professor Uhu* hat nach dir gerufen. Sein blauer Turm steht links oben im Dorf.',
      ]);
      await this.say(null, ['*Steuerung:* Links auf dem Bildschirm wischen = laufen. *⚔️* = angreifen oder sprechen. *◎* = Ring-Menü.']);
    });
  }

  enterGame() {
    this.state = 'play';
    this.player = new Player(this, this.save);
    this.funki = new Funki(this);
    this.tutor = new Tutor(this.save.learn, () => this.settings);
    const s = this.save;
    const start = s.x == null;
    this.loadWorld(s.map, s.x, s.y, s.dir);
    if (start) this.player.dir = 'up';
    this.updateMagicButton();
    this.updateUiVisibility();
    this.fade = 1;
    this.fadeTarget = 0;
  }

  loadWorld(id, x, y, dir) {
    this.world = new World(this, MAPS[id] ? id : 'dorf');
    const w = this.world;
    const p = this.player;
    if (x == null || y == null) {
      x = w.start ? w.start.x : w.pw / 2;
      y = w.start ? w.start.y : w.ph / 2;
    }
    p.x = x;
    p.y = y;
    if (!w.boxFree(p.x, p.y, p, false)) {
      const [tx, ty] = w.freeTileNear(Math.floor(x / TILE), Math.floor((y - 1) / TILE));
      p.x = (tx + 0.5) * TILE;
      p.y = (ty + 1) * TILE - 2;
    }
    if (dir) p.dir = dir;
    this.funki.place(p.x, p.y);
    this.firedTriggers = new Set();
    this.updateCamera(0, true);
    this.sound.music(w.boss && this.world.boss.awake ? 'boss' : w.def.music);
  }

  async changeMap(id, x, y, dir) {
    this.transitioning = true;
    this.fadeTarget = 1;
    await sleep(260);
    this.loadWorld(id, x, y, dir);
    this.save.map = id;
    if (!this.player.dead) this.saveGame();
    this.fadeTarget = 0;
    await sleep(120);
    this.transitioning = false;
    this.banner.show(`<small>${MAPS[id].name}</small>`, 1500);
  }

  saveGame(showToast = false) {
    if (this.state !== 'play') return;
    const s = this.save, p = this.player;
    s.map = this.world.id;
    s.x = Math.round(p.x);
    s.y = Math.round(p.y);
    s.dir = p.dir;
    s.level = p.level;
    s.hp = Math.max(1, Math.round(p.hp));
    s.mp = Math.round(p.mp);
    const ok = writeSave(s);
    if (showToast) this.toast.show(ok ? 'Spiel gespeichert 💾' : 'Speichern hat nicht geklappt.');
  }

  // --------------------------------------------------------------- Lernen
  async askQuestion(opts) {
    const q = this.tutor.next();
    const lvBefore = funkiLevel(this.save.learn.correct);
    const r = await this.quiz.ask(q, {
      ...opts,
      onResult: (correct) => {
        this.tutor.record(q, correct);
        if (!correct) {
          this.sound.play('wrong');
          return '';
        }
        this.sound.play('correct');
        const st = this.save.learn.streak;
        return `<span class="stars">+1 ⭐</span>${st >= 2 ? ` <span class="streak">${st} richtig in Folge! 🔥</span>` : ''}`;
      },
    });
    const lvAfter = funkiLevel(this.save.learn.correct);
    if (lvAfter > lvBefore) {
      this.sound.play('levelup');
      this.banner.show(`Funki ist gewachsen! 🐉<small>Funki ist jetzt auf Stufe ${lvAfter}</small>`, 2400);
      if (this.funki) burst(this.world, this.funki.x, this.funki.y - this.funki.z - 6, 20, ['#ffe14d', '#ffffff', '#ff9a3c'], { speed: 60, life: 0.7 });
      if (lvAfter >= 3 && !this.save.spells.includes('bolt')) {
        await sleep(1600);
        this.learnSpell('bolt');
      }
    }
    return r;
  }

  learnSpell(id) {
    if (this.save.spells.includes(id)) return;
    this.save.spells.push(id);
    const sp = SPELLS[id];
    this.sound.play('levelup');
    this.banner.show(`Neuer Zauber: ${sp.icon} ${sp.name}<small>${sp.desc}</small>`, 2800);
    if (this.save.spells.length === 1) this.save.quickSpell = id;
    this.updateMagicButton();
  }

  updateMagicButton() {
    const icon = document.getElementById('magic-icon');
    const has = this.save.spells.length > 0;
    if (has && !this.save.spells.includes(this.save.quickSpell)) this.save.quickSpell = this.save.spells[0];
    icon.textContent = has ? SPELLS[this.save.quickSpell].icon : '✨';
    document.getElementById('btn-magic').classList.toggle('off', !has);
  }

  async castSpell(id) {
    if (this.paused || this.player.dead) return;
    const s = this.save, p = this.player;
    if (!s.spells.length) {
      this.toast.show('Du kennst noch keinen Zauber. Sprich mit Professor Uhu! 🦉');
      return;
    }
    if (!s.spells.includes(id)) id = s.spells[0];
    const sp = SPELLS[id];
    if (p.mp < sp.mp) {
      this.sound.play('wrong');
      this.toast.show('Nicht genug Mana! MP füllen sich langsam auf – oder trink einen Zaubertrank 🧪');
      return;
    }
    if (sp.target && !this.world.enemiesInView().length) {
      this.toast.show('Kein Gegner in Sicht.');
      return;
    }
    if (id === 'heal' && p.hp >= p.maxHp) {
      this.toast.show('Du bist schon ganz gesund! 💚');
      return;
    }
    s.quickSpell = id;
    this.updateMagicButton();
    await this.run(async () => {
      const r = await this.askQuestion({ title: `${sp.icon} ${sp.name}`, subtitle: 'Antworte richtig, um den Zauber zu wirken!' });
      if (r.cancelled) return;
      if (!r.correct) {
        this.toast.show('Der Zauber ist verpufft … Beim nächsten Mal klappt es!');
        return;
      }
      p.mp -= sp.mp;
      const power = 1 + Math.min(0.5, Math.max(0, s.learn.streak - 1) * 0.1);
      this.pendingSpell = { id, power };
    });
    if (this.pendingSpell) {
      const { id: sid, power } = this.pendingSpell;
      this.pendingSpell = null;
      this.spellEffect(sid, power);
    }
  }

  spellEffect(id, power) {
    const p = this.player, w = this.world, fl = this.funki.level;
    if (power > 1.05) w.texts.push(new FloatText(p.x, p.y - 34, `Kraft ×${power.toFixed(1)}`, '#ffe14d'));
    if (id === 'fire') {
      const targets = w.enemiesInView();
      if (!targets.length) return;
      targets.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      this.funki.castT = 0.6;
      const dmg = Math.round((12 + 4 * p.level + 3 * fl) * power);
      this.funki.spit(targets[0], dmg, 'bigfire', 'fire');
    } else if (id === 'heal') {
      const amt = Math.round((25 + 6 * p.level) * power);
      p.hp = Math.min(p.maxHp, p.hp + amt);
      w.texts.push(new FloatText(p.x, p.y - 24, `+${amt}`, '#7dff9a', true));
      this.sound.play('heal');
      for (let i = 0; i < 24; i++) {
        w.particles.push(new Particle(p.x + rand(-10, 10), p.y - rand(0, 20), rand(-6, 6), rand(-40, -15), rand(0.5, 1), ['#7dff9a', '#ffffff', '#c8ffd0'][i % 3], 1));
      }
    } else if (id === 'bolt') {
      const targets = w.enemiesInView();
      const dmg = Math.round((10 + 3 * p.level + 2 * fl) * power);
      this.flash = 0.25;
      this.sound.play('bolt');
      this.shake(4);
      for (const e of targets) {
        w.effects.push(new Bolt(e.x, e.y - 8, this.cam.y));
        e.hurt(this, dmg, e.x, e.y - 20, 0.5, 'bolt');
      }
    }
  }

  useItem(id) {
    const s = this.save, p = this.player;
    if (!s.items[id]) return;
    if (id === 'candy') {
      if (p.hp >= p.maxHp) {
        this.toast.show('Du bist schon ganz gesund!');
        return;
      }
      p.hp = Math.min(p.maxHp, p.hp + 40);
      this.world.texts.push(new FloatText(p.x, p.y - 24, '+40', '#7dff9a'));
    } else if (id === 'potion') {
      if (p.mp >= p.maxMp) {
        this.toast.show('Deine MP sind schon voll!');
        return;
      }
      p.mp = p.maxMp;
      this.world.texts.push(new FloatText(p.x, p.y - 24, 'MP voll!', '#8cc8ff'));
    }
    s.items[id]--;
    this.sound.play('heal');
    this.toast.show(`${ITEMS[id].icon} ${ITEMS[id].name} benutzt.`);
  }

  healFull() {
    const p = this.player;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  }

  gainXp(n) {
    const s = this.save, p = this.player;
    s.xp += n;
    let up = false;
    while (s.xp >= xpToNext(p.level)) {
      s.xp -= xpToNext(p.level);
      p.level++;
      up = true;
    }
    if (up) {
      s.level = p.level;
      p.applyStats();
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      this.sound.play('levelup');
      this.banner.show(`Stufe ${p.level}! ⬆️<small>Mehr Lebenspunkte und mehr Kraft</small>`, 2200);
      burst(this.world, p.x, p.y - 10, 24, ['#ffe14d', '#ffffff'], { speed: 70, life: 0.8 });
    }
  }

  collect(drop) {
    const w = this.world, p = this.player;
    if (drop.kind === 'coin') {
      this.save.coins += drop.value;
      this.sound.play('coin');
      w.texts.push(new FloatText(drop.x, drop.y - 12, `+${drop.value} 🪙`, '#ffe14d'));
    } else if (drop.kind === 'heart') {
      p.hp = Math.min(p.maxHp, p.hp + 10);
      this.sound.play('heart');
      w.texts.push(new FloatText(drop.x, drop.y - 12, '+10', '#7dff9a'));
    } else if (drop.kind === 'crystal') {
      this.run(() => this.story.crystal());
    }
  }

  interact(target) {
    if (this.scriptDepth) return;
    this.run(async () => {
      if (target instanceof Npc) {
        target.faceTo(this.player.x, this.player.y);
        await this.story.talk(target);
      } else {
        await this.story.use(target);
      }
    });
  }

  onPlayerDown() {
    this.sound.stopMusic();
    this.run(() => this.story.playerDown());
  }

  onBossDefeated(boss) {
    this.save.flags.bossDone = true;
    const w = this.world;
    setTimeout(() => {
      if (this.world !== w) return;
      w.drops.push(Object.assign(new Drop('crystal', boss.x, boss.y), { vz: 90 }));
    }, 1300);
    this.story.bossDefeated();
    this.saveGame();
  }

  playerScreenPos() {
    const p = this.player;
    if (!p) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const k = this.scale / this.dpr;
    return { x: (p.x - this.cam.x) * k, y: (p.y - 12 - this.cam.y) * k };
  }

  // ------------------------------------------------------------------ Ablauf
  update(dt) {
    this.time += dt;
    this.fade += (this.fadeTarget - this.fade) * Math.min(1, dt * 10);
    if (this.flash > 0) this.flash -= dt;
    if (this.shakeT > 0) this.shakeT -= dt;
    else this.shakeMag = 0;

    if (this.state === 'title') {
      // langsamer Kameraflug über das Dorf
      const w = this.world;
      this.titlePan += dt * 0.12;
      this.cam.x = clamp((w.pw - this.cam.w) * (0.5 + 0.5 * Math.sin(this.titlePan)), Math.min(0, (w.pw - this.cam.w) / 2), Math.max(0, w.pw - this.cam.w));
      this.cam.y = clamp(6 * TILE, 0, Math.max(0, w.ph - this.cam.h));
      w.particles = w.particles.filter((p) => p.update(dt));
      w.updateAmbient(dt);
      return;
    }
    if (this.state !== 'play') return;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }
    const p = this.player, w = this.world, inp = this.input;
    if (!this.paused) {
      this.save.playTime += dt;
      if (inp.consume('ring') || inp.consume('back')) this.ring.open();
      else if (inp.consume('magic')) this.castSpell(this.save.quickSpell);
      else if (inp.consume('a')) p.action();
      if (!this.paused) {
        p.update(dt);
        if (this.save.flags.metUhu) this.funki.update(dt);
        w.update(dt);
        this.checkZones();
      }
    }
    this.updateCamera(dt, false);
    this.hud.update(this);
    if (this.time - this.lastA > 0.12) {
      this.lastA = this.time;
      const near = !this.paused && !p.dead && w.findInteractable(p);
      const icon = near ? '💬' : '⚔️';
      if (this.aIcon !== icon) {
        this.aIcon = icon;
        document.getElementById('a-icon').textContent = icon;
      }
    }
  }

  checkZones() {
    const p = this.player, w = this.world;
    if (p.dead) return;
    const inside = (r) => p.x >= r.x && p.x < r.x + r.w && p.y - 2 >= r.y && p.y - 2 < r.y + r.h;
    for (const ex of w.exits) {
      if (!inside(ex.rect)) continue;
      if (ex.need && !this.save.flags[ex.need]) this.run(() => this.story.blockedExit());
      else this.changeMap(ex.to, ex.x * TILE, ex.y * TILE, ex.dir);
      return;
    }
    for (const t of w.triggers) {
      if (this.firedTriggers.has(t.id) || !inside(t.rect)) continue;
      this.firedTriggers.add(t.id);
      this.run(() => this.story.trigger(t));
    }
  }

  updateCamera(dt, snap) {
    const p = this.player, c = this.cam, w = this.world;
    if (!p || !w) return;
    let tx = p.x - c.w / 2, ty = p.y - 12 - c.h / 2;
    tx = w.pw > c.w ? clamp(tx, 0, w.pw - c.w) : (w.pw - c.w) / 2;
    ty = w.ph > c.h ? clamp(ty, 0, w.ph - c.h) : (w.ph - c.h) / 2;
    if (snap) {
      c.x = tx;
      c.y = ty;
    } else {
      const k = Math.min(1, dt * 7);
      c.x += (tx - c.x) * k;
      c.y += (ty - c.y) * k;
    }
  }

  // ------------------------------------------------------------------ Zeichnen
  render() {
    const g = this.bctx, B = this.buf;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#0c0818';
    g.fillRect(0, 0, B.width, B.height);
    const cam = { ...this.cam };
    if (this.shakeT > 0) {
      cam.x += Math.round(rand(-1, 1) * this.shakeMag);
      cam.y += Math.round(rand(-1, 1) * this.shakeMag);
    }
    if (this.world) this.world.render(g, cam, this.time);

    const ctx = this.ctx, s = this.scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(B, 0, 0, B.width * s, B.height * s);

    // Scharfe Texte über dem Pixelbild
    if (this.world) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (const t of this.world.texts) {
        const k = t.t / t.dur;
        const rise = t.big ? 22 : 16;
        const x = (t.x - cam.x) * s, y = (t.y - cam.y - Math.min(1, k * 3) * rise) * s;
        const size = (t.big ? 10 : 8) * s * (k < 0.1 ? 0.6 + k * 4 : 1);
        ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) * 4 : 1;
        ctx.font = `900 ${Math.round(size)}px "Avenir Next", "Trebuchet MS", system-ui, sans-serif`;
        ctx.lineWidth = Math.max(2, s * 1.4);
        ctx.strokeStyle = '#1c1424';
        ctx.strokeText(t.text, x, y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, x, y);
      }
      ctx.globalAlpha = 1;
      this.renderBossBar(ctx);
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,240,${Math.min(0.7, this.flash * 3)})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.fade > 0.01) {
      ctx.fillStyle = `rgba(8,4,20,${this.fade})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  renderBossBar(ctx) {
    const b = this.world.boss;
    if (!b || !b.awake || b.dead) return;
    const d = this.dpr;
    const w = Math.min(this.canvas.width * 0.5, 420 * d), h = 12 * d;
    const x = (this.canvas.width - w) / 2, y = (this.app.classList.contains('keyboard') ? 18 : 70) * d;
    ctx.fillStyle = 'rgba(16,10,40,0.85)';
    ctx.fillRect(x - 4 * d, y - 22 * d, w + 8 * d, h + 28 * d);
    ctx.font = `700 ${Math.round(12 * d)}px "Avenir Next", system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`${b.def.name}${b.shield ? '  🛡️'.repeat(b.shield) : b.vulnT > 0 ? '  💫' : ''}`, x, y - 10 * d);
    ctx.fillStyle = '#3a2a50';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#e04060';
    ctx.fillRect(x, y, (w * Math.max(0, b.hp)) / b.maxHp, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, y, (w * Math.max(0, b.hp)) / b.maxHp, h / 3);
  }
}

// Blitz-Effekt vom oberen Bildrand bis zum Gegner
class Bolt {
  constructor(x, y, camY) {
    this.x = x;
    this.y = y;
    this.top = camY - 10;
    this.t = 0;
    this.seed = Math.random() * 1000;
  }
  update(dt) {
    this.t += dt;
    return this.t < 0.35;
  }
  draw(g, cx, cy) {
    const segs = 8;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const k = i / segs;
      const jitter = i === 0 || i === segs ? 0 : Math.sin(this.seed + i * 7.3 + this.t * 40) * 6;
      pts.push([this.x + jitter - cx, this.top + (this.y - this.top) * k - cy]);
    }
    for (const [col, lw] of [['rgba(160,200,255,0.6)', 4], ['#ffffff', 2]]) {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
      g.stroke();
    }
  }
}

const game = new Game();
window.__game = game;
game.boot();
