// Ring-Menü: Symbole kreisen um die Spielfigur. Antippen wählt aus, nochmal antippen benutzt.
import { el, esc } from './ui.js';
import { SPELLS, ITEMS } from '../data.js';

export class RingMenu {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ring');
    this.isOpen = false;
    this.ringIdx = 0;
    this.sel = [0, 0, 0];
  }

  rings() {
    const g = this.game, s = g.save;
    const magic = s.spells.map((id) => {
      const sp = SPELLS[id];
      return {
        icon: sp.icon, label: sp.name, desc: `${sp.mp} MP · ${sp.desc}`, enabled: g.player.mp >= sp.mp,
        run: () => g.castSpell(id),
      };
    });
    if (!magic.length) magic.push({ icon: '❔', label: 'Noch keine Zauber', desc: 'Sprich mit Professor Uhu!', enabled: false });
    const bag = Object.entries(ITEMS).map(([id, it]) => ({
      icon: it.icon, label: `${it.name} ×${s.items[id] || 0}`, desc: it.desc, enabled: (s.items[id] || 0) > 0,
      run: () => g.useItem(id),
    }));
    const sys = [
      { icon: '📖', label: 'Lernbuch', desc: 'Sieh dir an, was du schon kannst', enabled: true, run: () => g.screens.showBook() },
      { icon: '⚙️', label: 'Einstellungen', desc: 'Fächer, Klasse, Ton', enabled: true, run: () => g.screens.showSettings() },
      { icon: '💾', label: 'Speichern', desc: 'Spielstand sichern', enabled: true, run: () => g.saveGame(true) },
      { icon: '🏠', label: 'Titelbild', desc: 'Zurück zum Startbildschirm', enabled: true, run: () => g.backToTitle() },
    ];
    return [
      { name: 'Magie', items: magic },
      { name: 'Taschen', items: bag },
      { name: 'System', items: sys },
    ];
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.game.openModal('ring');
    this.game.sound.play('open');
    this.root.classList.remove('hidden');
    this.openedAt = performance.now();
    this.build();
    this.onKey = (e) => this.key(e);
    window.addEventListener('keydown', this.onKey, true);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    window.removeEventListener('keydown', this.onKey, true);
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
    this.game.sound.play('close');
    this.game.closeModal('ring');
  }

  build() {
    const data = this.rings();
    const ring = data[this.ringIdx];
    const sel = (this.sel[this.ringIdx] = Math.min(this.sel[this.ringIdx], ring.items.length - 1));
    this.root.innerHTML = '';
    const bg = el('div', 'ring-bg');
    bg.addEventListener('click', () => this.close());
    this.root.appendChild(bg);

    const { x, y } = this.game.playerScreenPos();
    const W = this.root.clientWidth, H = this.root.clientHeight;
    const R = Math.min(118, Math.max(84, Math.min(W, H) * 0.17));
    const margin = Math.min(W / 2, Math.max(R + 40, 200));
    const cx = Math.max(margin, Math.min(W - margin, x));
    const cy = Math.max(R + 120, Math.min(H - R - 40, y));

    const tabs = el('div', 'ring-tabs');
    data.forEach((r, i) => {
      const t = el('button', 'ring-tab' + (i === this.ringIdx ? ' sel' : ''), esc(r.name));
      t.addEventListener('click', () => this.switchRing(i));
      tabs.appendChild(t);
    });
    tabs.style.left = `${cx}px`;
    tabs.style.top = `${cy - R - 112}px`;
    this.root.appendChild(tabs);

    const item = ring.items[sel];
    const label = el('div', 'ring-label window', `<b>${esc(item.label)}</b><small>${esc(item.desc)}</small>`);
    label.style.left = `${cx}px`;
    label.style.top = `${cy - R - 64}px`;
    this.root.appendChild(label);

    const n = ring.items.length;
    ring.items.forEach((it, i) => {
      const a = ((i - sel) / n) * Math.PI * 2 - Math.PI / 2;
      const b = el('button', 'ring-item' + (i === sel ? ' sel' : '') + (it.enabled ? '' : ' off'), it.icon);
      b.style.left = `${cx + Math.cos(a) * R}px`;
      b.style.top = `${cy + Math.sin(a) * R}px`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (performance.now() - this.openedAt < 250) return;
        if (i === this.sel[this.ringIdx]) this.activate();
        else {
          this.sel[this.ringIdx] = i;
          this.game.sound.play('menu');
          this.build();
        }
      });
      this.root.appendChild(b);
    });

    const mk = (txt, cls, fn, px, py) => {
      const b = el('button', 'ring-arrow ' + cls, txt);
      b.style.left = `${px}px`;
      b.style.top = `${py}px`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        fn();
      });
      this.root.appendChild(b);
    };
    if (n > 1) {
      mk('◀', 'l', () => this.rotate(-1), cx - R - 52, cy);
      mk('▶', 'r', () => this.rotate(1), cx + R + 52, cy);
    }
    mk('OK', 'ok', () => this.activate(), cx, cy + R + 50);
  }

  rotate(d) {
    const n = this.rings()[this.ringIdx].items.length;
    this.sel[this.ringIdx] = (this.sel[this.ringIdx] + d + n) % n;
    this.game.sound.play('menu');
    this.build();
  }

  switchRing(i) {
    this.ringIdx = (i + 3) % 3;
    this.game.sound.play('menu');
    this.build();
  }

  activate() {
    const ring = this.rings()[this.ringIdx];
    const it = ring.items[this.sel[this.ringIdx]];
    if (!it.run) return;
    if (!it.enabled) {
      this.game.sound.play('wrong');
      this.game.toast.show(this.ringIdx === 0 ? 'Nicht genug Mana (MP)!' : 'Davon hast du nichts mehr.');
      return;
    }
    this.close();
    it.run();
  }

  key(e) {
    const c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA') this.rotate(-1);
    else if (c === 'ArrowRight' || c === 'KeyD') this.rotate(1);
    else if (c === 'ArrowUp' || c === 'KeyW') this.switchRing(this.ringIdx - 1);
    else if (c === 'ArrowDown' || c === 'KeyS') this.switchRing(this.ringIdx + 1);
    else if ((c === 'Enter' || c === 'Space' || c === 'KeyJ') && !e.repeat) this.activate();
    else if (c === 'Escape' || c === 'KeyI' || c === 'KeyM') this.close();
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}
