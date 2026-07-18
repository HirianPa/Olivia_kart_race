import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { resolveKartCollisions } from '../src/race/KartCollisions.js';
import { ItemSystem } from '../src/items/ItemSystem.js';
import { CoinSystem } from '../src/items/CoinSystem.js';
import { ProjectileSystem } from '../src/items/ProjectileSystem.js';
import { createKartModel } from '../src/kart/createKartModel.js';

describe('gameplay polish regressions', () => {
  it('turns a kart-to-kart contact into a bounded physical rebound', () => {
    const contacts = [];
    const a = { group: { position: new THREE.Vector3(0, 0, 0) }, velocity: new THREE.Vector3(), forwardSpeed: 24, onKartCollision: (...args) => contacts.push(['a', ...args]) };
    const b = { group: { position: new THREE.Vector3(1.2, 0, 0) }, velocity: new THREE.Vector3(), forwardSpeed: 8, onKartCollision: (...args) => contacts.push(['b', ...args]) };
    resolveKartCollisions([a, b]);
    expect(a.velocity.x).toBeLessThan(-1);
    expect(b.velocity.x).toBeGreaterThan(1);
    expect(a.forwardSpeed).toBeLessThan(24);
    expect(a.velocity.length()).toBeLessThan(8);
    expect(contacts).toHaveLength(2);
  });

  it('collects a box when the kart passes underneath its floating icon', () => {
    const system = new ItemSystem({ visuals: false });
    const kart = { group: { position: system.boxes[0].position.clone().setY(0.12).add(new THREE.Vector3(1.95, 0, 0)) } };
    expect(system.collectNearby(kart)).not.toBeNull();
  });

  it('collects a coin using road-plane distance despite its display height', () => {
    const system = new CoinSystem({ visuals: false });
    const kart = { group: { position: system.coins[0].position.clone().setY(0.12).add(new THREE.Vector3(1.8, 0, 0)) }, coinCount: 0 };
    expect(system.collectNearby(kart)).toBe(1);
  });

  it('supports a collectible coral shell projectile distinct from the defensive shield', () => {
    const track = { getClosestInfo: () => ({ tangent: new THREE.Vector3(0, 0, 1) }) };
    const owner = { group: new THREE.Group() };
    const system = new ProjectileSystem(track, { visuals: false });
    const projectile = system.fire(owner, 'shellshot');
    expect(projectile.type).toBe('shellshot');
  });

  it('gives each rival silhouette a distinct pilot palette', () => {
    const profiles = ['windupKey', 'dorsalFin', 'fan', 'pennant'].map((accessory) => {
      const model = createKartModel(0xff765f, 0xffd45c, accessory);
      return model.parts.driver.children[1].material.color.getHex();
    });
    expect(new Set(profiles).size).toBe(4);
  });
});
