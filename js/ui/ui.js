// Gemeinsame Oberflächen-Bausteine: HUD, Dialogfenster, Hinweise, Vorlesen.
import { makeCanvas } from '../util.js';

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// Sprite vergrößert in eine kleine Leinwand zeichnen (für Porträts / Symbole)
export function spriteCanvas(sprite, scale = 3) {
  const c = makeCanvas(sprite.width * scale, sprite.height * scale);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(sprite, 0, 0, c.width, c.height);
  return c;
}

// ---------------------------------------------------------------------------
// Vorlesen (Sprachausgabe des iPads)
export const Speech = {
  ok: typeof window !== 'undefined' && 'speechSynthesis' in window,
  voices: {},
  pickVoice(lang) {
    if (this.voices[lang] !== undefined) return this.voices[lang];
    const all = window.speechSynthesis.getVoices();
    const v = all.find((x) => x.lang === lang) || all.find((x) => x.lang.startsWith(lang.slice(0, 2))) || null;
    if (all.length) this.voices[lang] = v;
    return v;
  },
  say(parts) {
    if (!this.ok) return;
    window.speechSynthesis.cancel();
    for (const p of parts) {
      if (!p || !p.text) continue;
      const u = new SpeechSynthesisUtterance(p.text);
      u.lang = p.lang || 'de-DE';
      const v = this.pickVoice(u.lang);
      if (v) u.voice = v;
      u.rate = p.lang && p.lang.startsWith('en') ? 0.85 : 0.95;
      window.speechSynthesis.speak(u);
    }
  },
  stop() {
    if (this.ok) window.speechSynthesis.cancel();
  },
};

// ---------------------------------------------------------------------------
export class Hud {
  constructor(root) {
    this.root = root;
    this.els = {};
    for (const id of ['name', 'level', 'hp-fill', 'hp-text', 'mp-fill', 'mp-text', 'charge-fill', 'charge-text', 'coins', 'stars', 'funki', 'magic-icon', 'a-icon']) {
      this.els[id] = document.getElementById('hud-' + id) || document.getElementById(id);
    }
    this.cache = {};
  }

  set(key, value, fn) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    fn(value);
  }

  update(g) {
    const p = g.player, s = g.save;
    const E = this.els;
    this.set('name', s.name, (v) => (E.name.textContent = v));
    this.set('level', p.level, (v) => (E.level.textContent = v));
    this.set('hp', `${Math.ceil(p.hp)}/${p.maxHp}`, (v) => {
      E['hp-text'].textContent = v;
      E['hp-fill'].style.width = `${(100 * p.hp) / p.maxHp}%`;
      E['hp-fill'].parentElement.classList.toggle('low', p.hp / p.maxHp < 0.3);
    });
    this.set('mp', `${Math.floor(p.mp)}/${p.maxMp}`, (v) => {
      E['mp-text'].textContent = v;
      E['mp-fill'].style.width = `${(100 * p.mp) / p.maxMp}%`;
    });
    const pct = Math.floor(p.charge * 100);
    this.set('charge', pct, (v) => {
      E['charge-text'].textContent = `${v}%`;
      E['charge-fill'].style.width = `${v}%`;
      E['charge-fill'].parentElement.classList.toggle('full', v >= 100);
    });
    this.set('coins', s.coins, (v) => (E.coins.textContent = v));
    this.set('stars', s.learn.correct, (v) => (E.stars.textContent = v));
    this.set('funki', g.funki.level, (v) => (E.funki.textContent = v));
  }
}

// ---------------------------------------------------------------------------
export class Toast {
  constructor() {
    this.el = document.getElementById('toast');
    this.t = null;
  }
  show(msg, ms = 2200) {
    this.el.innerHTML = esc(msg);
    this.el.classList.add('show');
    clearTimeout(this.t);
    this.t = setTimeout(() => this.el.classList.remove('show'), ms);
  }
}

export class Banner {
  constructor() {
    this.el = document.getElementById('banner');
    this.t = null;
  }
  show(html, ms = 1800) {
    this.el.innerHTML = html;
    this.el.classList.remove('show');
    void this.el.offsetWidth;
    this.el.classList.add('show');
    clearTimeout(this.t);
    this.t = setTimeout(() => this.el.classList.remove('show'), ms);
  }
}

// ---------------------------------------------------------------------------
// Dialogfenster unten am Bildschirm mit Schreibmaschinen-Effekt.
// Text in *Sternchen* wird hervorgehoben.
function segments(text) {
  const out = [];
  const re = /\*([^*]+)\*/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), b: false });
    out.push({ t: m[1], b: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), b: false });
  return out;
}

