import { describe, expect, it } from 'vitest';
import { JumpSystem } from '../src/kart/JumpSystem.js';

describe('JumpSystem', () => {
  it('launches only once while the kart remains on a ramp', () => {
    const jump = new JumpSystem();

    const first = jump.update(1 / 60, { ramp: true, driftPressed: false });
    const second = jump.update(1 / 60, { ramp: true, driftPressed: false });

    expect(first.height).toBeGreaterThan(0);
    expect(second.height).toBeGreaterThan(first.height);
    expect(jump.launches).toBe(1);
  });

  it('follows a parabolic arc and reports its landing once', () => {
    const jump = new JumpSystem();
    jump.update(1 / 60, { ramp: true, driftPressed: false });
    let peak = 0;
    let landing;
    for (let frame = 0; frame < 90; frame += 1) {
      const state = jump.update(1 / 60, { ramp: false, driftPressed: false });
      peak = Math.max(peak, state.height);
      if (state.landed) landing = state;
    }

    expect(peak).toBeGreaterThan(0.7);
    expect(landing).toMatchObject({ height: 0, landed: true, trickBoost: 0 });
    expect(jump.update(1 / 60, { ramp: false, driftPressed: false }).landed).toBe(false);
  });

  it('awards a trick only when Shift is pressed within .22 seconds of landing', () => {
    const jump = new JumpSystem();
    jump.update(1 / 60, { ramp: true, driftPressed: false });
    let landing;
    for (let frame = 0; frame < 90; frame += 1) {
      const state = jump.update(1 / 60, { ramp: false, driftPressed: frame > 27 });
      if (state.landed) landing = state;
    }

    expect(landing).toMatchObject({ landed: true, trickBoost: 1 });
  });

  it('does not award a trick when Shift is held from takeoff through landing', () => {
    const jump = new JumpSystem();
    let landing;

    for (let frame = 0; frame < 90; frame += 1) {
      const state = jump.update(1 / 60, { ramp: frame === 0, driftPressed: true });
      if (state.landed) landing = state;
    }

    expect(landing).toMatchObject({ landed: true, trickBoost: 0 });
  });

  it('does not award a trick for an early Shift press released before the final window', () => {
    const jump = new JumpSystem();
    let landing;

    for (let frame = 0; frame < 90; frame += 1) {
      const state = jump.update(1 / 60, { ramp: frame === 0, driftPressed: frame === 6 });
      if (state.landed) landing = state;
    }

    expect(landing).toMatchObject({ landed: true, trickBoost: 0 });
  });

  it('awards exactly one trick for a new Shift press during the final window', () => {
    const jump = new JumpSystem();
    let boosts = 0;

    for (let frame = 0; frame < 90; frame += 1) {
      const state = jump.update(1 / 60, { ramp: frame === 0, driftPressed: frame === 29 });
      boosts += state.trickBoost;
    }

    expect(boosts).toBe(1);
  });
});
