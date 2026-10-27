// Der "Tutor" wählt passende Aufgaben aus, merkt sich Fehler und
// stellt falsch beantwortete Aufgaben nach kurzer Zeit erneut (Wiederholung).
import { TOPIC_BY_ID } from './questions.js';
import { shuffle } from '../util.js';

export function newLearnState() {
  return { topics: {}, items: {}, review: [], total: 0, correct: 0, streak: 0, best: 0, recentKeys: [] };
}

export class Tutor {
  constructor(state, getSettings) {
    this.s = state;
    this.getSettings = getSettings;
  }

  enabledTopics() {
    const ids = (this.getSettings().topics || []).filter((id) => TOPIC_BY_ID[id]);
    return ids.length ? ids : ['plus20'];
  }

  // Schwierigkeit 0..2 anhand der letzten Antworten im Thema
  levelFor(topicId) {
    const t = this.s.topics[topicId];
    if (!t || t.recent.length < 4) return 1;
    const acc = t.recent.reduce((a, b) => a + b, 0) / t.recent.length;
    return acc < 0.6 ? 0 : acc < 0.85 ? 1 : 2;
  }

  next() {
    const s = this.s;
    for (const r of s.review) r.due--;
    const enabled = new Set(this.enabledTopics());
    const dueIdx = s.review.findIndex((r) => r.due <= 0 && enabled.has(r.q.topic));
    if (dueIdx >= 0 && Math.random() < 0.65) {
      const [r] = s.review.splice(dueIdx, 1);
      const q = { ...r.q, choices: shuffle([...r.q.choices]), isReview: true };
      return q;
    }
    // Themen mit schwächerer Trefferquote kommen etwas häufiger dran
    const ids = [...enabled];
    const weights = ids.map((id) => {
      const t = s.topics[id];
      if (!t || !t.recent.length) return 1.2;
      const acc = t.recent.reduce((a, b) => a + b, 0) / t.recent.length;
      return 0.7 + (1 - acc);
    });
    let q = null;
    for (let tries = 0; tries < 12; tries++) {
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      let id = ids[0];
      for (let i = 0; i < ids.length; i++) {
        r -= weights[i];
        if (r <= 0) { id = ids[i]; break; }
      }
      const topic = TOPIC_BY_ID[id];
      q = { ...topic.gen(this.levelFor(id), this.getSettings()), topic: id };
      if (!s.recentKeys.includes(q.key)) break;
    }
    s.recentKeys.push(q.key);
    if (s.recentKeys.length > 8) s.recentKeys.shift();
    return q;
  }

  record(q, correct) {
    const s = this.s;
    s.total++;
    if (correct) {
      s.correct++;
      s.streak++;
      s.best = Math.max(s.best, s.streak);
    } else {
      s.streak = 0;
    }
    const t = (s.topics[q.topic] ||= { n: 0, ok: 0, recent: [] });
    t.n++;
    if (correct) t.ok++;
    t.recent.push(correct ? 1 : 0);
    if (t.recent.length > 10) t.recent.shift();

    const it = (s.items[q.key] ||= { label: q.label, topic: q.topic, n: 0, wrong: 0 });
    it.n++;
    it.label = q.label;
    if (!correct) {
      it.wrong++;
      s.review = s.review.filter((r) => r.q.key !== q.key);
      const { isReview, ...plain } = q;
      s.review.push({ q: plain, due: 3 });
      if (s.review.length > 20) s.review.shift();
    } else if (it.wrong > 0) {
      it.wrong = Math.max(0, it.wrong - 0.5);
    }
  }

  // Aufgaben, die noch schwerfallen (für das Lernbuch)
  tricky(limit = 8) {
    return Object.values(this.s.items)
      .filter((it) => it.wrong >= 1)
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, limit);
  }
}
