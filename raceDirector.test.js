import { afterEach, describe, expect, it, vi } from 'vitest';
import { RaceDirector } from '../src/race/RaceDirector.js';

afterEach(() => vi.restoreAllMocks());

describe('RaceDirector', () => {
  it('keeps a useful pearl chance while giving the back of the pack more recovery items', () => {
    const director = new RaceDirector();
    const samples = Array.from({ length: 100 }, (_, index) => index / 100);
    const count = (position) => samples.reduce((totals, random) => {
      totals[director.chooseItem({ position, total: 5, random })] += 1;
      return totals;
    }, { bubble: 0, pearl: 0, shell: 0, shellshot: 0 });

    const leader = count(1);
    const last = count(5);

    expect(leader.bubble).toBeLessThanOrEqual(8);
    expect(last.bubble + last.shell).toBeGreaterThan(leader.bubble + leader.shell);
    expect(last.pearl).toBeGreaterThan(20);
  });

  it('is deterministic for numeric and function random sources', () => {
    const director = new RaceDirector();

    expect(director.chooseItem({ position: 3, total: 5, random: 0.49 })).toBe('pearl');
    expect(director.chooseItem({ position: 3, total: 5, random: () => 0.49 })).toBe('pearl');
  });

  it('clamps malformed inputs to safe item rolls', () => {
    const director = new RaceDirector();

    expect(director.chooseItem({ position: -20, total: 0, random: -4 })).toBe('bubble');
    expect(director.chooseItem({ position: 'last', total: Number.NaN, random: () => Number.NaN })).toBe('pearl');
    expect(director.chooseItem({ position: 99, total: 4, random: 8 })).toBe('shell');
  });

  it('uses runtime randomness when no deterministic source is supplied', () => {
    const director = new RaceDirector();
    const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0.01).mockReturnValueOnce(0.5);

    expect(director.chooseItem({ position: 1, total: 5 })).toBe('bubble');
    expect(director.chooseItem({ position: 1, total: 5 })).toBe('pearl');
    expect(random).toHaveBeenCalledTimes(2);
  });

  it('safely normalizes null and malformed selection contexts', () => {
    const director = new RaceDirector();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(director.chooseItem(null)).toBe('pearl');
    expect(director.chooseItem(undefined)).toBe('pearl');
    expect(director.chooseItem('not-a-context')).toBe('pearl');
    expect(director.chooseItem({ random: null })).toBe('pearl');
  });

  it('falls back safely for hostile injected random values', () => {
    const director = new RaceDirector();
    const hostileSources = [
      Symbol('roll'),
      () => Symbol('roll'),
      { valueOf() { throw new Error('no conversion'); } },
    ];

    hostileSources.forEach((random) => {
    expect(['bubble', 'pearl', 'shell', 'shellshot']).toContain(director.chooseItem({ position: 3, total: 5, random }));
    });
  });
});