function renderSegs(segs, n) {
  let html = '', left = n;
  for (const s of segs) {
    if (left <= 0) break;
    const part = esc(s.t.slice(0, left)).replace(/\n/g, '<br>');
    html += s.b ? `<b>${part}</b>` : part;
    left -= s.t.length;
  }
  return html;
}

export class Dialog {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('dialog');
    this.nameEl = document.getElementById('dialog-name');
    this.textEl = document.getElementById('dialog-text');
    this.choicesEl = document.getElementById('dialog-choices');
    this.nextEl = document.getElementById('dialog-next');
    this.portrait = document.getElementById('dialog-portrait');
    this.speakBtn = document.getElementById('dialog-speak');
    this.onAdvance = null;
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      this.onAdvance?.();
    });
    this.speakBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.currentText) Speech.say([{ text: this.currentText.replace(/\*/g, '') }]);
    });
    window.addEventListener('keydown', (e) => {
      if (this.root.classList.contains('hidden')) return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ' || e.code === 'KeyX') {
        e.preventDefault();
        if (!e.repeat) this.onAdvance?.();
      }
    });
  }

  setSpeaker(name, sprite) {
    this.nameEl.textContent = name || '';
    this.nameEl.style.display = name ? '' : 'none';
    this.portrait.innerHTML = '';
    if (sprite) {
      this.portrait.appendChild(spriteCanvas(sprite, 3));
      this.portrait.style.display = '';
    } else {
      this.portrait.style.display = 'none';
    }
  }

  // Zeigt eine Seite und wartet auf Tippen.
  page(text) {
    return new Promise((resolve) => {
      const segs = segments(text);
      const total = segs.reduce((a, s) => a + s.t.length, 0);
      this.currentText = text;
      let n = 0;
      let done = false;
      const opened = performance.now();
      this.nextEl.style.visibility = 'hidden';
      this.textEl.innerHTML = '';
      if (this.game.settings.autoSpeak) Speech.say([{ text: text.replace(/\*/g, '') }]);
      const timer = setInterval(() => {
        n += 2;
        if (n % 6 === 0) this.game.sound.play('blip');
        if (n >= total) finishTyping();
        else this.textEl.innerHTML = renderSegs(segs, n);
      }, 28);
      const finishTyping = () => {
        clearInterval(timer);
        n = total;
        this.textEl.innerHTML = renderSegs(segs, total);
        this.nextEl.style.visibility = 'visible';
        done = true;
      };
      this.onAdvance = () => {
        if (performance.now() - opened < 180) return;
        if (!done) finishTyping();
        else {
          this.onAdvance = null;
          resolve();
        }
      };
    });
  }

  async show(name, pages, { sprite, choices } = {}) {
    if (!Array.isArray(pages)) pages = [pages];
    this.game.openModal('dialog');
    this.root.classList.remove('hidden');
    this.choicesEl.innerHTML = '';
    this.setSpeaker(name, sprite);
    let result;
    try {
      for (let i = 0; i < pages.length; i++) {
        const last = i === pages.length - 1;
        if (last && choices) {
          result = await this.askChoice(pages[i], choices);
        } else {
          await this.page(pages[i]);
        }
      }
    } finally {
      Speech.stop();
      this.root.classList.add('hidden');
      this.choicesEl.innerHTML = '';
      this.game.closeModal('dialog');
    }
    return result;
  }

  askChoice(text, choices) {
    return new Promise((resolve) => {
      this.textEl.innerHTML = renderSegs(segments(text), text.length * 2);
      this.currentText = text;
      if (this.game.settings.autoSpeak) Speech.say([{ text: text.replace(/\*/g, '') }]);
      this.nextEl.style.visibility = 'hidden';
      this.onAdvance = null;
      const opened = performance.now();
      const btns = choices.map((c, i) => {
        const b = el('button', 'choice', esc(c));
        b.addEventListener('click', () => {
          if (performance.now() - opened < 250) return;
          this.game.sound.play('menu');
          window.removeEventListener('keydown', onKey, true);
          resolve(i);
        });
        this.choicesEl.appendChild(b);
        return b;
      });
      let sel = 0;
      const mark = () => btns.forEach((b, i) => b.classList.toggle('sel', i === sel));
      const onKey = (e) => {
        if (e.code === 'ArrowDown' || e.code === 'KeyS') { sel = (sel + 1) % btns.length; mark(); e.preventDefault(); }
        else if (e.code === 'ArrowUp' || e.code === 'KeyW') { sel = (sel + btns.length - 1) % btns.length; mark(); e.preventDefault(); }
        else if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) {
          e.preventDefault();
          e.stopImmediatePropagation();
          window.removeEventListener('keydown', onKey, true);
          this.game.sound.play('menu');
          resolve(sel);
        }
      };
      window.addEventListener('keydown', onKey, true);
      mark();
    });
  }
}
