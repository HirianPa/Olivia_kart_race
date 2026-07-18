import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { resolveKartCollisions } from '../src/race/KartCollisions.js';

const kart = (x) => ({ group: { position: new THREE.Vector3(x, 0, 0) }, velocity: new THREE.Vector3(), forwardSpeed: 20 });

describe('resolveKartCollisions', () => {
  it('separates overlapping karts with bounded impulses', () => {
    const a = kart(0);
    const b = kart(1);
    resolveKartCollisions([a, b]);
    expect(a.group.position.distanceTo(b.group.position)).toBeGreaterThanOrEqual(2.89);
    expect(a.velocity.length()).toBeLessThanOrEqual(8);
    expect(b.velocity.length()).toBeLessThanOrEqual(8);
  });
});
