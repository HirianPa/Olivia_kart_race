import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Track } from '../src/track/Track.js';

describe('Track', () => {
  const track = new Track();

  it('is continuous across the lap seam', () => {
    const start = track.getSample(0).center;
    const end = track.getSample(1).center;
    expect(start.distanceTo(end)).toBeLessThan(0.001);
  });

  it('recognizes the center line as road', () => {
    const center = track.getSample(0.25).center;
    const info = track.getClosestInfo(center);
    expect(info.onRoad).toBe(true);
    expect(Math.abs(info.signedDistance)).toBeLessThan(0.2);
  });

  it('pushes positions back inside the hard boundary', () => {
    const sample = track.getSample(0.4);
    const outside = sample.center.clone().addScaledVector(sample.side, sample.width + 3);
    const result = track.constrain(outside, new THREE.Vector3(4, 0, 0));
    expect(result.collided).toBe(true);
    const constrainedInfo = track.getClosestInfo(result.position);
    expect(constrainedInfo.onRoad).toBe(false);
    expect(Math.abs(constrainedInfo.signedDistance)).toBeGreaterThan(track.width);
  });

  it('reports the collision frame and outward speed needed for recovery', () => {
    const sample = track.getSample(0.4);
    const outside = sample.center.clone().addScaledVector(sample.side, sample.width + 3);
    const velocity = sample.side.clone().multiplyScalar(10);
    const result = track.constrain(outside, velocity);

    expect(result.info.signedDistance).toBeGreaterThan(track.width);
    expect(result.outwardSpeed).toBeCloseTo(10);
  });

  it('builds road triangles facing upward', () => {
    const road = track.group.children[1];
    const positions = road.geometry.attributes.position;
    const [ia, ib, ic] = road.geometry.index.array;
    const a = new THREE.Vector3().fromBufferAttribute(positions, ia);
    const b = new THREE.Vector3().fromBufferAttribute(positions, ib);
    const c = new THREE.Vector3().fromBufferAttribute(positions, ic);
    const normal = new THREE.Vector3().crossVectors(b.sub(a), c.sub(a)).normalize();
    expect(normal.y).toBeGreaterThan(0.99);
  });

  it('builds finish tiles across the road rather than along it', () => {
    const finishTile = track.group.children.at(-1);
    expect(finishTile.geometry.parameters.width).toBeGreaterThan(finishTile.geometry.parameters.depth);
  });
});
