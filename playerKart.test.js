import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PlayerKart } from '../src/kart/PlayerKart.js';
import { Track } from '../src/track/Track.js';

class OpenTestTrack {
  getSample() {
    return {
      center: { x: 0, y: 0, z: 0, clone: () => new THREE.Vector3() },
      tangent: new THREE.Vector3(0, 0, 1),
    };
  }

  getClosestInfo() { return { onRoad: true }; }

  constrain(position, velocity) {
    return {
      position: position.clone(),
      velocity: velocity.clone(),
      collided: false,
      outwardSpeed: 0,
      info: {
        signedDistance: 0,
        tangent: new THREE.Vector3(0, 0, 1),
        side: new THREE.Vector3(1, 0, 0),
      },
    };
  }
}

describe('PlayerKart', () => {
  it('accelerates progressively and respects max speed', () => {
    const kart = new PlayerKart(new OpenTestTrack());
    for (let i = 0; i < 600; i += 1) {
      kart.update(1 / 60, { throttle: 1, brake: 0, steer: 0 });
    }
    expect(kart.speed).toBeGreaterThan(25);
    expect(kart.speed).toBeLessThanOrEqual(38.01);
  });

  it('adds exactly 0.22 max speed for each solar coin', () => {
    const kart = new PlayerKart(new OpenTestTrack());
    kart.coinCount = 10;
    for (let i = 0; i < 720; i += 1) {
      kart.update(1 / 60, { throttle: 1, brake: 0, steer: 0 });
    }
    expect(kart.getCoinSpeedBonus()).toBeCloseTo(2.2, 8);
    expect(kart.speed).toBeCloseTo(40.2, 1);
  });

  it('loses speed while coasting', () => {
    const kart = new PlayerKart(new OpenTestTrack());
    for (let i = 0; i < 120; i += 1) kart.update(1 / 60, { throttle: 1, brake: 0, steer: 0 });
    const before = kart.speed;
    for (let i = 0; i < 60; i += 1) kart.update(1 / 60, { throttle: 0, brake: 0, steer: 0 });
    expect(kart.speed).toBeLessThan(before);
  });

  it('remains on the road under sustained steering', () => {
    const track = new Track();
    const kart = new PlayerKart(track);
    for (let i = 0; i < 900; i += 1) kart.update(1 / 60, { throttle: 1, brake: 0, steer: 1 });
    const info = track.getClosestInfo(kart.group.position);
    expect(Math.abs(info.signedDistance)).toBeLessThanOrEqual(track.width + 0.31);
  });

  it('recovers from a frontal barrier impact while braking and steering', () => {
    const track = new Track();
    const kart = new PlayerKart(track);
    const sample = track.getSample(0.25);
    kart.group.position.copy(sample.center).addScaledVector(sample.side, track.width + 0.29);
    kart.heading = Math.atan2(sample.side.x, sample.side.z);
    kart.group.rotation.y = kart.heading;
    kart.forwardSpeed = 18;

    kart.update(1 / 30, { throttle: 0, brake: 1, steer: 1 });

    const impactInfo = track.getClosestInfo(kart.group.position);
    expect(Math.abs(impactInfo.signedDistance)).toBeLessThanOrEqual(track.width + 0.22);

    for (let i = 1; i < 30; i += 1) {
      kart.update(1 / 30, { throttle: 0, brake: 1, steer: 1 });
    }

    const recoveredInfo = track.getClosestInfo(kart.group.position);
    expect(Math.abs(recoveredInfo.signedDistance)).toBeLessThan(track.width);
    expect(kart.forwardSpeed).toBeLessThan(0);
  });
});
