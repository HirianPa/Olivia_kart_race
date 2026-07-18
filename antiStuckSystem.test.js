import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { AntiStuckSystem } from '../src/kart/AntiStuckSystem.js';

describe('AntiStuckSystem', () => {
  it('adds an inward inset and a tangential escape bias on collision', () => {
    const system = new AntiStuckSystem();
    const tangent = new THREE.Vector3(0, 0, 1);
    const side = new THREE.Vector3(1, 0, 0);

    const result = system.update(1 / 30, {
      collided: true,
      speed: 18,
      outwardSpeed: 18,
      steer: 1,
      brake: 1,
      sideSign: 1,
      tangent,
      side,
    });

    expect(result.inset).toBe(0.08);
    expect(result.velocityBias.dot(tangent)).toBeCloseTo(1.5);
    expect(result.velocityBias.dot(side)).toBeCloseTo(0);
    expect(result.headingBlend).toBe(0);
  });

  it('blends the heading toward the tangent after 0.6 seconds of stalled contact', () => {
    const system = new AntiStuckSystem();
    const tangent = new THREE.Vector3(0, 0, 1);
    const side = new THREE.Vector3(1, 0, 0);
    let result;

    for (let frame = 0; frame < 18; frame += 1) {
      result = system.update(1 / 30, {
        collided: true,
        speed: 0,
        outwardSpeed: 0,
        steer: 0,
        brake: 0,
        sideSign: 1,
        tangent,
        side,
      });
    }

    expect(result.headingBlend).toBe(0.25);
  });
});
