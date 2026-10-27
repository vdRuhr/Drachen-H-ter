// Spielwerte an einer Stelle – leicht zum Anpassen.

export const SPELLS = {
  fire: { name: 'Feuerball', icon: '🔥', mp: 2, target: true, desc: 'Funki spuckt einen Feuerball auf den nächsten Gegner.' },
  heal: { name: 'Heilung', icon: '💚', mp: 3, target: false, desc: 'Heilt deine Lebenspunkte (LP).' },
  bolt: { name: 'Blitz', icon: '⚡', mp: 4, target: true, desc: 'Trifft alle Gegner, die du sehen kannst.' },
};

export const ITEMS = {
  candy: { name: 'Honigbonbon', icon: '🍬', price: 8, desc: 'Heilt 40 Lebenspunkte.' },
  potion: { name: 'Zaubertrank', icon: '🧪', price: 15, desc: 'Füllt deine Mana-Punkte (MP) ganz auf.' },
};

export const ENEMIES = {
  hoppel: { name: 'Hoppel', hp: 16, atk: 4, def: 0, xp: 3, coins: [1, 3], ai: 'hop', speed: 70, hw: 6, hh: 6 },
  pilz: { name: 'Pilzbold', hp: 28, atk: 6, def: 1, xp: 6, coins: [2, 4], ai: 'walk', speed: 26, hw: 6, hh: 6 },
  summsel: { name: 'Summsel', hp: 14, atk: 5, def: 0, xp: 5, coins: [1, 3], ai: 'fly', speed: 46, hw: 6, hh: 5 },
  stein: { name: 'Steinling', hp: 45, atk: 9, def: 3, xp: 12, coins: [3, 6], ai: 'walk', speed: 22, hw: 7, hh: 6 },
  gorm: { name: 'Steinkoloss Gorm', hp: 320, atk: 10, def: 4, xp: 100, coins: [40, 40], ai: 'boss', speed: 18, hw: 14, hh: 8 },
};

export function statsForLevel(l) {
  return { maxHp: 40 + l * 12, maxMp: 8 + l * 2, atk: 6 + l * 2, def: l };
}

// Erfahrung, die man für die nächste Stufe braucht
export function xpToNext(l) {
  return Math.round(12 * Math.pow(l, 1.6));
}

// Ab wie vielen Wissenssternen (richtigen Antworten) Funki wächst
export const FUNKI_LEVELS = [0, 8, 20, 40, 70, 110, 160, 220, 300];

export function funkiLevel(stars) {
  let l = 1;
  for (let i = 1; i < FUNKI_LEVELS.length; i++) if (stars >= FUNKI_LEVELS[i]) l = i + 1;
  return l;
}
