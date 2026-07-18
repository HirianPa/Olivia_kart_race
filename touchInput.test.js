import { describe, expect, it } from 'vitest';
import { TouchInput } from '../src/input/TouchInput.js';

class FakeEventTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  removeEventListener(type) { this.listeners.delete(type); }
  dispatch(type, event = {}) { this.listeners.get(type)?.({ type, ...event }); }
}

class FakeButton extends FakeEventTarget {
  constructor(action) {
    super();
    this.dataset = { touchAction: action };
    this.classList = { toggle() {} };
  }
  setPointerCapture() {}
  releasePointerCapture() {}
}

function createControls() {
  const actions = ['up', 'down', 'left', 'right', 'drift', 'item'];
  const buttons = Object.fromEntries(actions.map((action) => [action, new FakeButton(action)]));
  const root = { querySelectorAll: () => Object.values(buttons) };
  const visibilityTarget = new FakeEventTarget();
  return { buttons, root, visibilityTarget };
}

function pointer(button, pointerId = 1) {
  button.dispatch('pointerdown', {
    pointerId,
    currentTarget: button,
    preventDefault() {},
  });
}

describe('TouchInput', () => {
  it('keeps a directional press active until that pointer is released', () => {
    const { buttons, root } = createControls();
    const input = new TouchInput(root);

    pointer(buttons.up);
    expect(input.read()).toMatchObject({ throttle: 1, brake: 0, steer: 0, drift: false });

    buttons.up.dispatch('pointerup', { pointerId: 1, currentTarget: buttons.up });
    expect(input.read()).toMatchObject({ throttle: 0, brake: 0, steer: 0, drift: false });
    input.dispose();
  });

  it('combines simultaneous steering and drift pointers', () => {
    const { buttons, root } = createControls();
    const input = new TouchInput(root);

    pointer(buttons.left, 1);
    pointer(buttons.drift, 2);
    expect(input.read()).toMatchObject({ steer: 1, drift: true });

    pointer(buttons.right, 3);
    expect(input.read()).toMatchObject({ steer: 0, drift: true });
    input.dispose();
  });

  it('keeps acceleration held when another finger steers away from the button', () => {
    const { buttons, root } = createControls();
    const input = new TouchInput(root);

    pointer(buttons.up, 1);
    pointer(buttons.left, 2);
    buttons.up.dispatch('pointerleave', { pointerId: 1, currentTarget: buttons.up });

    expect(input.read()).toMatchObject({ throttle: 1, brake: 0, steer: 1, drift: false });
    buttons.up.dispatch('pointerup', { pointerId: 1, currentTarget: buttons.up });
    buttons.left.dispatch('pointerup', { pointerId: 2, currentTarget: buttons.left });
    expect(input.read()).toMatchObject({ throttle: 0, steer: 0 });
    input.dispose();
  });

  it.each([
    ['northwest', 'up left', { throttle: 1, steer: 1, brake: 0 }],
    ['northeast', 'up right', { throttle: 1, steer: -1, brake: 0 }],
    ['southwest', 'down left', { throttle: 0, steer: 1, brake: 1 }],
    ['southeast', 'down right', { throttle: 0, steer: -1, brake: 1 }],
  ])('maps the %s diagonal to two driving actions', (_name, touchAction, expected) => {
    const { root } = createControls();
    const diagonal = new FakeButton(touchAction);
    root.querySelectorAll = () => [diagonal];
    const input = new TouchInput(root);

    pointer(diagonal);
    expect(input.read()).toMatchObject({ ...expected, drift: false, useItem: false });
    diagonal.dispatch('pointerup', { pointerId: 1, currentTarget: diagonal });
    expect(input.read()).toMatchObject({ throttle: 0, brake: 0, steer: 0 });
    input.dispose();
  });

  it('emits one item pulse per B press', () => {
    const { buttons, root } = createControls();
    const input = new TouchInput(root);

    pointer(buttons.item);
    expect(input.read().useItem).toBe(true);
    expect(input.read().useItem).toBe(false);

    buttons.item.dispatch('pointerup', { pointerId: 1, currentTarget: buttons.item });
    pointer(buttons.item, 2);
    expect(input.read().useItem).toBe(true);
    input.dispose();
  });

  it('clears held actions when the document becomes hidden', () => {
    const { buttons, root, visibilityTarget } = createControls();
    const input = new TouchInput(root, { visibilityTarget });

    pointer(buttons.down);
    visibilityTarget.dispatch('visibilitychange');
    expect(input.read()).toMatchObject({ throttle: 0, brake: 0, steer: 0, drift: false });
    input.dispose();
  });
});
