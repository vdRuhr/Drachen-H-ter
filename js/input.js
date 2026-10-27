// Steuerung: virtueller Joystick + Touch-Knöpfe fürs iPad, Tastatur für den Computer.

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};
const ACTIONS = {
  Space: 'a', KeyJ: 'a', KeyX: 'a',
  KeyK: 'magic', KeyC: 'magic',
  KeyI: 'ring', KeyM: 'ring', Enter: 'ring',
  Escape: 'back',
};

export class Input {
  constructor(root) {
    this.root = root;
    this.held = new Set();
    this.pressed = new Set();
    this.stickX = 0;
    this.stickY = 0;
    this.stickId = null;
    this.onAnyInput = null;
    this.bindKeyboard();
    this.bindTouch();
  }

  get move() {
    let x = this.stickX, y = this.stickY;
    if (this.held.has('left')) x -= 1;
    if (this.held.has('right')) x += 1;
    if (this.held.has('up')) y -= 1;
    if (this.held.has('down')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  consume(action) {
    if (this.pressed.has(action)) {
      this.pressed.delete(action);
      return true;
    }
    return false;
  }

  clear() {
    this.pressed.clear();
    this.releaseStick();
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      this.onAnyInput?.('key');
      const dir = KEYMAP[e.code];
      if (dir) {
        this.held.add(dir);
        e.preventDefault();
      }
      const act = ACTIONS[e.code];
      if (act && !e.repeat) {
        this.pressed.add(act);
        if (e.code === 'Space') e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const dir = KEYMAP[e.code];
      if (dir) this.held.delete(dir);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
      this.releaseStick();
    });
  }

  bindTouch() {
    const zone = document.getElementById('stick-zone');
    const base = document.getElementById('stick');
    const knob = document.getElementById('stick-knob');
    this.stickBase = base;
    this.stickKnob = knob;
    const radius = () => base.offsetWidth * 0.42 || 50;

    zone.addEventListener('pointerdown', (e) => {
      if (this.stickId !== null) return;
      e.preventDefault();
      this.onAnyInput?.('touch');
      this.stickId = e.pointerId;
      zone.setPointerCapture?.(e.pointerId);
      const r = this.root.getBoundingClientRect();
      this.ox = e.clientX;
      this.oy = e.clientY;
      base.classList.add('active');
      base.style.left = `${e.clientX - r.left}px`;
      base.style.top = `${e.clientY - r.top}px`;
      base.style.bottom = 'auto';
      this.updateStick(e.clientX, e.clientY, radius());
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickId) return;
      e.preventDefault();
      this.updateStick(e.clientX, e.clientY, radius());
    });
    const end = (e) => {
      if (e.pointerId !== this.stickId) return;
      this.releaseStick();
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);

    for (const btn of document.querySelectorAll('.cbtn')) {
      const act = btn.dataset.act;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.onAnyInput?.('touch');
        this.pressed.add(act);
        this.held.add('btn-' + act);
        btn.classList.add('down');
      });
      const up = () => {
        this.held.delete('btn-' + act);
        btn.classList.remove('down');
      };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    }
  }

  updateStick(cx, cy, R) {
    let dx = cx - this.ox, dy = cy - this.oy;
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / R, ny = dy / R;
    const mag = Math.hypot(nx, ny);
    if (mag < 0.18) {
      this.stickX = 0;
      this.stickY = 0;
    } else {
      // etwas "Schwung", damit kleine Kinderdaumen nicht ganz bis zum Rand müssen
      const k = Math.min(1, (mag - 0.18) / 0.6) / mag;
      this.stickX = nx * k;
      this.stickY = ny * k;
    }
  }

  releaseStick() {
    this.stickId = null;
    this.stickX = 0;
    this.stickY = 0;
    if (this.stickKnob) this.stickKnob.style.transform = 'translate(0px, 0px)';
    if (this.stickBase) {
      this.stickBase.classList.remove('active');
      this.stickBase.style.left = '';
      this.stickBase.style.top = '';
      this.stickBase.style.bottom = '';
    }
  }
}
