const TOUCH_ACTIONS = new Set(['up', 'down', 'left', 'right', 'drift', 'item']);

export function isTouchDevice(target = globalThis) {
  const points = Number(target?.navigator?.maxTouchPoints ?? target?.navigator?.msMaxTouchPoints ?? 0);
  let coarsePointer = false;
  try {
    coarsePointer = Boolean(target?.matchMedia?.('(pointer: coarse)')?.matches || target?.matchMedia?.('(any-pointer: coarse)')?.matches);
  } catch {
    coarsePointer = false;
  }
  return points > 0 || coarsePointer || 'ontouchstart' in (target ?? {});
}

export class TouchInput {
  constructor(root, { visibilityTarget = globalThis.document } = {}) {
    this.root = root;
    this.visibilityTarget = visibilityTarget;
    this.activePointers = new Map();
    this.actionCounts = new Map();
    this.manualActions = new Set();
    this.useItemPending = false;
    this.buttons = [...(root?.querySelectorAll?.('[data-touch-action]') ?? [])];
    this.handlers = [];

    for (const button of this.buttons) {
      const onPointerDown = (event) => this.#press(button, event);
      const onPointerUp = (event) => this.#release(event.pointerId);
      const onPointerCancel = (event) => this.#release(event.pointerId);
      const onLostCapture = (event) => this.#release(event.pointerId);
      button.addEventListener('pointerdown', onPointerDown, { passive: false });
      button.addEventListener('pointerup', onPointerUp);
      button.addEventListener('pointercancel', onPointerCancel);
      button.addEventListener('lostpointercapture', onLostCapture);
      this.handlers.push([button, 'pointerdown', onPointerDown], [button, 'pointerup', onPointerUp], [button, 'pointercancel', onPointerCancel], [button, 'lostpointercapture', onLostCapture]);
    }

    this.onVisibility = () => this.clear();
    visibilityTarget?.addEventListener?.('visibilitychange', this.onVisibility);
    visibilityTarget?.addEventListener?.('blur', this.onVisibility);
  }

  #press(button, event) {
    const actions = String(button.dataset?.touchAction ?? '')
      .split(/\s+/)
      .filter(Boolean);
    if (!actions.length || actions.some((action) => !TOUCH_ACTIONS.has(action))) return;
    event.preventDefault?.();
    const pointerId = event.pointerId ?? 0;
    if (this.activePointers.has(pointerId)) this.#release(pointerId);
    this.activePointers.set(pointerId, { actions, button });
    button.dataset.pressed = 'true';
    button.setPointerCapture?.(pointerId);
    if (actions.includes('item')) {
      this.useItemPending = true;
    }
    for (const action of actions) {
      if (action === 'item') continue;
      this.actionCounts.set(action, (this.actionCounts.get(action) ?? 0) + 1);
    }
  }

  #release(pointerId) {
    const pointer = this.activePointers.get(pointerId);
    if (!pointer) return;
    this.activePointers.delete(pointerId);
    pointer.button.dataset.pressed = 'false';
    for (const action of pointer.actions) {
      if (action === 'item') continue;
      const nextCount = (this.actionCounts.get(action) ?? 1) - 1;
      if (nextCount > 0) this.actionCounts.set(action, nextCount);
      else this.actionCounts.delete(action);
    }
  }

  setAction(action, active) {
    if (!TOUCH_ACTIONS.has(action) || action === 'item') return;
    if (active) this.manualActions.add(action);
    else this.manualActions.delete(action);
  }

  pulseItem() {
    this.useItemPending = true;
  }

  clear() {
    this.activePointers.clear();
    this.actionCounts.clear();
    this.manualActions.clear();
    this.useItemPending = false;
    for (const button of this.buttons) button.dataset.pressed = 'false';
  }

  read() {
    const active = (action) => (this.actionCounts.get(action) ?? 0) > 0 || this.manualActions.has(action);
    const useItem = this.useItemPending;
    this.useItemPending = false;
    return {
      throttle: active('up') ? 1 : 0,
      brake: active('down') ? 1 : 0,
      steer: (active('left') ? 1 : 0) - (active('right') ? 1 : 0),
      drift: active('drift'),
      useItem,
    };
  }

  dispose() {
    for (const [button, type, handler] of this.handlers) button.removeEventListener(type, handler);
    this.visibilityTarget?.removeEventListener?.('visibilitychange', this.onVisibility);
    this.visibilityTarget?.removeEventListener?.('blur', this.onVisibility);
    this.clear();
  }
}
