import { describe, expect, it } from 'vitest';
import { Track } from '../src/track/Track.js';
import { ToyBoxEnvironment } from '../src/scene/ToyBoxEnvironment.js';

function visualResources(group) {
  const objects = [];
  const geometries = new Set();
  const materials = new Set();
  group.traverse((object) => {
    objects.push(object);
    if (object.geometry) geometries.add(object.geometry);
    if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material));
    else if (object.material) materials.add(object.material);
  });
  return { objects, geometries, materials };
}

describe('ToyBoxEnvironment', () => {
  it('builds a deterministic toy-box circuit below the scene object budget with shared resources', () => {
    const environment = new ToyBoxEnvironment(new Track());
    const first = visualResources(environment.group);
    const second = visualResources(new ToyBoxEnvironment(new Track()).group);

    expect(first.objects.length).toBeLessThan(350);
    expect(first.objects.length).toBe(second.objects.length);
    expect(first.geometries.size).toBeLessThan(first.objects.length / 3);
    expect(first.materials.size).toBeLessThan(first.objects.length / 4);
  });

  it('removes optional background decoration predictably at low quality', () => {
    const environment = new ToyBoxEnvironment(new Track());
    environment.setQuality('low');

    const hiddenOnLow = environment.optionalGroups.filter((group) => !group.visible).length;

    expect(hiddenOnLow).toBeGreaterThan(0);
    environment.setQuality('high');
    expect(environment.optionalGroups.every((group) => group.visible)).toBe(true);
  });
});
