import * as THREE from 'three';

const COLLISION_INSET = 0.08;
const TANGENTIAL_BIAS = 1.5;
const STALLED_SPEED = 1;
const STALLED_CONTACT_TIME = 0.6;
const TANGENT_HEADING_BLEND = 0.25;

export class AntiStuckSystem {
  constructor() {
    this.stalledContactTime = 0;
  }

  update(dt, { collided, speed, outwardSpeed, steer, brake, sideSign, tangent, side }) {
    if (!collided) {
      this.stalledContactTime = 0;
      return { inset: 0, velocityBias: new THREE.Vector3(), headingBlend: 0 };
    }

    const steerDirection = Math.sign(steer) || sideSign;
    const velocityBias = tangent.clone().multiplyScalar(TANGENTIAL_BIAS * steerDirection);
    const stalled = Math.abs(speed) <= STALLED_SPEED && Math.abs(outwardSpeed) <= STALLED_SPEED;
    this.stalledContactTime = stalled ? this.stalledContactTime + dt : 0;

    return {
      inset: COLLISION_INSET,
      velocityBias,
      headingBlend: this.stalledContactTime >= STALLED_CONTACT_TIME ? TANGENT_HEADING_BLEND : 0,
    };
  }
}
