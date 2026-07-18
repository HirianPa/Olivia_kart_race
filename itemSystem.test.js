import { describe, expect, it } from 'vitest';
import { ItemSystem } from '../src/items/ItemSystem.js';
import { RaceDirector } from '../src/race/RaceDirector.js';

describe('ItemSystem', () => {
  it('keeps one item per kart, clears it on use, and respawns its box after four seconds', () => {
    const system = new ItemSystem({ visuals: false });
    const kart = { name: 'Marea' };
    const box = system.boxes[0];

    expect(system.collect(kart, box.id)).toBe('bubble');
    expect(system.inventoryOf(kart)).toBe('bubble');
    expect(system.collect(kart, system.boxes[1].id)).toBeNull();

    expect(system.use(kart)).toEqual({ type: 'bubble', kart });
    expect(system.inventoryOf(kart)).toBeNull();
    expect(system.collect(kart, box.id)).toBeNull();

    system.update(3.99);
    expect(system.collect(kart, box.id)).toBeNull();
    system.update(0.01);
    expect(system.collect(kart, box.id)).toBe('bubble');
  });

  it('asks the race director to choose an item using the collector race position', () => {
    const calls = [];
    const director = {
      chooseItem(context) {
        calls.push(context);
        return 'shell';
      },
    };
    const kart = { name: 'Marea' };
    const system = new ItemSystem({
      visuals: false,
      raceDirector: director,
      getRacePosition: (collector) => collector === kart ? { position: 5, total: 5 } : null,
      random: 0.77,
    });

    expect(system.collect(kart, system.boxes[0].id)).toBe('shell');
    expect(calls).toEqual([{ position: 5, total: 5, random: 0.77 }]);
  });

  it('can distribute items deterministically through the built-in director callback', () => {
    const kart = { name: 'Marea' };
    const system = new ItemSystem({
      visuals: false,
      raceDirector: new RaceDirector(),
      getRacePosition: () => ({ position: 5, total: 5 }),
      random: () => 0.02,
    });

    expect(system.collect(kart, system.boxes[0].id)).toBe('bubble');
  });
});
