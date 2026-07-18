import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { KartAnimator } from '../src/kart/KartAnimator.js';

function createParts() {
  return {
    wheels: Array.from({ length: 4 }, () => new THREE.Group()),
    steering: new THREE.Group(),
    driver: new THREE.Group(),
    suspension: new THREE.Group(),
  };
}

describe('KartAnimator', () => {
  it('rolls wheels and clamps steering from a driving snapshot', () => {
    const parts = createParts();
    const animator = new KartAnimator(parts);

    animator.update(0.25, { speed: 20, steer: 4 });

    expect(parts.wheels.every((wheel) => Math.abs(wheel.rotation.x) > 0.1)).toBe(true);
    expect(Math.abs(parts.steering.rotation.y)).toBeLessThanOrEqual(0.48);
    expect(parts.steering.rotation.y).toBeGreaterThan(0);
  });

  it('damps suspension after a landing instead of leaving the body compressed', () => {
    const parts = createParts();
    const animator = new KartAnimator(parts);

    animator.update(1 / 60, { speed: 18, airborne: true });
    animator.update(1 / 60, { speed: 18, landed: true });
    const compression = parts.suspension.position.y;
    for (let frame = 0; frame < 90; frame += 1) animator.update(1 / 60, { speed: 18 });

    expect(compression).toBeLessThan(-0.01);
    expect(parts.suspension.position.y).toBeCloseTo(0, 2);
  });

  it('plays a bounded hit reaction then returns the driver to neutral', () => {
    const parts = createParts();
    const animator = new KartAnimator(parts);

    animator.update(1 / 60, { hit: true });
    const hitPose = parts.driver.rotation.z;
    animator.update(0.6, {});

    expect(Math.abs(hitPose)).toBeGreaterThan(0.05);
    expect(parts.driver.rotation.z).toBeCloseTo(0, 2);
  });
});
