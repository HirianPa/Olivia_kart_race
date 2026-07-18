const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space']);

export class KeyboardInput {
  constructor(target = window) {
    this.target = target;
    this.pressed = new Set();
    this.useItemPending = false;
    this.onKeyDown = (event) => {
      if (GAME_KEYS.has(event.code)) event.preventDefault();
      if (event.code === 'Space' && !this.pressed.has('Space')) this.useItemPending = true;
      this.pressed.add(event.code);
    };
    this.onKeyUp = (event) => this.pressed.delete(event.code);
    this.clear = () => {
      this.pressed.clear();
      this.useItemPending = false;
    };
    this.onVisibility = () => { if (document.hidden) this.clear(); };
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.clear);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  read() {
    const active = (...codes) => codes.some((code) => this.pressed.has(code));
    const useItem = this.useItemPending;
    this.useItemPending = false;
    return {
      throttle: active('KeyW', 'ArrowUp') ? 1 : 0,
      brake: active('KeyS', 'ArrowDown') ? 1 : 0,
      steer: (active('KeyA', 'ArrowLeft') ? 1 : 0) - (active('KeyD', 'ArrowRight') ? 1 : 0),
      drift: active('ShiftLeft', 'ShiftRight'),
      useItem,
    };
  }

  dispose() {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.clear);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
