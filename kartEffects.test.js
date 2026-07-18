import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { KartEffects } from '../src/effects/KartEffects.js';

describe('KartEffects', () => {
  it('preallocates exactly seventy-two reusable effect slots', () => {
    const effects = new KartEffects({ visuals: false });

    expect(effects.pool).toHaveLength(72);
    expect(effects.group.children).toHaveLength(0);
  });

  it('recycles the oldest active slot deterministically when saturated', () => {
    const effects = new KartEffects({ visuals: false });
    const position = new THREE.Vector3(3, 1, -2);
    for (let index = 0; index < 72; index += 1) effects.emit('smoke', position, 0xffffff);

    const first = effects.pool[0];
    effects.emit('impact', position, 0xff7755);

    expect(effects.activeCount).toBe(72);
    expect(effects.pool[0]).toBe(first);
    expect(first.type).toBe('impact');
    expect(first.age).toBe(0);
  });

  it('expires effects after their short lifetime', () => {
    const effects = new KartEffects({ visuals: false });
    effects.emit('spark', new THREE.Vector3(), 0x5bc8ff);

    effects.update(2);

    expect(effects.activeCount).toBe(0);
  });

  it('never grows or replaces its pool after construction', () => {
    const effects = new KartEffects({ visuals: false });
    const pool = effects.pool;
    const slots = [...effects.pool];
    const position = new THREE.Vector3();

    for (let index = 0; index < 180; index += 1) {
      effects.emit(index % 2 ? 'dust' : 'streak', position, 0xffffff);
      effects.update(1 / 60);
    }

    expect(effects.pool).toBe(pool);
    expect(effects.pool).toEqual(slots);
    expect(effects.pool).toHaveLength(72);
  });

  it('shares a bounded palette of visual materials across pooled slots', () => {
    const effects = new KartEffects();
    const position = new THREE.Vector3();

    for (let index = 0; index < 72; index += 1) {
      effects.emit(index % 3 === 0 ? 'spark' : index % 3 === 1 ? 'impact' : 'smoke', position, index % 2 ? 0x5bc8ff : 0xff8c42);
    }

    const materials = new Set(effects.pool.map((slot) => slot.mesh.material));
    expect(effects.pool[0].mesh.material).toBe(effects.pool[6].mesh.material);
    expect(materials.size).toBeLessThanOrEqual(16);
    expect(materials.size).toBeLessThan(72);
  });

  it('keeps the blue and orange drift variants visually distinct', () => {
    const effects = new KartEffects();
    const position = new THREE.Vector3();

    const blue = effects.emit('spark', position, 0x5bc8ff);
    const orange = effects.emit('spark', position, 0xff8c42);

    expect(blue.mesh.material).not.toBe(orange.mesh.material);
    expect(blue.mesh.material.color.getHex()).toBe(0x5bc8ff);
    expect(orange.mesh.material.color.getHex()).toBe(0xff8c42);
  });

  it('prebuilds the complete material palette before emissions', () => {
    const effects = new KartEffects();
    const materials = effects.materials;
    const identities = [...materials];
    const position = new THREE.Vector3();
    const variants = [
      ['smoke', 0xf5fff4], ['smoke', 0xffd999],
      ['dust', 0xffd999], ['dust', 0xf5fff4],
      ['spark', 0x5bc8ff], ['spark', 0xff8c42], ['spark', 0xffd2f2],
      ['coin', 0xffd766],
      ['impact', 0xff9a8b], ['impact', 0x8ff7ff], ['impact', 0xff80b5],
      ['streak', 0x5bc8ff], ['streak', 0xff8c42], ['streak', 0xf5fff4],
    ];

    for (const [type, color] of variants) effects.emit(type, position, color);

    expect(effects.materials).toBe(materials);
    expect(effects.materials).toEqual(identities);
    expect(effects.materials).toHaveLength(14);
    expect(new Set(effects.pool.map((slot) => slot.mesh.material)).size).toBeLessThanOrEqual(effects.materials.length);
  });

  it('reduces active effect budget without allocating a second pool', () => {
    const effects = new KartEffects({ visuals: false });
    const pool = effects.pool;
    effects.setQuality('medium');

    for (let index = 0; index < 72; index += 1) effects.emit('smoke', new THREE.Vector3(), 0xffffff);

    expect(effects.pool).toBe(pool);
    expect(effects.activeBudget).toBe(44);
    expect(effects.activeCount).toBe(44);
  });
});
