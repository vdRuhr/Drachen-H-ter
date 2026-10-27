// Aufgaben-Generatoren. Jede Aufgabe hat:
//   key      – eindeutige Kennung (für Statistik & Wiederholung)
//   prompt   – die Frage
//   answer   – richtige Antwort (Text)
//   choices  – Antwortmöglichkeiten (Texte)
//   explain  – kurze Erklärung, die nach falscher Antwort gezeigt wird
//   label    – kurze Form für das Lernbuch (z. B. "7 · 8 = 56")
//   optional: emoji, swatch (Farbe), numeric (Zahl kann eingetippt werden), speak, speakLang
import { randInt, pick, shuffle } from '../util.js';

export const SUBJECTS = {
  mathe: { name: 'Mathe', icon: '🔢' },
  deutsch: { name: 'Deutsch', icon: '📝' },
  englisch: { name: 'Englisch', icon: '🇬🇧' },
};

function numChoices(ans, likely = []) {
  const set = new Set([ans]);
  const near = shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans + 3, ans - 3]);
  for (const c of [...shuffle(likely), ...near]) {
    if (set.size >= 4) break;
    if (Number.isInteger(c) && c >= 0 && !set.has(c)) set.add(c);
  }
  let extra = ans + 4;
  while (set.size < 4) set.add(extra++);
  return shuffle([...set]).map(String);
}

function mathQ(key, prompt, ans, likely, explain) {
  return {
    key, prompt: `${prompt} = ?`, answer: String(ans), choices: numChoices(ans, likely),
    explain, label: `${prompt} = ${ans}`, numeric: true,
    speak: prompt.replace('·', 'mal').replace(':', 'geteilt durch').replace('−', 'minus') + ' gleich?',
  };
}

function swapDigits(n) {
  const s = String(n);
  return s.length === 2 ? Number(s[1] + s[0]) : n + 1;
}

// ---------------------------------------------------------------------------
// Mathe
function plus(max, level) {
  let a, b;
  if (max <= 10) {
    a = randInt(1, 9);
    b = randInt(1, 10 - a);
  } else if (level === 0) {
    a = randInt(10, 18);
    b = randInt(1, 19 - a);
    if (a % 10 + b >= 10) b = Math.max(1, 9 - (a % 10));
  } else if (level === 2) {
    a = randInt(2, 9);
    b = randInt(11 - a, 9);
  } else {
    a = randInt(1, 15);
    b = randInt(1, 20 - a);
  }
  const c = a + b;
  let tip = '';
  if (a < 10 && b < 10 && c > 10) tip = ` Tipp: Erst bis 10 auffüllen: ${a} + ${10 - a} = 10, dann noch ${c - 10} dazu.`;
  else if (a === b) tip = ` Tipp: Das ist eine Verdopplung!`;
  return mathQ(`${a}+${b}`, `${a} + ${b}`, c, [a - b, c + 10, c - 10], `${a} + ${b} = ${c}.${tip}`);
}

function minus(max, level) {
  let a, b;
  if (max <= 10) {
    a = randInt(2, 10);
    b = randInt(1, a);
  } else if (level === 0) {
    a = randInt(11, 19);
    b = randInt(1, a % 10 || 1);
  } else if (level === 2) {
    a = randInt(11, 18);
    b = randInt(a - 9, 9);
    if (b <= a % 10) b = Math.min(9, a % 10 + 1);
  } else {
    a = randInt(5, 20);
    b = randInt(1, a - 1);
  }
  const c = a - b;
  let tip = '';
  if (a > 10 && c < 10 && b > a - 10) tip = ` Tipp: Erst bis zur 10: ${a} − ${a - 10} = 10, dann noch ${b - (a - 10)} weg.`;
  return mathQ(`${a}-${b}`, `${a} − ${b}`, c, [a + b, c + 1, c - 1], `${a} − ${b} = ${c}.${tip}`);
}

