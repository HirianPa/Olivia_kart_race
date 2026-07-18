import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CoinSystem } from '../src/items/CoinSystem.js';

function makeKart(name = 'Marea', x = 0, z = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0.12, z);
  return { name, group, coinCount: 0 };
}

describe('CoinSystem', () => {
  it('caps collected solar coins at ten', () => {
    const system = new CoinSystem({ visuals: false });
    const kart = makeKart();
    const coin = system.coins[0];

    for (let index = 0; index < 12; index += 1) {
      coin.active = true;
      expect(system.collect(kart, coin.id)).toBeLessThanOrEqual(10);
    }

    expect(kart.coinCount).toBe(10);
  });

  it('converts every solar coin into exactly 0.22 max-speed bonus', () => {
    const system = new CoinSystem({ visuals: false });
    const kart = makeKart();
    kart.coinCount = 7;

    expect(system.speedBonusOf(kart)).toBeCloseTo(1.54, 8);
  });

  it('drops at most three coins from an unshielded pearl hit and never below zero', () => {
    const system = new CoinSystem({ visuals: false });
    const kart = makeKart();
    kart.coinCount = 2;

    expect(system.drop(kart, 8)).toBe(2);
    expect(kart.coinCount).toBe(0);
    expect(system.drop(kart, 3)).toBe(0);
  });

  it('recycles dropped coins through a fixed pool of fifteen', () => {
    const system = new CoinSystem({ visuals: false });
    const kart = makeKart();
    kart.coinCount = 10;

    system.drop(kart, 3);
    const firstDropped = system.droppedCoins.filter((coin) => coin.active);
    expect(system.droppedCoins).toHaveLength(15);
    expect(firstDropped).toHaveLength(3);

    for (const coin of firstDropped) coin.active = false;
    kart.coinCount = 3;
    system.drop(kart, 3);

    expect(system.droppedCoins.filter((coin) => coin.active)).toHaveLength(3);
    expect(system.droppedCoins.filter((coin) => coin.active)).toEqual(firstDropped);
  });

  it('recycles the oldest active dropped coins when a full pool receives another loss', () => {
    const system = new CoinSystem({ visuals: false });
    const kart = makeKart();

    for (const [index, coin] of system.droppedCoins.entries()) {
      coin.active = true;
      coin.age = 15 - index;
    }
    kart.coinCount = 3;

    expect(system.drop(kart, 3)).toBe(3);
    expect(kart.coinCount).toBe(0);
    expect(system.droppedCoins).toHaveLength(15);
    expect(system.droppedCoins.filter((coin) => coin.active)).toHaveLength(15);
    expect(system.droppedCoins.slice(0, 3).map((coin) => coin.age)).toEqual([0, 0, 0]);
  });

  it('consumes coin feedback without retaining an unbounded event history', () => {
    const system = new CoinSystem({ visuals: false });
    const kart = makeKart();
    const coin = system.coins[0];

    expect(system.collect(kart, coin.id)).toBe(1);
    expect(system.consumeLatestEvent()).toMatchObject({ type: 'coin-collect', coinId: coin.id });
    expect(system.consumeLatestEvent()).toBeNull();
  });

  it('drains mixed player and rival coin events in FIFO order instead of overwriting one owner', () => {
    const system = new CoinSystem({ visuals: false });
    const rival = makeKart('CoralÃ­n');
    const player = makeKart('Marea');

    expect(system.collect(rival, system.coins[0].id)).toBe(1);
    expect(system.collect(player, system.coins[1].id)).toBe(1);

    expect(system.consumeLatestEvent()).toMatchObject({ type: 'coin-collect', kart: rival });
    expect(system.consumeLatestEvent()).toMatchObject({ type: 'coin-collect', kart: player });
    expect(system.consumeLatestEvent()).toBeNull();
  });

  it('bounds queued coin feedback while retaining the most recent events', () => {
    const system = new CoinSystem({ visuals: false });
    const coin = system.coins[0];

    for (let index = 0; index < 40; index += 1) {
      coin.active = true;
      system.collect(makeKart(`Kart ${index}`), coin.id);
    }

    const events = system.consumeEvents();
    expect(events).toHaveLength(24);
    expect(events[0].kart.name).toBe('Kart 16');
    expect(events.at(-1).kart.name).toBe('Kart 39');
    expect(system.consumeEvents()).toEqual([]);
  });
});
