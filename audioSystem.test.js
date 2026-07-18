import { describe, expect, it, vi } from 'vitest';
import { AudioSystem } from '../src/audio/AudioSystem.js';

function makeContext() {
  const oscillators = [];
  const gains = [];
  const destination = {};
  const gain = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  return {
    currentTime: 4,
    destination,
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    createGain: vi.fn(() => {
      const node = { gain: gain(), connect: vi.fn(), disconnect: vi.fn() };
      gains.push(node);
      return node;
    }),
    createOscillator: vi.fn(() => {
      const node = { frequency: gain(), type: 'sine', connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(node);
      return node;
    }),
    oscillators,
    gains,
  };
}

describe('AudioSystem', () => {
  it('silently degrades when audio context creation is unavailable', () => {
    const audio = new AudioSystem({ contextFactory: () => { throw new Error('blocked'); } });

    expect(audio.unlock()).toBe(false);
    expect(audio.updateEngine(24, true)).toBe(false);
    expect(audio.play('turbo')).toBe(false);
    expect(() => audio.dispose()).not.toThrow();
  });

  it('unlocks only once and retains a bounded engine voice pair', () => {
    const context = makeContext();
    const audio = new AudioSystem({ contextFactory: () => context });

    expect(audio.unlock()).toBe(true);
    expect(audio.unlock()).toBe(true);
    audio.updateEngine(10, false);
    audio.updateEngine(32, true);

    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('applies cooldowns to repeated event sounds', () => {
    const context = makeContext();
    let now = 10;
    const audio = new AudioSystem({ contextFactory: () => context, now: () => now });
    audio.unlock();

    expect(audio.play('drift')).toBe(true);
    expect(audio.play('drift')).toBe(false);
    now += 0.12;
    expect(audio.play('drift')).toBe(true);
  });

  it('stops and disconnects created audio nodes on disposal', () => {
    const context = makeContext();
    const audio = new AudioSystem({ contextFactory: () => context });
    audio.unlock();
    audio.updateEngine(20, true);
    audio.play('countdown');
    audio.dispose();

    expect(context.oscillators.every((node) => node.stop.mock.calls.length === 1 && node.disconnect.mock.calls.length === 1)).toBe(true);
    expect(context.gains.every((node) => node.disconnect.mock.calls.length === 1)).toBe(true);
  });
});
