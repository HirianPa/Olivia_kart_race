import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TrackFeatures } from '../src/track/TrackFeatures.js';

const featureTrack = {
  getSample(t) {
    return {
      center: new THREE.Vector3(t * 100, 0, 0),
      tangent: new THREE.Vector3(1, 0, 0),
      side: new THREE.Vector3(0, 0, 1),
    };
  },
};

describe('TrackFeatures', () => {
  it('finds ramps and pads at their configured circuit progress', () => {
    const features = new TrackFeatures(featureTrack, { visuals: false });

    expect(features.query(new THREE.Vector3(19, 0, 0)).ramp).toMatchObject({ progress: 0.19 });
    expect(features.query(new THREE.Vector3(44, 0, 0)).pad).toMatchObject({ progress: 0.44, ready: true });
    expect(features.query(new THREE.Vector3(30, 0, 0))).toEqual({ ramp: null, pad: null });
  });

  it('puts a used pad on a half-second cooldown before it can boost again', () => {
    const features = new TrackFeatures(featureTrack, { visuals: false });
    const pad = features.query(new THREE.Vector3(8, 0, 0)).pad;

    expect(features.activatePad(pad)).toBe(true);
    expect(features.query(new THREE.Vector3(8, 0, 0)).pad.ready).toBe(false);
    features.update(0.49);
    expect(features.query(new THREE.Vector3(8, 0, 0)).pad.ready).toBe(false);
    features.update(0.01);
    expect(features.query(new THREE.Vector3(8, 0, 0)).pad.ready).toBe(true);
  });
});
