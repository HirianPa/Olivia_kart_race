import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SlipstreamSystem } from '../src/kart/SlipstreamSystem.js';

const racer = (x, z, heading = 0) => ({
  group: { position: new THREE.Vector3(x, 0, z), rotation: { y: heading } },
  heading,
});

describe('SlipstreamSystem', () => {
  it('charges while a target is close and directly ahead', () => {
    const slipstream = new SlipstreamSystem();
    const player = racer(0, 0, 0);
    const target = racer(0, 9, 0);

    for (let frame = 0; frame < 60; frame += 1) {
      slipstream.update(1 / 60, { player, targets: [target] });
    }

    expect(slipstream.charge).toBeCloseTo(1);
  });

  it('decays charge when the target leaves the forward cone', () => {
    const slipstream = new SlipstreamSystem();
    const player = racer(0, 0, 0);
    const target = racer(0, 9, 0);
    for (let frame = 0; frame < 60; frame += 1) slipstream.update(1 / 60, { player, targets: [target] });

    target.group.position.set(9, 0, 0);
    for (let frame = 0; frame < 30; frame += 1) slipstream.update(1 / 60, { player, targets: [target] });

    expect(slipstream.charge).toBeGreaterThan(0);
    expect(slipstream.charge).toBeLessThan(1);
  });

  it('releases exactly one boost after a full draft charge', () => {
    const slipstream = new SlipstreamSystem();
    const player = racer(0, 0, 0);
    const target = racer(0, 9, 0);
    let releases = 0;

    for (let frame = 0; frame < 90; frame += 1) {
      if (slipstream.update(1 / 60, { player, targets: [target] }).boost) releases += 1;
    }

    expect(releases).toBe(1);
    expect(slipstream.charge).toBe(0);
  });
});
