// Klänge und Chiptune-Musik – alles live per WebAudio erzeugt.

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function freq(name) {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) return 0;
  const n = NOTE[m[1]] + (Number(m[2]) + 1) * 12;
  return 440 * 2 ** ((n - 69) / 12);
}

// Musikstücke: jedes Token ist eine Achtelnote. "-" hält, "." ist Pause, "|" nur zur Übersicht.
const TRACKS = {
  dorf: {
    bpm: 92,
    parts: [
      { wave: 'square', vol: 0.05, notes: `
        C5 - E5 - G5 - E5 - | F5 - A5 - G5 - E5 - | D5 - F5 - E5 D5 C5 - | D5 - - - G4 - - - |
        C5 - E5 - G5 - C6 - | B5 - A5 - G5 - E5 - | F5 - E5 - D5 - B4 - | C5 - - - - - . . |` },
      { wave: 'triangle', vol: 0.16, notes: `
        C3 - - - G3 - - - | F3 - - - C3 - - - | G3 - - - C3 - - - | G3 - - - G2 - - - |
        C3 - - - E3 - - - | A2 - - - E3 - - - | F3 - - - G3 - - - | C3 - - - C3 - . . |` },
      { wave: 'square', vol: 0.018, notes: `
        C4 E4 G4 E4 C4 E4 G4 E4 | F4 A4 C5 A4 E4 G4 C5 G4 | D4 G4 B4 G4 E4 G4 C5 G4 | D4 G4 B4 G4 D4 G4 B4 G4 |
        C4 E4 G4 E4 C4 E4 G4 E4 | A3 C4 E4 C4 B3 E4 G4 E4 | F4 A4 C5 A4 D4 G4 B4 G4 | C4 E4 G4 C5 G4 E4 C4 . |` },
    ],
  },
  wald: {
    bpm: 120,
    parts: [
      { wave: 'square', vol: 0.045, notes: `
        A4 - C5 - E5 - D5 C5 | B4 - G4 - B4 - D5 - | C5 - E5 - A5 - G5 E5 | F5 - E5 - D5 - - - |
        A4 - C5 - E5 - A5 - | G5 - F5 - E5 - D5 - | C5 - D5 - E5 - B4 - | A4 - - - - - . . |` },
      { wave: 'triangle', vol: 0.16, notes: `
        A2 - A3 - A2 - A3 - | G2 - G3 - G2 - G3 - | F2 - F3 - F2 - F3 - | D3 - D2 - E2 - E3 - |
        A2 - A3 - A2 - A3 - | C3 - C3 - D3 - D3 - | F2 - F3 - E2 - E3 - | A2 - A3 - A2 - . . |` },
      { wave: 'square', vol: 0.016, notes: `
        A3 E4 A4 E4 A3 E4 A4 E4 | G3 D4 G4 D4 G3 D4 G4 D4 | F3 C4 F4 C4 F3 C4 F4 C4 | D4 F4 A4 F4 E4 G#4 B4 G#4 |
        A3 E4 A4 E4 A3 E4 A4 E4 | C4 E4 G4 E4 D4 F4 A4 F4 | F3 C4 F4 C4 E4 G#4 B4 G#4 | A3 E4 A4 E4 A3 . . . |` },
      { drums: true, vol: 0.12, notes: 'K . x . S . x . | K . x . S . x x' },
    ],
  },
  ruine: {
    bpm: 80,
    parts: [
      { wave: 'triangle', vol: 0.12, notes: `
        D5 - - - F5 - E5 - | D5 - - - A4 - - - | A#4 - - - A4 - G4 - | A4 - - - - - . . |
        D5 - - - F5 - A5 - | G5 - F5 - E5 - - - | F5 - E5 - D5 - C#5 - | D5 - - - - - . . |` },
      { wave: 'triangle', vol: 0.14, notes: `
        D2 - - - - - - - | D2 - - - - - - - | A#2 - - - - - - - | A2 - - - - - - - |
        D2 - - - - - - - | G2 - - - - - - - | A2 - - - - - - - | D2 - - - - - . . |` },
      { wave: 'square', vol: 0.014, notes: `
        D4 . F4 . A4 . F4 . | D4 . F4 . A4 . F4 . | A#3 . D4 . F4 . D4 . | A3 . C#4 . E4 . C#4 . |
        D4 . F4 . A4 . F4 . | G3 . A#3 . D4 . A#3 . | A3 . C#4 . E4 . G4 . | D4 . F4 . A4 . . . |` },
    ],
  },
  boss: {
    bpm: 150,
    parts: [
      { wave: 'square', vol: 0.05, notes: `
        E5 - E5 G5 - E5 D5 - | E5 - B4 - - - D5 - | C5 - C5 E5 - C5 B4 - | A4 - B4 - D#5 - - - |
        E5 - E5 G5 - E5 A5 - | G5 - F#5 - E5 - D5 - | C5 - E5 - G5 - F#5 - | E5 - - - D#5 - B4 - |` },
      { wave: 'triangle', vol: 0.18, notes: `
        E2 E3 E2 E3 E2 E3 E2 E3 | E2 E3 E2 E3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | B1 B2 B1 B2 B1 B2 B1 B2 |
        E2 E3 E2 E3 E2 E3 E2 E3 | E2 E3 E2 E3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | B1 B2 B1 B2 B1 B2 B1 B2 |` },
      { drums: true, vol: 0.14, notes: 'K x x K S x K x | K x x K S x S S' },
    ],
  },
};

