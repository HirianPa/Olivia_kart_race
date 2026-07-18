import { afterEach, describe, expect, it } from 'vitest';
import { KeyboardInput } from '../src/input/KeyboardInput.js';

const originalDocument = globalThis.document;

function keyEvent(type, code) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'code', { value: code });
  return event;
}

afterEach(() => {
  globalThis.document = originalDocument;
});

describe('KeyboardInput', () => {
  it('maps A and left arrow to the visual left turn, and D and right arrow to the visual right turn', () => {
    const target = new EventTarget();
    const fakeDocument = new EventTarget();
    Object.defineProperty(fakeDocument, 'hidden', { value: false, writable: true });
    globalThis.document = fakeDocument;
    const input = new KeyboardInput(target);

    target.dispatchEvent(keyEvent('keydown', 'KeyA'));
    expect(input.read().steer).toBe(1);
    target.dispatchEvent(keyEvent('keyup', 'KeyA'));
    target.dispatchEvent(keyEvent('keydown', 'ArrowLeft'));
    expect(input.read().steer).toBe(1);
    target.dispatchEvent(keyEvent('keyup', 'ArrowLeft'));

    target.dispatchEvent(keyEvent('keydown', 'KeyD'));
    expect(input.read().steer).toBe(-1);
    target.dispatchEvent(keyEvent('keyup', 'KeyD'));
    target.dispatchEvent(keyEvent('keydown', 'ArrowRight'));
    expect(input.read().steer).toBe(-1);

    input.dispose();
  });

  it('reports Space exactly once per press and clears it when focus is lost', () => {
    const target = new EventTarget();
    const fakeDocument = new EventTarget();
    Object.defineProperty(fakeDocument, 'hidden', { value: false, writable: true });
    globalThis.document = fakeDocument;
    const input = new KeyboardInput(target);

    target.dispatchEvent(keyEvent('keydown', 'Space'));
    expect(input.read().useItem).toBe(true);
    expect(input.read().useItem).toBe(false);
    target.dispatchEvent(keyEvent('keydown', 'Space'));
    expect(input.read().useItem).toBe(false);

    target.dispatchEvent(new Event('blur'));
    expect(input.read().useItem).toBe(false);
    target.dispatchEvent(keyEvent('keydown', 'Space'));
    expect(input.read().useItem).toBe(true);

    input.dispose();
  });
});
