import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FollowCamera } from '../src/scene/FollowCamera.js';

describe('FollowCamera', () => {
  it('starts at the desired chase offset and follows smoothly', () => {
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 650);
    const target = new THREE.Group();
    target.position.set(10, 0, 20);
    const follow = new FollowCamera(camera, target);
    expect(camera.position.distanceTo(new THREE.Vector3(10, 5.5, 9.5))).toBeLessThan(0.001);

    target.position.z += 10;
    follow.update(1 / 60, 0.5);
    expect(camera.position.z).toBeGreaterThan(9.5);
    expect(camera.position.z).toBeLessThan(19.5);
  });

  it('adds a bounded shake without contaminating the damped chase position', () => {
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 650);
    const target = new THREE.Group();
    const follow = new FollowCamera(camera, target);
    const chasePosition = follow.basePosition.clone();

    follow.shake(10);
    follow.update(1 / 60);

    expect(follow.shakeStrength).toBeLessThanOrEqual(0.38);
    expect(camera.position.distanceTo(chasePosition)).toBeGreaterThan(0);
    for (let frame = 0; frame < 90; frame += 1) follow.update(1 / 60);
    expect(follow.shakeStrength).toBeLessThan(0.01);
    expect(camera.position.distanceTo(follow.basePosition)).toBeLessThan(0.01);
  });
});
