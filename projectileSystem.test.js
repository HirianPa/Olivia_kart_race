import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ProjectileSystem } from '../src/items/ProjectileSystem.js';

function makeTrack() {
  return {
    getClosestInfo() {
      return { tangent: new THREE.Vector3(0, 0, 1) };
    },
  };
}

function makeKart(name, z = 0) {
  const group = new THREE.Group();
  group.position.set(0, 0.12, z);
  return {
    name,
    group,
    hits: 0,
    receivePearlHit() {
      this.hits += 1;
      return { blocked: false };
    },
  };
}

describe('ProjectileSystem', () => {
  it('expires a pearl safely and keeps a fixed active projectile per owner', () => {
    const owner = makeKart('Marea');
    const system = new ProjectileSystem(makeTrack(), { visuals: false, lifetime: 0.1 });

    expect(system.fire(owner)).not.toBeNull();
    expect(system.fire(owner)).toBeNull();
    system.update(0.11, [owner]);

    expect(system.activeCount).toBe(0);
  });

  it('hits another kart and never hits its owner', () => {
    const owner = makeKart('Marea');
    const target = makeKart('Coralin', 3);
    const system = new ProjectileSystem(makeTrack(), { visuals: false, speed: 20 });

    system.fire(owner);
    system.update(0.2, [owner, target]);

    expect(owner.hits).toBe(0);
    expect(target.hits).toBe(1);
    expect(system.events).toContainEqual({ target, owner });
  });
});