function parse(notes) {
  const toks = notes.split(/\s+/).filter((t) => t && t !== '|');
  return toks.map((t, i) => {
    if (t === '-' || t === '.') return null;
    let len = 1;
    while (toks[i + len] === '-') len++;
    return { t, len };
  });
}
for (const tr of Object.values(TRACKS)) for (const p of tr.parts) p.seq = parse(p.notes);

export class Sound {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.sfxOn = true;
    this.current = null;
    this.timer = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.7;
      this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  // iOS braucht eine Nutzer-Geste, bevor Ton abgespielt werden darf.
  unlock() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (e) { /* ältere Geräte */ }
    if (!this.ensure()) return;
    const b = this.ctx.createBuffer(1, 1, 22050);
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    s.connect(this.ctx.destination);
    s.start(0);
    if (this.wantMusic && !this.timer) this.music(this.wantMusic);
  }

  tone(f, dur, { type = 'square', vol = 0.15, slide = 0, delay = 0, dest } = {}) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, { vol = 0.15, type = 'lowpass', f = 2000, f2, delay = 0, dest } = {}) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const flt = c.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f, t);
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt);
    flt.connect(g);
    g.connect(dest || this.sfxGain);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  seq(notes, step, opts) {
    notes.forEach((n, i) => n && this.tone(freq(n), step * 1.2, { ...opts, delay: i * step }));
  }

  play(name) {
    if (!this.sfxOn || !this.ensure()) return;
    switch (name) {
      case 'swing':
        this.noise(0.09, { vol: 0.12, type: 'highpass', f: 1800, f2: 5000 });
        this.tone(520, 0.06, { vol: 0.04, slide: 260 });
        break;
      case 'hit':
        this.tone(230, 0.1, { vol: 0.14, slide: 80 });
        this.noise(0.07, { vol: 0.14, f: 1400 });
        break;
      case 'clank':
        this.tone(1250, 0.12, { type: 'triangle', vol: 0.14 });
        this.tone(1870, 0.18, { type: 'triangle', vol: 0.06 });
        break;
      case 'enemyDie':
        this.seq(['E5', 'C5', 'G4', 'C4'], 0.05, { vol: 0.08 });
        this.noise(0.25, { vol: 0.1, f: 3000, f2: 300 });
        break;
      case 'hurt':
        this.tone(320, 0.2, { type: 'sawtooth', vol: 0.12, slide: 110 });
        break;
      case 'coin':
        this.tone(988, 0.07, { vol: 0.07 });
        this.tone(1319, 0.18, { vol: 0.07, delay: 0.07 });
        break;
      case 'heart':
        this.seq(['C6', 'E6', 'G6'], 0.05, { type: 'triangle', vol: 0.12 });
        break;
      case 'correct':
        this.seq(['C5', 'E5', 'G5', 'C6'], 0.075, { type: 'triangle', vol: 0.22 });
        this.tone(freq('E6'), 0.35, { type: 'square', vol: 0.03, delay: 0.3 });
        break;
      case 'wrong':
        this.tone(freq('G3'), 0.16, { vol: 0.06 });
        this.tone(freq('D#3'), 0.3, { vol: 0.06, delay: 0.16 });
        break;
      case 'levelup':
        this.seq(['C5', 'E5', 'G5', 'C6', null, 'G5', 'C6'], 0.09, { vol: 0.09 });
        this.seq(['C4', null, 'G4', null, null, 'E4', 'C5'], 0.09, { type: 'triangle', vol: 0.15 });
        break;
      case 'fanfare':
        this.seq(['G4', 'C5', 'E5', 'G5', null, 'E5', 'G5', null, null, 'C6'], 0.11, { vol: 0.09 });
        this.seq(['C3', null, 'G3', null, 'C4', null, 'G3', null, null, 'C4'], 0.11, { type: 'triangle', vol: 0.18 });
        break;
      case 'fire':
        this.noise(0.45, { vol: 0.22, f: 3000, f2: 300 });
        this.tone(180, 0.35, { type: 'sawtooth', vol: 0.06, slide: 60 });
        break;
      case 'funkiFire':
        this.noise(0.15, { vol: 0.08, f: 2500, f2: 600 });
        break;
      case 'heal':
        this.seq(['C6', 'E6', 'G6', 'C7', 'G6', 'C7'], 0.06, { type: 'sine', vol: 0.12 });
        break;
      case 'bolt':
        this.noise(0.5, { vol: 0.3, type: 'highpass', f: 800, f2: 200 });
        this.tone(1400, 0.3, { type: 'sawtooth', vol: 0.05, slide: 90 });
        break;
      case 'menu':
        this.tone(880, 0.035, { vol: 0.05 });
        break;
      case 'open':
        this.tone(440, 0.1, { type: 'triangle', vol: 0.12, slide: 880 });
        break;
      case 'close':
        this.tone(880, 0.1, { type: 'triangle', vol: 0.12, slide: 440 });
        break;
      case 'chest':
        this.seq(['C5', 'E5', 'G5', 'C6', 'E6'], 0.06, { vol: 0.08 });
        break;
      case 'gate':
        this.noise(0.9, { vol: 0.25, f: 220 });
        this.seq([null, null, null, 'C6', 'G6', 'C7'], 0.1, { type: 'triangle', vol: 0.12 });
        break;
      case 'blip':
        this.tone(700, 0.018, { vol: 0.025 });
        break;
      case 'bush':
        this.noise(0.14, { vol: 0.14, type: 'bandpass', f: 1600 });
        break;
      case 'stomp':
        this.tone(90, 0.4, { type: 'sine', vol: 0.35, slide: 30 });
        this.noise(0.3, { vol: 0.2, f: 400 });
        break;
      case 'throw':
        this.noise(0.12, { vol: 0.1, type: 'bandpass', f: 900 });
        break;
      case 'shieldBreak':
        this.noise(0.5, { vol: 0.25, type: 'highpass', f: 2000, f2: 500 });
        this.seq(['B6', 'G6', 'D6', 'B5'], 0.05, { type: 'triangle', vol: 0.12 });
        break;
      case 'save':
        this.seq(['G5', 'B5', 'D6', 'G6'], 0.08, { type: 'sine', vol: 0.14 });
        break;
      default:
        break;
    }
  }

  drum(kind, t, vol) {
    const c = this.ctx;
    if (kind === 'K') {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.14);
      g.gain.setValueAtTime(vol * 2.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g);
      g.connect(this.musicGain);
      o.start(t);
      o.stop(t + 0.18);
    } else {
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = kind === 'S' ? 'bandpass' : 'highpass';
      f.frequency.value = kind === 'S' ? 1800 : 7000;
      const g = c.createGain();
      const len = kind === 'S' ? 0.12 : 0.04;
      g.gain.setValueAtTime(kind === 'S' ? vol : vol * 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      s.connect(f);
      f.connect(g);
      g.connect(this.musicGain);
      s.start(t, Math.random() * 0.5);
      s.stop(t + len + 0.02);
    }
  }

  music(name) {
    this.wantMusic = name;
    if (this.current === name && this.timer) return;
    this.stopMusic();
    this.wantMusic = name;
    if (!name || !this.musicOn || !TRACKS[name] || !this.ctx) return;
    const tr = TRACKS[name];
    const stepDur = 60 / tr.bpm / 2;
    let step = 0;
    let next = this.ctx.currentTime + 0.08;
    const len = Math.max(...tr.parts.map((p) => p.seq.length));
    this.current = name;
    const tick = () => {
      if (this.ctx.state !== 'running') return;
      if (next < this.ctx.currentTime - 0.2) next = this.ctx.currentTime + 0.05;
      while (next < this.ctx.currentTime + 0.15) {
        for (const p of tr.parts) {
          const n = p.seq[step % p.seq.length];
          if (!n) continue;
          if (p.drums) this.drum(n.t, next, p.vol);
          else this.tone(freq(n.t), n.len * stepDur * 0.92, { type: p.wave, vol: p.vol, dest: this.musicGain, delay: next - this.ctx.currentTime });
        }
        step = (step + 1) % len;
        next += stepDur;
      }
    };
    this.timer = setInterval(tick, 30);
    tick();
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.current = null;
  }

  setMusic(on) {
    this.musicOn = on;
    if (!on) {
      const keep = this.wantMusic;
      this.stopMusic();
      this.wantMusic = keep;
    } else if (this.wantMusic) this.music(this.wantMusic);
  }
}