function plusMinus100(level) {
  const add = Math.random() < 0.5;
  let a, b;
  if (level === 0) {
    // glatte Zehner, kein Übergang
    if (add) {
      a = randInt(1, 8) * 10 + randInt(0, 5);
      b = randInt(1, 9 - Math.floor(a / 10)) * 10;
    } else {
      a = randInt(2, 9) * 10 + randInt(0, 9);
      b = randInt(1, Math.floor(a / 10) - 1) * 10;
    }
  } else if (level === 2) {
    // mit Zehnerübergang
    if (add) {
      do { a = randInt(15, 79); b = randInt(11, 99 - a); } while (a % 10 + b % 10 < 10);
    } else {
      do { a = randInt(31, 99); b = randInt(11, a - 10); } while (b % 10 <= a % 10);
    }
  } else if (add) {
    a = randInt(10, 89);
    b = randInt(2, 100 - a);
  } else {
    a = randInt(12, 99);
    b = randInt(2, a - 1);
  }
  const c = add ? a + b : a - b;
  const z = Math.floor(b / 10) * 10, e = b % 10;
  let tip = '';
  if (z && e) {
    const mid = add ? a + z : a - z;
    tip = ` Tipp: Erst die Zehner, dann die Einer: ${a} ${add ? '+' : '−'} ${z} = ${mid}, ${mid} ${add ? '+' : '−'} ${e} = ${c}.`;
  }
  const sym = add ? '+' : '−';
  return mathQ(`${a}${add ? '+' : '-'}${b}`, `${a} ${sym} ${b}`, c, [add ? c - 10 : c + 10, swapDigits(c), add ? a - b : a + b], `${a} ${sym} ${b} = ${c}.${tip}`);
}

function multTip(a, b) {
  const c = a * b;
  if ([1, 2, 5, 10].includes(a) || [1, 2, 5, 10].includes(b)) return '';
  const k = a > 5 ? (a >= 8 ? 10 : 5) : a === 3 ? 2 : 5;
  const diff = a - k;
  const op = diff > 0 ? 'plus' : 'minus';
  return ` Tipp: ${k} · ${b} = ${k * b}, dann ${op} ${Math.abs(diff)} · ${b} = ${Math.abs(diff) * b} → ${c}.`;
}

function mult(level, settings) {
  const rows = settings?.reihen?.length ? settings.reihen : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const a = pick(rows);
  let b;
  if (level === 0) b = pick([1, 2, 5, 10, randInt(1, 10)]);
  else if (level === 2) b = randInt(3, 9);
  else b = randInt(1, 10);
  const c = a * b;
  const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a];
  return mathQ(`${Math.min(x, y)}x${Math.max(x, y)}`, `${x} · ${y}`, c, [c + a, c - a, c + b, c - b, x + y], `${x} · ${y} = ${c}.${multTip(a, b)}`);
}

