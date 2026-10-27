// Spielstand und Einstellungen werden im Browser (localStorage) gespeichert.
import { topicsForGrade } from './learn/questions.js';

const SAVE_KEY = 'drachenhueter.save.v1';
const SETTINGS_KEY = 'drachenhueter.settings.v1';

export function defaultSettings(grade = 2) {
  return {
    grade,
    topics: topicsForGrade(grade),
    reihen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    typeAnswers: false,
    autoSpeak: false,
    music: true,
    sfx: true,
  };
}

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (s) return { ...defaultSettings(s.grade || 2), ...s };
  } catch (e) { /* kaputt oder nicht verfügbar */ }
  return defaultSettings();
}

export function writeSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (e) { /* privater Modus o. Ä. */ }
}

export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    return s && s.version === 1 ? s : null;
  } catch (e) {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) { /* egal */ }
}
