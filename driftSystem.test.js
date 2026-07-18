import { describe, expect, it } from 'vitest';
import { DriftSystem } from '../src/kart/DriftSystem.js';

const frame = (overrides = {}) => ({ held: true, steer: 1, speed: 20, slip: 4, collided: false, ...overrides });

describe('DriftSystem', () => {
  it('requires speed and steering to activate', () => {
    const drift = new DriftSystem();
    expect(drift.update(1 / 60, frame({ speed: 4 })).active).toBe(false);
    expect(drift.update(1 / 60, frame()).active).toBe(true);
  });

  it('charges blue and orange levels while sliding', () => {
    const drift = new DriftSystem();
    for (let i = 0; i < 45; i += 1) drift.update(1 / 60, frame());
    expect(drift.level).toBe(1);
    for (let i = 0; i < 65; i += 1) drift.update(1 / 60, frame());
    expect(drift.level).toBe(2);
  });

  it('releases the reached boost and resets', () => {
    const drift = new DriftSystem();
    for (let i = 0; i < 45; i += 1) drift.update(1 / 60, frame());
    const released = drift.update(1 / 60, frame({ held: false }));
    expect(released.releasedBoost).toBe(1);
    expect(drift.charge).toBe(0);
  });

  it('reduces charge on collision', () => {
    const drift = new DriftSystem();
    for (let i = 0; i < 50; i += 1) drift.update(1 / 60, frame());
    const before = drift.charge;
    drift.update(1 / 60, frame({ collided: true }));
    expect(drift.charge).toBeLessThan(before * 0.5);
  });
});