function div(level, settings) {
  const rows = settings?.reihen?.length ? settings.reihen : [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const a = pick(rows.filter((r) => r > 1).length ? rows.filter((r) => r > 1) : [2, 5]);
  const b = level === 0 ? pick([1, 2, 5, 10]) : level === 2 ? randInt(4, 10) : randInt(1, 10);
  const c = a * b;
  return mathQ(`${c}:${a}`, `${c} : ${a}`, b, [b + 1, b - 1, a, c - a], `${c} : ${a} = ${b}, denn ${b} · ${a} = ${c}.`);
}

function rechnen1000(level) {
  const add = Math.random() < 0.5;
  let a, b;
  if (level === 0) {
    a = randInt(1, 8) * 100;
    b = randInt(1, (add ? 10 - a / 100 : a / 100)) * 100;
    if (!add && b >= a) b = a - 100 || 100;
  } else if (level === 2) {
    a = randInt(120, 880);
    b = randInt(12, add ? 999 - a : a - 10);
  } else {
    a = randInt(100, 900);
    b = randInt(10, 99);
    if (add && a + b > 1000) b = 1000 - a;
    if (!add && b > a) b = a - 1;
  }
  if (!add && b > a) [a, b] = [b, a];
  const c = add ? a + b : a - b;
  const sym = add ? '+' : '−';
  return mathQ(`${a}${add ? '+' : '-'}${b}`, `${a} ${sym} ${b}`, c, [c + 100, c - 100, c + 10, c - 10], `${a} ${sym} ${b} = ${c}. Tipp: Rechne Schritt für Schritt – erst die Hunderter, dann Zehner, dann Einer.`);
}

function malGross() {
  let a = randInt(11, 49);
  if (a % 10 === 0) a += randInt(1, 9);
  const b = randInt(2, 9);
  const c = a * b;
  const z = Math.floor(a / 10) * 10, e = a % 10;
  return mathQ(`${a}x${b}`, `${a} · ${b}`, c, [c + 10, c - 10, z * b + e, c + b], `${a} · ${b} = ${c}. Tipp: ${z} · ${b} = ${z * b} und ${e} · ${b} = ${e * b}, zusammen ${c}.`);
}

function doppeltHalb(level) {
  const max = level === 2 ? 50 : 20;
  if (Math.random() < 0.5) {
    const n = randInt(1, max / 2);
    return {
      ...mathQ(`dop${n}`, `Das Doppelte von ${n}`, n * 2, [n + 2, n * 2 + 1, n * 2 - 2], `Das Doppelte von ${n} ist ${n * 2}, denn ${n} + ${n} = ${n * 2}.`),
      prompt: `Was ist das Doppelte von ${n}?`, label: `Doppelte von ${n} = ${n * 2}`, speak: `Was ist das Doppelte von ${n}?`,
    };
  }
  const n = randInt(1, max / 2) * 2;
  return {
    ...mathQ(`halb${n}`, `Die Hälfte von ${n}`, n / 2, [n / 2 + 1, n / 2 - 1, n - 2], `Die Hälfte von ${n} ist ${n / 2}, denn ${n / 2} + ${n / 2} = ${n}.`),
    prompt: `Was ist die Hälfte von ${n}?`, label: `Hälfte von ${n} = ${n / 2}`, speak: `Was ist die Hälfte von ${n}?`,
  };
}

// ---------------------------------------------------------------------------
// Deutsch
const NOMEN = ['Hund', 'Baum', 'Schule', 'Drache', 'Apfel', 'Freund', 'Wald', 'Burg', 'Blume', 'Lehrer', 'Sonne', 'Buch', 'Fenster', 'Schwert', 'Vogel', 'Brücke', 'Kuchen', 'Ritter', 'Wolke', 'Insel', 'Schatz', 'Eule', 'Mond', 'Garten'];
const VERBEN = ['laufen', 'springen', 'lesen', 'schreiben', 'fliegen', 'spielen', 'singen', 'essen', 'schlafen', 'malen', 'rennen', 'lachen', 'schwimmen', 'kochen', 'tanzen', 'rufen', 'bauen', 'träumen', 'klettern', 'denken'];
const ADJEKTIVE = ['groß', 'klein', 'schnell', 'bunt', 'lustig', 'müde', 'laut', 'leise', 'warm', 'kalt', 'schön', 'mutig', 'stark', 'weich', 'hell', 'dunkel', 'nass', 'freundlich', 'süß', 'traurig'];

function wortarten() {
  const r = Math.random();
  const [w, type] = r < 0.36 ? [pick(NOMEN), 'Nomen'] : r < 0.7 ? [pick(VERBEN), 'Verb'] : [pick(ADJEKTIVE), 'Adjektiv'];
  const expl = {
    Nomen: `„${w}“ ist ein Nomen (Namenwort). Nomen schreibt man groß – man kann „der, die oder das“ davor setzen.`,
    Verb: `„${w}“ ist ein Verb (Tuwort). Es sagt, was jemand tut.`,
    Adjektiv: `„${w}“ ist ein Adjektiv (Wiewort). Es sagt, wie etwas ist.`,
  }[type];
  return {
    key: `wa:${w}`, prompt: `Welche Wortart ist „${w}“?`, answer: type,
    choices: ['Nomen', 'Verb', 'Adjektiv'], explain: expl, label: `${w} → ${type}`,
    hint: 'Nomen = Namenwort · Verb = Tuwort · Adjektiv = Wiewort',
  };
}

const ARTIKEL = {
  der: ['Hund', 'Baum', 'Apfel', 'Drache', 'Mond', 'Ball', 'Tisch', 'Stern', 'Wald', 'Vogel', 'Ritter', 'Schatz', 'Fisch', 'Käse', 'Schuh', 'Berg', 'Turm', 'Regen'],
  die: ['Katze', 'Sonne', 'Blume', 'Schule', 'Maus', 'Tür', 'Lampe', 'Burg', 'Brücke', 'Eule', 'Wolke', 'Insel', 'Hexe', 'Banane', 'Kerze', 'Biene', 'Krone', 'Uhr'],
  das: ['Haus', 'Buch', 'Pferd', 'Auto', 'Schwert', 'Fenster', 'Ei', 'Schiff', 'Feuer', 'Kind', 'Bett', 'Eis', 'Brot', 'Schaf', 'Glas', 'Boot', 'Herz', 'Schloss'],
};

function artikel() {
  const art = pick(['der', 'die', 'das']);
  const w = pick(ARTIKEL[art]);
  return {
    key: `art:${w}`, prompt: `Welcher Artikel passt?  ___ ${w}`, answer: art, choices: ['der', 'die', 'das'],
    explain: `Es heißt: ${art} ${w}.`, label: `${art} ${w}`, speak: `Welcher Artikel passt zu ${w}?`,
  };
}

const SCHREIBUNG = [
  ['Fahrrad', 'Farrad', 'Fahrad'], ['Schmetterling', 'Schmeterling', 'Schmetterlink'], ['Fenster', 'Fänster', 'Fennster'],
  ['Mädchen', 'Mätchen', 'Medchen'], ['Vogel', 'Fogel', 'Vogl'], ['Zahn', 'Zan', 'Tsahn'], ['Fuchs', 'Fucks', 'Fux'],
  ['Hexe', 'Hekse', 'Hechse'], ['Kuh', 'Ku', 'Kuu'], ['Biene', 'Bine', 'Bienne'], ['Spiel', 'Schpiel', 'Spil'],
  ['Stein', 'Schtein', 'Stain'], ['Bäume', 'Beume', 'Bäumme'], ['Hund', 'Hunt', 'Hundt'], ['Wald', 'Walt', 'Wahld'],
  ['Zwerg', 'Zwerk', 'Twerg'], ['Drache', 'Drahe', 'Drachhe'], ['Geschenk', 'Geschänk', 'Gescheng'],
  ['Freund', 'Froind', 'Freunt'], ['Ritter', 'Riter', 'Rihter'], ['Sonne', 'Sone', 'Sonnne'], ['Igel', 'Iegel', 'Ihgel'],
  ['Tiger', 'Tieger', 'Tihger'], ['Kerze', 'Kertze', 'Kärze'], ['Wiese', 'Wise', 'Wihse'], ['Schule', 'Schuhle', 'Schulle'],
  ['Uhr', 'Ur', 'Uhrr'], ['Käse', 'Kehse', 'Kääse'], ['Zauberer', 'Tsauberer', 'Zauberrer'], ['Prinzessin', 'Prinzesin', 'Prinsessin'],
  ['Brief', 'Brif', 'Brieff'], ['Fluss', 'Flus', 'Fluhs'], ['Schiff', 'Schif', 'Schieff'], ['Ball', 'Bal', 'Bahl'],
];

function rechtschreibung() {
  const [ok, ...wrong] = pick(SCHREIBUNG);
  return {
    key: `rs:${ok}`, prompt: 'Welches Wort ist richtig geschrieben?', answer: ok, choices: shuffle([ok, ...wrong]),
    explain: `Richtig geschrieben: „${ok}“.`, label: ok,
  };
}

const SILBEN = [
  ['Hund', 'Hund'], ['Ap-fel', 'Apfel'], ['Ba-na-ne', 'Banane'], ['Schmet-ter-ling', 'Schmetterling'], ['Dra-che', 'Drache'],
  ['E-le-fant', 'Elefant'], ['Schu-le', 'Schule'], ['Kro-ko-dil', 'Krokodil'], ['Tisch', 'Tisch'], ['Blu-me', 'Blume'],
  ['Scho-ko-la-de', 'Schokolade'], ['Ro-se', 'Rose'], ['Wal', 'Wal'], ['Te-le-fon', 'Telefon'], ['Ka-rot-te', 'Karotte'],
  ['Eich-hörn-chen', 'Eichhörnchen'], ['Mo-tor-rad', 'Motorrad'], ['Kuh', 'Kuh'], ['Pferd', 'Pferd'], ['Zau-be-rer', 'Zauberer'],
  ['Rie-se', 'Riese'], ['Kar-tof-fel', 'Kartoffel'], ['Pa-pa-gei', 'Papagei'], ['Gi-raf-fe', 'Giraffe'], ['Ha-se', 'Hase'],
  ['Re-gen-bo-gen', 'Regenbogen'], ['Mar-me-la-de', 'Marmelade'], ['Son-ne', 'Sonne'], ['Ei', 'Ei'], ['Am-pel', 'Ampel'],
];

function silben() {
  const [split, word] = pick(SILBEN);
  const n = split.split('-').length;
  return {
    key: `sil:${word}`, prompt: `Wie viele Silben hat „${word}“?`, answer: String(n), choices: ['1', '2', '3', '4', '5'].slice(0, Math.max(4, n + 1)),
    explain: `${split} → ${n} ${n === 1 ? 'Silbe' : 'Silben'}. Tipp: Sprich das Wort langsam und klatsche bei jeder Silbe!`,
    label: `${split} (${n})`,
  };
}

const GEGENTEILE = [
  ['groß', 'klein'], ['hell', 'dunkel'], ['warm', 'kalt'], ['schnell', 'langsam'], ['laut', 'leise'], ['alt', 'jung'],
  ['oben', 'unten'], ['voll', 'leer'], ['hart', 'weich'], ['lang', 'kurz'], ['nass', 'trocken'], ['dick', 'dünn'],
  ['schwer', 'leicht'], ['früh', 'spät'], ['viel', 'wenig'], ['stark', 'schwach'], ['fröhlich', 'traurig'], ['hoch', 'tief'],
  ['sauber', 'schmutzig'], ['Tag', 'Nacht'], ['Anfang', 'Ende'], ['lachen', 'weinen'], ['geben', 'nehmen'], ['kommen', 'gehen'],
  ['offen', 'geschlossen'], ['mutig', 'ängstlich'], ['süß', 'sauer'], ['vorne', 'hinten'],
];

function gegenteile() {
  const pair = pick(GEGENTEILE);
  const flip = Math.random() < 0.5;
  const [w, ans] = flip ? [pair[1], pair[0]] : pair;
  const others = shuffle(GEGENTEILE.filter((p) => p !== pair).map((p) => pick(p))).slice(0, 3);
  return {
    key: `geg:${w}`, prompt: `Was ist das Gegenteil von „${w}“?`, answer: ans, choices: shuffle([ans, ...others]),
    explain: `Das Gegenteil von „${w}“ ist „${ans}“.`, label: `${w} ↔ ${ans}`,
  };
}

const REIME = [
  ['Haus', 'Maus'], ['Hund', 'Mund'], ['Baum', 'Traum'], ['Kuh', 'Schuh'], ['Hose', 'Rose'], ['Tisch', 'Fisch'],
  ['Bein', 'Stein'], ['Sonne', 'Tonne'], ['Hand', 'Sand'], ['Katze', 'Tatze'], ['Nase', 'Hase'], ['Ball', 'Stall'],
  ['Topf', 'Kopf'], ['Wal', 'Schal'], ['Zwerg', 'Berg'], ['Schnecke', 'Ecke'], ['Bär', 'Meer'], ['Kuchen', 'suchen'],
  ['Igel', 'Spiegel'], ['Drachen', 'lachen'], ['Hexe', 'Kekse'], ['Mond', 'wohnt'], ['Ziege', 'Wiege'], ['Tanne', 'Kanne'],
];

function reime() {
  const pair = pick(REIME);
  const [w, ans] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
  const others = shuffle(REIME.filter((p) => p !== pair).map((p) => pick(p))).slice(0, 2);
  return {
    key: `reim:${w}`, prompt: `Was reimt sich auf „${w}“?`, answer: ans, choices: shuffle([ans, ...others]),
    explain: `„${w}“ und „${ans}“ reimen sich – sie klingen am Ende gleich.`, label: `${w} – ${ans}`,
  };
}

const ANLAUTE = [
  ['🍎', 'Apfel'], ['🐶', 'Hund'], ['🌙', 'Mond'], ['🐟', 'Fisch'], ['🌞', 'Sonne'], ['🏠', 'Haus'], ['🐭', 'Maus'],
  ['🦁', 'Löwe'], ['🍌', 'Banane'], ['🚗', 'Auto'], ['🐸', 'Frosch'], ['🌳', 'Baum'], ['🥚', 'Ei'], ['🐘', 'Elefant'],
  ['🐝', 'Biene'], ['🦊', 'Fuchs'], ['🍓', 'Erdbeere'], ['🌹', 'Rose'], ['🐰', 'Hase'], ['🦉', 'Eule'], ['🐮', 'Kuh'],
  ['🍋', 'Zitrone'], ['🦓', 'Zebra'], ['🍕', 'Pizza'], ['🐧', 'Pinguin'], ['🌈', 'Regenbogen'], ['⭐', 'Stern'],
  ['🦒', 'Giraffe'], ['🎁', 'Geschenk'], ['🐯', 'Tiger'], ['🦔', 'Igel'], ['🐊', 'Krokodil'], ['🧀', 'Käse'], ['🥕', 'Karotte'],
  ['🐉', 'Drache'], ['👑', 'Krone'], ['🕯️', 'Kerze'], ['🍦', 'Eis'], ['🎈', 'Ballon'], ['🍉', 'Melone'],
];
const LETTERS = 'ABDEFGHKLMNOPRSTUWZ'.split('');

function anlaute() {
  const [emoji, word] = pick(ANLAUTE);
  const first = word[0].toUpperCase();
  const others = shuffle(LETTERS.filter((l) => l !== first)).slice(0, 2);
  return {
    key: `anl:${word}`, prompt: 'Mit welchem Buchstaben beginnt das Wort?', emoji, sub: `_${word.slice(1)}`,
    answer: first, choices: shuffle([first, ...others]),
    explain: `${emoji} „${word}“ beginnt mit ${first}.`, label: `${word} → ${first}`,
    speak: `Mit welchem Buchstaben beginnt ${word}?`,
  };
}

// ---------------------------------------------------------------------------
// Englisch
const VOKABELN = {
  en_tiere: [
    ['Hund', 'dog', '🐶'], ['Katze', 'cat', '🐱'], ['Pferd', 'horse', '🐴'], ['Vogel', 'bird', '🐦'], ['Fisch', 'fish', '🐟'],
    ['Maus', 'mouse', '🐭'], ['Kuh', 'cow', '🐮'], ['Schwein', 'pig', '🐷'], ['Hase', 'rabbit', '🐰'], ['Ente', 'duck', '🦆'],
    ['Bär', 'bear', '🐻'], ['Löwe', 'lion', '🦁'], ['Elefant', 'elephant', '🐘'], ['Affe', 'monkey', '🐵'], ['Schlange', 'snake', '🐍'],
    ['Frosch', 'frog', '🐸'], ['Drache', 'dragon', '🐉'], ['Eule', 'owl', '🦉'], ['Biene', 'bee', '🐝'], ['Schaf', 'sheep', '🐑'],
  ],
  en_farben: [
    ['rot', 'red', null, '#e53935'], ['blau', 'blue', null, '#1e66e0'], ['grün', 'green', null, '#2ea043'],
    ['gelb', 'yellow', null, '#f8d020'], ['schwarz', 'black', null, '#111111'], ['weiß', 'white', null, '#ffffff'],
    ['orange', 'orange', null, '#f57c00'], ['lila', 'purple', null, '#8e44ad'], ['rosa', 'pink', null, '#ff8fc8'],
    ['braun', 'brown', null, '#8d5524'], ['grau', 'grey', null, '#9a9a9a'],
  ],
  en_zahlen: [
    ['eins', 'one', '1'], ['zwei', 'two', '2'], ['drei', 'three', '3'], ['vier', 'four', '4'], ['fünf', 'five', '5'],
    ['sechs', 'six', '6'], ['sieben', 'seven', '7'], ['acht', 'eight', '8'], ['neun', 'nine', '9'], ['zehn', 'ten', '10'],
    ['elf', 'eleven', '11'], ['zwölf', 'twelve', '12'], ['dreizehn', 'thirteen', '13'], ['fünfzehn', 'fifteen', '15'],
    ['zwanzig', 'twenty', '20'],
  ],
  en_essen: [
    ['Apfel', 'apple', '🍎'], ['Banane', 'banana', '🍌'], ['Brot', 'bread', '🍞'], ['Milch', 'milk', '🥛'], ['Käse', 'cheese', '🧀'],
    ['Ei', 'egg', '🥚'], ['Wasser', 'water', '💧'], ['Kuchen', 'cake', '🍰'], ['Saft', 'juice', '🧃'], ['Erdbeere', 'strawberry', '🍓'],
    ['Kartoffel', 'potato', '🥔'], ['Tomate', 'tomato', '🍅'], ['Suppe', 'soup', '🍲'], ['Eis', 'ice cream', '🍦'], ['Karotte', 'carrot', '🥕'],
  ],
  en_koerper: [
    ['Mutter', 'mother', '👩'], ['Vater', 'father', '👨'], ['Bruder', 'brother', '👦'], ['Schwester', 'sister', '👧'],
    ['Oma', 'grandma', '👵'], ['Opa', 'grandpa', '👴'], ['Kopf', 'head', '🙂'], ['Fuß', 'foot', '🦶'], ['Auge', 'eye', '👁️'],
    ['Nase', 'nose', '👃'], ['Mund', 'mouth', '👄'], ['Ohr', 'ear', '👂'], ['Hand', 'hand', '✋'], ['Haare', 'hair', '💇'],
  ],
};

function vokabel(topicId) {
  const list = VOKABELN[topicId];
  const item = pick(list);
  const [de, en, emoji, swatch] = item;
  const others = shuffle(list.filter((x) => x !== item)).slice(0, 3);
  const toEn = Math.random() < 0.55;
  const isNumber = topicId === 'en_zahlen';
  if (toEn) {
    const shown = isNumber ? emoji : de;
    return {
      key: `${topicId}:${de}>`, prompt: `Was heißt „${shown}“ auf Englisch?`, emoji: isNumber ? null : emoji, swatch,
      answer: en, choices: shuffle([en, ...others.map((o) => o[1])]),
      explain: `${shown} = ${en}`, label: `${de} = ${en}`, speak: `Was heißt ${de} auf Englisch?`, sayAfter: en,
    };
  }
  return {
    key: `${topicId}:${en}<`, prompt: `Was bedeutet „${en}“?`, emoji: isNumber ? null : emoji, swatch,
    answer: isNumber ? emoji : de, choices: shuffle([isNumber ? emoji : de, ...others.map((o) => (isNumber ? o[2] : o[0]))]),
    explain: `${en} = ${isNumber ? emoji : de}`, label: `${en} = ${de}`, speakEn: en, speak: `Was bedeutet`,
  };
}

// ---------------------------------------------------------------------------
export const TOPICS = [
  { id: 'plus10', subject: 'mathe', name: 'Plus bis 10', grades: [1], gen: (l) => plus(10, l) },
  { id: 'minus10', subject: 'mathe', name: 'Minus bis 10', grades: [1], gen: (l) => minus(10, l) },
  { id: 'plus20', subject: 'mathe', name: 'Plus bis 20', grades: [1, 2], gen: (l) => plus(20, l) },
  { id: 'minus20', subject: 'mathe', name: 'Minus bis 20', grades: [1, 2], gen: (l) => minus(20, l) },
  { id: 'doppelt', subject: 'mathe', name: 'Verdoppeln & Halbieren', grades: [1, 2], gen: (l) => doppeltHalb(l) },
  { id: 'pm100', subject: 'mathe', name: 'Plus & Minus bis 100', grades: [2, 3], gen: (l) => plusMinus100(l) },
  { id: 'einmaleins', subject: 'mathe', name: 'Einmaleins', grades: [2, 3, 4], gen: (l, s) => mult(l, s) },
  { id: 'geteilt', subject: 'mathe', name: 'Geteilt', grades: [3, 4], gen: (l, s) => div(l, s) },
  { id: 'pm1000', subject: 'mathe', name: 'Plus & Minus bis 1000', grades: [3, 4], gen: (l) => rechnen1000(l) },
  { id: 'malgross', subject: 'mathe', name: 'Mal mit großen Zahlen', grades: [4], gen: () => malGross() },

  { id: 'anlaute', subject: 'deutsch', name: 'Anlaute', grades: [1], gen: () => anlaute() },
  { id: 'reime', subject: 'deutsch', name: 'Reime', grades: [1, 2], gen: () => reime() },
  { id: 'silben', subject: 'deutsch', name: 'Silben', grades: [1, 2], gen: () => silben() },
  { id: 'artikel', subject: 'deutsch', name: 'der, die, das', grades: [1, 2, 3], gen: () => artikel() },
  { id: 'gegenteile', subject: 'deutsch', name: 'Gegenteile', grades: [2, 3], gen: () => gegenteile() },
  { id: 'wortarten', subject: 'deutsch', name: 'Wortarten', grades: [2, 3, 4], gen: () => wortarten() },
  { id: 'rechtschreibung', subject: 'deutsch', name: 'Rechtschreibung', grades: [2, 3, 4], gen: () => rechtschreibung() },

  { id: 'en_tiere', subject: 'englisch', name: 'Tiere', grades: [3, 4], gen: () => vokabel('en_tiere') },
  { id: 'en_farben', subject: 'englisch', name: 'Farben', grades: [3, 4], gen: () => vokabel('en_farben') },
  { id: 'en_zahlen', subject: 'englisch', name: 'Zahlen', grades: [3, 4], gen: () => vokabel('en_zahlen') },
  { id: 'en_essen', subject: 'englisch', name: 'Essen', grades: [4], gen: () => vokabel('en_essen') },
  { id: 'en_koerper', subject: 'englisch', name: 'Familie & Körper', grades: [4], gen: () => vokabel('en_koerper') },
];

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

export function topicsForGrade(grade) {
  return TOPICS.filter((t) => t.grades.includes(grade)).map((t) => t.id);
}
