// Vollbild-Fenster: Titel, Neues Spiel, Einstellungen, Lernbuch, Abspann.
import { el, esc, spriteCanvas } from './ui.js';
import { S } from '../gfx/sprites.js';
import { TOPICS, SUBJECTS, TOPIC_BY_ID, topicsForGrade } from '../learn/questions.js';
import { Tutor } from '../learn/tutor.js';
import { writeSettings, clearSave } from '../save.js';
import { funkiLevel } from '../data.js';

export class Screens {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screens');
  }

  // Öffnet ein Fenster und liefert ein Promise, das beim Schließen erfüllt wird.
  open(build, { modal = true, cls = '' } = {}) {
    return new Promise((resolve) => {
      const wrap = el('div', 'screen ' + cls);
      const close = (v) => {
        wrap.remove();
        if (modal) this.game.closeModal('screen');
        resolve(v);
      };
      build(wrap, close);
      this.root.appendChild(wrap);
      if (modal) this.game.openModal('screen');
    });
  }

  // ---------------------------------------------------------------- Titel
  showTitle(saveData) {
    const g = this.game;
    return this.open((wrap, close) => {
      const box = el('div', 'title-box');
      const logo = el('div', 'logo');
      logo.appendChild(spriteCanvas(S.funki[1].right[0], 4));
      logo.appendChild(el('h1', '', 'Drachen-Hüter'));
      logo.appendChild(el('p', 'tagline', 'Ein Abenteuer, bei dem Wissen echte Magie ist'));
      box.appendChild(logo);
      const menu = el('div', 'title-menu');
      if (saveData) {
        const stars = saveData.learn?.correct || 0;
        const b = el('button', 'btn primary big', `▶ Weiterspielen<small>${esc(saveData.name)} · Stufe ${saveData.level} · ⭐ ${stars}</small>`);
        b.addEventListener('click', () => {
          g.sound.unlock();
          close();
          g.continueGame();
        });
        menu.appendChild(b);
      }
      const nb = el('button', 'btn big' + (saveData ? '' : ' primary'), '✨ Neues Spiel');
      nb.addEventListener('click', async () => {
        g.sound.unlock();
        const res = await this.showNewGame(!!saveData);
        if (res) {
          close();
          g.startNewGame(res.name);
        }
      });
      menu.appendChild(nb);
      const sb = el('button', 'btn', '⚙️ Einstellungen');
      sb.addEventListener('click', () => {
        g.sound.unlock();
        this.showSettings({ fromTitle: true });
      });
      menu.appendChild(sb);
      const pb = el('button', 'btn', 'ℹ️ Für Eltern & Lehrkräfte');
      pb.addEventListener('click', () => this.showParents());
      menu.appendChild(pb);
      box.appendChild(menu);
      const standalone = window.navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches;
      if (!standalone) box.appendChild(el('p', 'title-hint', 'Tipp fürs iPad: In Safari auf <b>Teilen</b> → <b>Zum Home-Bildschirm</b> tippen – dann startet das Spiel wie eine App im Vollbild.'));
      wrap.appendChild(box);
    }, { modal: false, cls: 'title-screen' });
  }

  showNewGame(hasSave) {
    const g = this.game;
    return this.open((wrap, close) => {
      const win = el('div', 'window panel narrow');
      win.appendChild(el('h2', '', '✨ Neues Abenteuer'));
      win.appendChild(el('label', 'field-label', 'Wie heißt du?'));
      const input = el('input', 'text-input');
      input.maxLength = 12;
      input.value = 'Mika';
      input.autocomplete = 'off';
      input.spellcheck = false;
      win.appendChild(input);
      win.appendChild(el('label', 'field-label', 'In welche Klasse gehst du?'));
      const grades = el('div', 'chip-row');
      let grade = g.settings.grade || 2;
      const gradeBtns = [1, 2, 3, 4].map((n) => {
        const b = el('button', 'chip big' + (n === grade ? ' on' : ''), `${n}. Klasse`);
        b.addEventListener('click', () => {
          grade = n;
          gradeBtns.forEach((x, i) => x.classList.toggle('on', i + 1 === n));
          g.sound.play('menu');
        });
        grades.appendChild(b);
        return b;
      });
      win.appendChild(grades);
      win.appendChild(el('p', 'small', 'Die Aufgaben passen sich der Klasse an. Unter „Einstellungen“ kannst du die Fächer genau auswählen.'));
      if (hasSave) win.appendChild(el('p', 'warn', '⚠️ Dein alter Spielstand wird dabei überschrieben.'));
      const row = el('div', 'btn-row');
      const back = el('button', 'btn', 'Zurück');
      back.addEventListener('click', () => close(null));
      const go = el('button', 'btn primary', 'Los geht\'s! ▶');
      go.addEventListener('click', () => {
        const name = input.value.trim().slice(0, 12) || 'Mika';
        g.settings.grade = grade;
        g.settings.topics = topicsForGrade(grade);
        writeSettings(g.settings);
        close({ name });
      });
      row.append(back, go);
      win.appendChild(row);
      wrap.appendChild(win);
    });
  }

  // ---------------------------------------------------------- Einstellungen
  showSettings({ fromTitle = false } = {}) {
    const g = this.game;
    const s = g.settings;
    return this.open((wrap, close) => {
      const win = el('div', 'window panel');
      win.appendChild(el('h2', '', '⚙️ Einstellungen'));
      const body = el('div', 'panel-body');
      win.appendChild(body);

      const save = () => writeSettings(s);
      const render = () => {
        body.innerHTML = '';
        body.appendChild(el('h3', '', 'Klasse'));
        const gr = el('div', 'chip-row');
        for (const n of [1, 2, 3, 4]) {
          const b = el('button', 'chip' + (s.grade === n ? ' on' : ''), `${n}. Klasse`);
          b.addEventListener('click', () => {
            s.grade = n;
            s.topics = topicsForGrade(n);
            save();
            g.sound.play('menu');
            render();
          });
          gr.appendChild(b);
        }
        body.appendChild(gr);
        body.appendChild(el('p', 'small', 'Die Klasse wählt passende Themen vor. Darunter kannst du einzelne Themen an- und ausschalten.'));

        for (const [sid, subj] of Object.entries(SUBJECTS)) {
          body.appendChild(el('h3', '', `${subj.icon} ${esc(subj.name)}`));
          const row = el('div', 'chip-row');
          for (const t of TOPICS.filter((x) => x.subject === sid)) {
            const on = s.topics.includes(t.id);
            const b = el('button', 'chip' + (on ? ' on' : ''), `${on ? '✓ ' : ''}${esc(t.name)}<small>Kl. ${t.grades.join('–').replace(/(\d)–.*–(\d)/, '$1–$2')}</small>`);
            b.addEventListener('click', () => {
              if (on) {
                if (s.topics.length === 1) {
                  g.toast.show('Mindestens ein Thema muss an sein.');
                  return;
                }
                s.topics = s.topics.filter((x) => x !== t.id);
              } else s.topics = [...s.topics, t.id];
              save();
              g.sound.play('menu');
              render();
            });
            row.appendChild(b);
          }
          body.appendChild(row);
        }

        if (s.topics.includes('einmaleins') || s.topics.includes('geteilt')) {
          body.appendChild(el('h3', '', '✖️ Einmaleins-Reihen'));
          const row = el('div', 'chip-row');
          for (let n = 1; n <= 10; n++) {
            const on = s.reihen.includes(n);
            const b = el('button', 'chip round' + (on ? ' on' : ''), String(n));
            b.addEventListener('click', () => {
              if (on && s.reihen.length === 1) return;
              s.reihen = on ? s.reihen.filter((x) => x !== n) : [...s.reihen, n].sort((a, b2) => a - b2);
              save();
              g.sound.play('menu');
              render();
            });
            row.appendChild(b);
          }
          body.appendChild(row);
        }

        body.appendChild(el('h3', '', '🎛️ Optionen'));
        const toggles = [
          ['typeAnswers', '⌨️ Matheaufgaben eintippen (statt auswählen)'],
          ['autoSpeak', '🔊 Texte und Fragen automatisch vorlesen'],
          ['music', '🎵 Musik'],
          ['sfx', '🔔 Soundeffekte'],
        ];
        for (const [key, label] of toggles) {
          const b = el('button', 'toggle' + (s[key] ? ' on' : ''), `<span class="switch"></span>${label}`);
          b.addEventListener('click', () => {
            s[key] = !s[key];
            save();
            g.applySoundSettings();
            g.sound.play('menu');
            render();
          });
          body.appendChild(b);
        }
        if (fromTitle) {
          body.appendChild(el('h3', '', '💾 Spielstand'));
          const del = el('button', 'btn danger', '🗑️ Spielstand löschen');
          del.addEventListener('click', async () => {
            if (window.confirm('Spielstand wirklich löschen? Das kann man nicht rückgängig machen.')) {
              clearSave();
              g.toast.show('Spielstand gelöscht.');
              close();
              g.backToTitle(true);
            }
          });
          body.appendChild(del);
        }
      };
      render();
      const done = el('button', 'btn primary', 'Fertig ✓');
      done.addEventListener('click', () => {
        g.sound.play('close');
        close();
      });
      const foot = el('div', 'btn-row');
      foot.appendChild(done);
      win.appendChild(foot);
      wrap.appendChild(win);
    });
  }

  // -------------------------------------------------------------- Lernbuch
  showBook() {
    const g = this.game;
    const L = g.save.learn;
    const tutor = new Tutor(L, () => g.settings);
    return this.open((wrap, close) => {
      const win = el('div', 'window panel');
      win.appendChild(el('h2', '', '📖 Lernbuch'));
      const body = el('div', 'panel-body');
      const pct = L.total ? Math.min(100, Math.round((100 * L.correct) / L.total)) : 0;
      const stats = el('div', 'stat-grid');
      for (const [v, label] of [
        [`⭐ ${L.correct}`, 'richtige Antworten'],
        [`${L.total}`, 'Fragen insgesamt'],
        [`${pct}%`, 'Trefferquote'],
        [`🔥 ${L.best}`, 'beste Serie'],
        [`🐉 ${funkiLevel(L.correct)}`, 'Funkis Stufe'],
      ]) {
        const c = el('div', 'stat', `<b>${v}</b><small>${label}</small>`);
        stats.appendChild(c);
      }
      body.appendChild(stats);

      body.appendChild(el('h3', '', 'Themen'));
      const used = TOPICS.filter((t) => L.topics[t.id]?.n || g.settings.topics.includes(t.id));
      const list = el('div', 'topic-list');
      for (const t of used) {
        const st = L.topics[t.id] || { n: 0, ok: 0 };
        const p = st.n ? Math.round((100 * st.ok) / st.n) : 0;
        const subj = SUBJECTS[t.subject];
        const row = el('div', 'topic-row', `
          <span class="tname">${subj.icon} ${esc(t.name)}</span>
          <span class="tbar"><span style="width:${p}%" class="${p >= 80 ? 'good' : p >= 50 ? 'mid' : 'low'}"></span></span>
          <span class="tnum">${st.ok}/${st.n}</span>`);
        list.appendChild(row);
      }
      body.appendChild(list);

      const tricky = tutor.tricky(10);
      body.appendChild(el('h3', '', '💪 Das üben wir noch'));
      if (tricky.length) {
        const ul = el('div', 'tricky');
        for (const it of tricky) {
          const topic = TOPIC_BY_ID[it.topic];
          ul.appendChild(el('span', 'tricky-item', `${esc(it.label)}<small>${topic ? esc(topic.name) : ''}</small>`));
        }
        body.appendChild(ul);
        body.appendChild(el('p', 'small', 'Falsch beantwortete Aufgaben kommen nach ein paar Fragen automatisch noch einmal dran.'));
      } else {
        body.appendChild(el('p', 'small', L.total ? 'Super – im Moment gibt es nichts, was noch schwerfällt!' : 'Hier erscheinen Aufgaben, die noch nicht so gut klappen.'));
      }
      win.appendChild(body);
      const foot = el('div', 'btn-row');
      const done = el('button', 'btn primary', 'Schließen');
      done.addEventListener('click', () => close());
      foot.appendChild(done);
      win.appendChild(foot);
      wrap.appendChild(win);
    });
  }

  // ---------------------------------------------------------------- Eltern
  showParents() {
    return this.open((wrap, close) => {
      const win = el('div', 'window panel');
      win.appendChild(el('h2', '', 'ℹ️ Für Eltern & Lehrkräfte'));
      const body = el('div', 'panel-body prose');
      body.innerHTML = `
        <p><b>Drachen-Hüter</b> ist ein Action-Rollenspiel im Stil klassischer 16-Bit-Abenteuer – mit eingebautem Lernen.</p>
        <h3>So wird gelernt</h3>
        <ul>
          <li><b>Zaubern = Wissen:</b> Jeder Zauber wird erst nach einer richtig beantworteten Aufgabe ausgelöst.</li>
          <li><b>Funki wächst:</b> Jede richtige Antwort ist ein Wissensstern. Damit wird der Drachen-Begleiter stärker und lernt neue Zauber.</li>
          <li><b>Rätseltruhen, Rätselsteine, Wissenstore</b> und Professor Uhus Übungsrunden bieten zusätzliche Aufgaben.</li>
          <li><b>Fehler sind willkommen:</b> Nach einer falschen Antwort wird die Lösung mit einem Tipp erklärt. Die Aufgabe kommt später noch einmal (Wiederholung).</li>
          <li><b>Passt sich an:</b> Klappt ein Thema gut, werden die Aufgaben etwas schwerer – sonst leichter.</li>
        </ul>
        <h3>Einstellen</h3>
        <p>Unter <b>Einstellungen</b> lassen sich Klasse (1–4), einzelne Themen in Mathe, Deutsch und Englisch sowie die Einmaleins-Reihen wählen. Optional können Matheergebnisse eingetippt und alle Texte vorgelesen werden.</p>
        <h3>Lernbuch</h3>
        <p>Im Ring-Menü (◎ → System → Lernbuch) sehen Sie Trefferquoten je Thema und die Aufgaben, die noch schwerfallen.</p>
        <h3>Datenschutz</h3>
        <p>Das Spiel läuft komplett auf dem Gerät. Spielstand und Lernfortschritt werden nur lokal im Browser gespeichert – es werden keine Daten verschickt, es gibt keine Werbung und keine Käufe.</p>`;
      win.appendChild(body);
      const foot = el('div', 'btn-row');
      const done = el('button', 'btn primary', 'Schließen');
      done.addEventListener('click', () => close());
      foot.appendChild(done);
      win.appendChild(foot);
      wrap.appendChild(win);
    });
  }

  // ----------------------------------------------------------------- Ende
  showEnding() {
    const g = this.game;
    const L = g.save.learn;
    return this.open((wrap, close) => {
      const win = el('div', 'window panel narrow ending');
      win.appendChild(spriteCanvas(S.aurelia.awake, 2));
      win.appendChild(el('h2', '', '🎉 Kapitel 1 geschafft!'));
      const min = Math.round(g.save.playTime / 60);
      win.appendChild(el('p', '', `Aurelia ist wieder wach – dank deines Wissens, <b>${esc(g.save.name)}</b>!`));
      const pct = L.total ? Math.min(100, Math.round((100 * L.correct) / L.total)) : 0;
      win.appendChild(el('div', 'stat-grid', `
        <div class="stat"><b>⭐ ${L.correct}</b><small>richtige Antworten</small></div>
        <div class="stat"><b>${pct}%</b><small>Trefferquote</small></div>
        <div class="stat"><b>🐉 ${funkiLevel(L.correct)}</b><small>Funkis Stufe</small></div>
        <div class="stat"><b>${min} min</b><small>Spielzeit</small></div>`));
      win.appendChild(el('p', 'small', 'Du kannst weiterspielen, Funki weiter wachsen lassen und bei Professor Uhu üben. Fortsetzung folgt …'));
      const b = el('button', 'btn primary', 'Weiterspielen ▶');
      b.addEventListener('click', () => close());
      win.appendChild(b);
      wrap.appendChild(win);
    });
  }
}
