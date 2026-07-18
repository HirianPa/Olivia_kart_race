import { describe, expect, it } from 'vitest';
import { RaceManager } from '../src/race/RaceManager.js';

const racer = (name, progress = 0.05) => ({ name, progress });

describe('RaceManager', () => {
  it('counts down before enabling the race', () => {
    const player = racer('Marea');
    const race = new RaceManager([player], { laps: 3, countdown: 3 });
    race.update(2.9);
    expect(race.raceActive).toBe(false);
    race.update(0.2);
    expect(race.raceActive).toBe(true);
  });

  it('counts one lap for a forward seam crossing without double counting', () => {
    const player = racer('Marea', 0.94);
    const race = new RaceManager([player], { laps: 3, countdown: 0 });
    race.update(0.01);
    player.progress = 0.04;
    race.update(0.01);
    race.update(0.01);
    expect(race.snapshot(player).completedLaps).toBe(1);
  });

  it('orders racers by completed laps then progress', () => {
    const player = racer('Marea', 0.3);
    const rival = racer('Coralín', 0.8);
    const race = new RaceManager([player, rival], { laps: 3, countdown: 0 });
    race.update(0.01);
    expect(race.snapshot(player).position).toBe(2);
    player.progress = 0.95;
    race.update(0.01);
    player.progress = 0.05;
    race.update(0.01);
    expect(race.snapshot(player).position).toBe(1);
  });

  it('finishes when the player completes lap three', () => {
    const player = racer('Marea', 0.95);
    const race = new RaceManager([player], { laps: 3, countdown: 0 });
    race.update(0.01);
    for (let lap = 0; lap < 3; lap += 1) {
      player.progress = 0.04;
      race.update(0.01);
      player.progress = 0.95;
      race.update(0.01);
    }
    expect(race.snapshot(player).state).toBe('finished');
  });
});
