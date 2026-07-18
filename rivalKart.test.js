import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { RivalKart } from '../src/race/RivalKart.js';
import { Track } from '../src/track/Track.js';
import { CoinSystem } from '../src/items/CoinSystem.js';
import { TrackFeatures } from '../src/track/TrackFeatures.js';

function makeFeatureTrack() {
  const track = {
    curve: { getLength: () => 100 },
    getSample(t) {
      return {
        center: new THREE.Vector3(t * 100, 0, 0),
        tangent: new THREE.Vector3(1, 0, 0),
        side: new THREE.Vector3(0, 0, 1),
      };
    },
  };
  track.features = new TrackFeatures(track, { visuals: false });
  return track;
}

describe('RivalKart', () => {
  it('advances around the spline and remains within barriers', () => {
    const track = new Track();
    const rival = new RivalKart(track, { t: 0.02, lane: 2, color: 0xff765f, maxSpeed: 31 });
    const start = rival.totalProgress;
    for (let i = 0; i < 1200; i += 1) rival.update(1 / 60, true);
    expect(rival.totalProgress).toBeGreaterThan(start + 0.4);
    const info = track.getClosestInfo(rival.group.position);
    expect(Math.abs(info.signedDistance)).toBeLessThan(track.width + 0.3);
  });

  it('does not move before the race starts', () => {
    const rival = new RivalKart(new Track(), { t: 0.1, lane: -2, color: 0x75c94b, maxSpeed: 30 });
    const start = rival.totalProgress;
    rival.update(1, false);
    expect(rival.totalProgress).toBe(start);
  });

  it('uses solar coins for the same top-speed bonus and drops them on an unshielded pearl', () => {
    const track = makeFeatureTrack();
    const rival = new RivalKart(track, { t: 0.02, maxSpeed: 30 });
    const coins = new CoinSystem({ visuals: false });
    rival.coinSystem = coins;
    coins.coins[0].position.copy(rival.group.position);
    expect(coins.collectNearby(rival)).toBe(1);
    expect(coins.collectNearby(rival)).toBeNull();
    rival.coinCount = 10;

    for (let frame = 0; frame < 240; frame += 1) rival.update(1 / 60, true);

    expect(rival.speed).toBeGreaterThan(31.9);
    expect(rival.receivePearlHit()).toEqual({ blocked: false });
    expect(rival.coinCount).toBe(7);
    expect(coins.droppedCoins.filter((coin) => coin.active)).toHaveLength(3);
  });

  it('gets a timed boost from a pad and treats a ramp as one visual jump before landing', () => {
    const track = makeFeatureTrack();
    const padRival = new RivalKart(track, { t: 0.08, lane: 0, maxSpeed: 30 });
    padRival.update(1 / 120, true);
    expect(padRival.padBoostTimer).toBeGreaterThan(0);

    const rampRival = new RivalKart(track, { t: 0.19, lane: 0, maxSpeed: 30 });
    rampRival.update(1 / 60, true);
    expect(rampRival.visual.position.y).toBeGreaterThan(0.04);
    const launches = rampRival.jump.launches;
    for (let frame = 0; frame < 120; frame += 1) rampRival.update(1 / 60, true);
    expect(rampRival.jump.airborne).toBe(false);
    expect(rampRival.jump.launches).toBe(launches);
    expect(rampRival.visual.position.y).toBeCloseTo(0.04, 3);
  });

  it('holds a pearl until a rival is actually ahead in its forward firing cone', () => {
    const track = makeFeatureTrack();
    const rival = new RivalKart(track, { t: 0.1, lane: 0 });
    rival.itemUseTimer = 0;

    expect(rival.tickItemDecision(0, { item: 'pearl', participants: [rival] })).toBe(false);
  });

  it('uses each rival item only in a useful, deterministic race context', () => {
    const track = makeFeatureTrack();
    const rival = new RivalKart(track, { t: 0.1, lane: 0, maxSpeed: 30 });
    const ahead = new RivalKart(track, { t: 0.2, lane: 0, maxSpeed: 30 });
    rival.speed = 12;
    rival.itemUseTimer = 0;
    expect(rival.tickItemDecision(0, { item: 'bubble', straight: false, targetSpeed: 30 })).toBe(true);

    rival.speed = 30;
    rival.itemUseTimer = 0;
    expect(rival.tickItemDecision(0, { item: 'bubble', straight: false, targetSpeed: 30 })).toBe(false);

    rival.itemUseTimer = 0;
    expect(rival.tickItemDecision(0, { item: 'pearl', participants: [rival, ahead] })).toBe(true);

    rival.itemUseTimer = 0;
    expect(rival.tickItemDecision(0, { item: 'shell', threatened: false, defensive: false })).toBe(false);
    rival.itemUseTimer = 0;
    expect(rival.tickItemDecision(0, { item: 'shell', threatened: true })).toBe(true);
  });
});
