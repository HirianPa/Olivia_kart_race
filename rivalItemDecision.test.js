import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { shouldRivalUseItem } from '../src/race/RivalItemDecision.js';

function kart(x, z, heading = 0, speed = 30) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  return { group, speed, maxSpeed: 30 };
}

describe('shouldRivalUseItem', () => {
  it('keeps bubble boosts for straights or recovery from lost pace', () => {
    const self = kart(0, 0, 0, 30);

    expect(shouldRivalUseItem({ item: 'bubble', self, straight: false, targetSpeed: 30 })).toBe(false);
    expect(shouldRivalUseItem({ item: 'bubble', self, straight: true, targetSpeed: 30 })).toBe(true);
    self.speed = 18;
    expect(shouldRivalUseItem({ item: 'bubble', self, straight: false, targetSpeed: 30 })).toBe(true);
  });

  it('fires pearls only into a forward, in-range opponent cone', () => {
    const self = kart(0, 0);
    const ahead = kart(0, 12);
    const behind = kart(0, -8);
    const distant = kart(0, 40);

    expect(shouldRivalUseItem({ item: 'pearl', self, participants: [self, behind, distant] })).toBe(false);
    expect(shouldRivalUseItem({ item: 'pearl', self, participants: [self, ahead] })).toBe(true);
  });

  it('uses the shell only for defensive pressure or a nearby threat', () => {
    const self = kart(0, 0);
    const behind = kart(0, -7);
    const closePearl = { active: true, owner: behind, position: new THREE.Vector3(0, 0, 5) };

    expect(shouldRivalUseItem({ item: 'shell', self, participants: [self] })).toBe(false);
    expect(shouldRivalUseItem({ item: 'shell', self, participants: [self, behind] })).toBe(true);
    expect(shouldRivalUseItem({ item: 'shell', self, projectiles: [closePearl] })).toBe(true);
  });
});
