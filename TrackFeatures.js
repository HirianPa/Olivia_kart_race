import * as THREE from 'three';
import { COLORS } from '../config.js';

const RAMP_PROGRESS = [0.19, 0.63];
const PAD_PROGRESS = [0.08, 0.44, 0.79];
const PAD_COOLDOWN = 0.5;

function featureAt(track, progress, kind) {
  const sample = track.getSample(progress);
  return {
    kind,
    progress,
    center: sample.center.clone(),
    tangent: sample.tangent.clone(),
    side: sample.side.clone(),
    halfLength: kind === 'ramp' ? 2.6 : 2.1,
    halfWidth: kind === 'ramp' ? 4.6 : 4.2,
    cooldown: 0,
    ready: true,
  };
}

function matches(feature, position) {
  const offset = position.clone().sub(feature.center).setY(0);
  return Math.abs(offset.dot(feature.tangent)) <= feature.halfLength
    && Math.abs(offset.dot(feature.side)) <= feature.halfWidth;
}

function headingFor(feature) {
  return Math.atan2(feature.tangent.x, feature.tangent.z);
}

export class TrackFeatures {
  constructor(track, { visuals = true } = {}) {
    this.track = track;
    this.group = new THREE.Group();
    this.group.name = 'Toy-Box track features';
    this.ramps = RAMP_PROGRESS.map((progress) => featureAt(track, progress, 'ramp'));
    this.pads = PAD_PROGRESS.map((progress) => featureAt(track, progress, 'pad'));
    if (visuals) this.#buildVisuals();
  }

  query(position) {
    return {
      ramp: this.ramps.find((ramp) => matches(ramp, position)) ?? null,
      pad: this.pads.find((pad) => matches(pad, position)) ?? null,
    };
  }

  activatePad(pad) {
    if (!pad || !this.pads.includes(pad) || !pad.ready) return false;
    pad.cooldown = PAD_COOLDOWN;
    pad.ready = false;
    return true;
  }

  update(rawDt) {
    const dt = Math.max(0, rawDt);
    for (const pad of this.pads) {
      pad.cooldown = Math.max(0, pad.cooldown - dt);
      if (pad.cooldown < 0.00001) pad.cooldown = 0;
      pad.ready = pad.cooldown === 0;
    }
  }

  #buildVisuals() {
    const rampBody = new THREE.BoxGeometry(9.2, 0.34, 5.2);
    const rampPaint = new THREE.MeshStandardMaterial({ color: 0xff8e45, roughness: 0.78, flatShading: true });
    const rampStripe = new THREE.MeshStandardMaterial({ color: 0xfff1c2, roughness: 0.75, flatShading: true });
    const padBase = new THREE.BoxGeometry(8.4, 0.08, 4.2);
    const padPaint = new THREE.MeshStandardMaterial({ color: COLORS.water, emissive: 0x0d6f7a, emissiveIntensity: 0.55, roughness: 0.58, flatShading: true });
    const arrow = new THREE.ConeGeometry(0.68, 1.45, 3);
    const arrowPaint = new THREE.MeshStandardMaterial({ color: 0xe8ffcf, emissive: 0x5bbf78, emissiveIntensity: 0.45, flatShading: true });

    for (const ramp of this.ramps) {
      const mesh = new THREE.Mesh(rampBody, rampPaint);
      mesh.position.copy(ramp.center).setY(0.31);
      mesh.rotation.set(-0.14, headingFor(ramp), 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      for (const x of [-2.5, 0, 2.5]) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.045, 3.3), rampStripe);
        stripe.position.copy(ramp.center).addScaledVector(ramp.side, x).addScaledVector(ramp.tangent, 0.36);
        stripe.position.y = 0.54;
        stripe.rotation.set(-0.14, headingFor(ramp), 0);
        this.group.add(stripe);
      }
    }

    for (const pad of this.pads) {
      const base = new THREE.Mesh(padBase, padPaint);
      base.position.copy(pad.center).setY(0.09);
      base.rotation.y = headingFor(pad);
      base.receiveShadow = true;
      this.group.add(base);
      for (const distance of [-1.5, 0, 1.5]) {
        const chevron = new THREE.Mesh(arrow, arrowPaint);
        chevron.position.copy(pad.center).addScaledVector(pad.tangent, distance).setY(0.18);
        chevron.rotation.set(Math.PI / 2, headingFor(pad), 0);
        this.group.add(chevron);
      }
    }
  }
}
