// Prüft alle Aufgaben-Generatoren. Ausführen im Projektordner mit: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, topicsForGrade } from '../js/learn/questions.js';
import { Tutor, newLearnState } from '../js/learn/tutor.js';

const settings = { topics: TOPICS.map((t) => t.id), reihen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };

for (const topic of TOPICS) {
  test(`Thema "${topic.name}" erzeugt gültige Aufgaben`, () => {
    for (let level = 0; level <= 2; level++) {
      for (let i = 0; i < 300; i++) {
        const q = topic.gen(level, settings);
        assert.ok(q.key, 'key fehlt');
        assert.ok(q.prompt, 'prompt fehlt');
        assert.ok(q.explain, 'explain fehlt');
        assert.ok(q.choices.includes(q.answer), `Antwort ${q.answer} fehlt in ${q.choices}`);
        assert.equal(new Set(q.choices).size, q.choices.length, `doppelte Auswahl: ${q.choices}`);
        for (const c of q.choices) assert.ok(!/^-|NaN|undefined/.test(c), `ungültige Auswahl: ${c}`);
      }
    }
  });
}

test('jede Klassenstufe hat Themen', () => {
  for (const g of [1, 2, 3, 4]) assert.ok(topicsForGrade(g).length >= 5);
});

test('Tutor wiederholt falsch beantwortete Aufgaben', () => {
  const state = newLearnState();
  const tutor = new Tutor(state, () => ({ ...settings, topics: ['einmaleins'] }));
  const first = tutor.next();
  tutor.record(first, false);
  assert.equal(state.review.length, 1);
  let seenAgain = false;
  for (let i = 0; i < 40 && !seenAgain; i++) {
    const q = tutor.next();
    if (q.key === first.key) seenAgain = true;
    tutor.record(q, true);
  }
  assert.ok(seenAgain, 'falsche Aufgabe kam nicht wieder');
  assert.equal(state.total, state.correct + 1);
});
