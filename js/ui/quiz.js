// Das Quiz-Fenster: zeigt eine Aufgabe, nimmt die Antwort an und gibt Rückmeldung.
import { el, esc, Speech } from './ui.js';
import { TOPIC_BY_ID, SUBJECTS } from '../learn/questions.js';

export class QuizUI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('quiz');
  }

  speakParts(q) {
    const parts = [{ text: (q.speak || q.prompt).replace(/[„“]/g, '') }];
    if (q.speakEn) parts.push({ text: q.speakEn, lang: 'en-GB' });
    return parts;
  }

  ask(q, { title = 'Frage', subtitle = '', cancellable = true, onResult } = {}) {
    const game = this.game;
    const topic = TOPIC_BY_ID[q.topic];
    const numeric = q.numeric && game.settings.typeAnswers;
    this.current = q;
    this.root.innerHTML = '';
    const win = el('div', 'window quiz-win');
    const head = el('div', 'quiz-head');
    head.appendChild(el('div', 'quiz-title', esc(title)));
    const speakBtn = el('button', 'icon-btn', '🔊');
    speakBtn.title = 'Vorlesen';
    head.appendChild(speakBtn);
    let closeBtn = null;
    if (cancellable) {
      closeBtn = el('button', 'icon-btn', '✕');
      closeBtn.title = 'Abbrechen';
      head.appendChild(closeBtn);
    }
    win.appendChild(head);
    if (subtitle) win.appendChild(el('div', 'quiz-sub', esc(subtitle)));
    if (topic) {
      const subj = SUBJECTS[topic.subject];
      win.appendChild(el('div', 'quiz-topic', `${subj.icon} ${esc(subj.name)} · ${esc(topic.name)}${q.isReview ? ' <span class="badge">Wiederholung</span>' : ''}`));
    }
    if (q.emoji || q.swatch) {
      const vis = el('div', 'quiz-visual');
      if (q.emoji) vis.textContent = q.emoji;
      if (q.swatch) vis.appendChild(Object.assign(el('span', 'swatch'), { style: `background:${q.swatch}` }));
      win.appendChild(vis);
    }
    win.appendChild(el('div', 'quiz-prompt', esc(q.prompt)));
    if (q.sub) win.appendChild(el('div', 'quiz-subprompt', esc(q.sub)));
    if (q.hint) win.appendChild(el('div', 'quiz-hint', esc(q.hint)));
    const answers = el('div', numeric ? 'quiz-pad' : `quiz-answers n${q.choices.length}`);
    win.appendChild(answers);
    const feedback = el('div', 'quiz-feedback');
    win.appendChild(feedback);
    this.root.appendChild(win);

    game.openModal('quiz');
    this.root.classList.remove('hidden');
    if (game.settings.autoSpeak) Speech.say(this.speakParts(q));

    return new Promise((resolve) => {
      const opened = performance.now();
      let answered = false;
      let typed = '';
      let display = null;
      const buttons = [];

      const finish = (res) => {
        window.removeEventListener('keydown', onKey, true);
        Speech.stop();
        this.root.classList.add('hidden');
        this.root.innerHTML = '';
        game.closeModal('quiz');
        resolve(res);
      };

      const submit = (value, btn) => {
        if (answered || performance.now() - opened < 280) return;
        answered = true;
        const correct = String(value).trim() === String(q.answer);
        const extra = onResult ? onResult(correct) : '';
        if (closeBtn) closeBtn.disabled = true;
        if (q.sayAfter) setTimeout(() => Speech.say([{ text: q.sayAfter, lang: 'en-GB' }]), 350);
        if (correct) {
          btn?.classList.add('right');
          display?.classList.add('right');
          feedback.className = 'quiz-feedback good';
          feedback.innerHTML = `Richtig! 🎉 ${extra || ''}`;
          setTimeout(() => finish({ correct: true }), 1100);
        } else {
          btn?.classList.add('wrong');
          display?.classList.add('wrong');
          for (const b of buttons) if (b.dataset.v === String(q.answer)) b.classList.add('right');
          feedback.className = 'quiz-feedback bad';
          feedback.innerHTML = `<div>Nicht ganz! Richtig ist: <b>${esc(q.answer)}</b></div><div class="explain">${esc(q.explain || '')}</div>`;
          const next = el('button', 'btn primary', 'Weiter ▶');
          next.addEventListener('click', () => finish({ correct: false }));
          feedback.appendChild(next);
          setTimeout(() => next.focus(), 50);
        }
      };

      if (numeric) {
        display = el('div', 'pad-display', '&nbsp;');
        answers.appendChild(display);
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
        const grid = el('div', 'pad-grid');
        for (const k of keys) {
          const b = el('button', 'pad-key' + (k === '✓' ? ' ok' : ''), k);
          b.addEventListener('click', () => press(k));
          grid.appendChild(b);
        }
        answers.appendChild(grid);
      } else {
        q.choices.forEach((c, i) => {
          const b = el('button', 'answer', `<span class="num">${i + 1}</span>${esc(c)}`);
          b.dataset.v = c;
          b.addEventListener('click', () => submit(c, b));
          answers.appendChild(b);
          buttons.push(b);
        });
      }

      const press = (k) => {
        if (answered) return;
        if (k === '⌫') typed = typed.slice(0, -1);
        else if (k === '✓') {
          if (typed) submit(typed, null);
          return;
        } else if (typed.length < 5) typed += k;
        display.innerHTML = typed ? esc(typed) : '&nbsp;';
        game.sound.play('menu');
      };

      speakBtn.addEventListener('click', () => Speech.say(this.speakParts(q)));
      closeBtn?.addEventListener('click', () => {
        if (!answered) finish({ cancelled: true });
      });

      const onKey = (e) => {
        if (e.repeat) return;
        if (answered) {
          if (e.code === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            const next = feedback.querySelector('button');
            next?.click();
          }
          e.stopImmediatePropagation();
          return;
        }
        if (e.code === 'Escape' && cancellable) {
          finish({ cancelled: true });
        } else if (numeric) {
          if (/^Digit\d$|^Numpad\d$/.test(e.code)) press(e.code.slice(-1));
          else if (e.code === 'Backspace') press('⌫');
          else if (e.code === 'Enter') press('✓');
        } else {
          const n = Number(e.key);
          if (n >= 1 && n <= buttons.length) buttons[n - 1].click();
        }
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      window.addEventListener('keydown', onKey, true);
    });
  }
}
