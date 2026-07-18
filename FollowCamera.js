import * as THREE from 'three';
import { damp } from '../math/arcadeMath.js';

const CHASE_OFFSET = new THREE.Vector3(0, 5.5, -10.5);
const LOOK_OFFSET = new THREE.Vector3(0, 1.2, 5);

export class FollowCamera {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;
    this.lookPoint = new THREE.Vector3();
    this.basePosition = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.desiredLook = new THREE.Vector3();
    this.worldPosition = new THREE.Vector3();
    this.worldQuaternion = new THREE.Quaternion();
    this.shakeOffset = new THREE.Vector3();
    this.shakeStrength = 0;
    this.shakePhase = 0;
    this.#calculateTargets();
    this.basePosition.copy(this.desiredPosition);
    camera.position.copy(this.basePosition);
    this.lookPoint.copy(this.desiredLook);
    camera.lookAt(this.lookPoint);
  }

  #calculateTargets() {
    this.target.updateWorldMatrix(true, false);
    this.target.getWorldPosition(this.worldPosition);
    this.target.getWorldQuaternion(this.worldQuaternion);
    this.desiredPosition.copy(CHASE_OFFSET).applyQuaternion(this.worldQuaternion).add(this.worldPosition);
    this.desiredLook.copy(LOOK_OFFSET).applyQuaternion(this.worldQuaternion).add(this.worldPosition);
  }

  shake(amount = 0.16) {
    this.shakeStrength = Math.min(0.38, this.shakeStrength + Math.max(0, amount) * 0.18);
  }

  update(dt, speedRatio = 0) {
    this.#calculateTargets();
    const positionAlpha = 1 - Math.exp(-6 * dt);
    const lookAlpha = 1 - Math.exp(-9 * dt);
    this.basePosition.lerp(this.desiredPosition, positionAlpha);
    this.lookPoint.lerp(this.desiredLook, lookAlpha);
    this.shakeStrength *= Math.exp(-13 * dt);
    this.shakePhase += dt * 36;
    const shake = this.shakeStrength;
    this.shakeOffset.set(Math.sin(this.shakePhase * 1.7) * shake, Math.cos(this.shakePhase * 2.2) * shake * 0.58, Math.sin(this.shakePhase * 2.8) * shake * 0.35);
    this.camera.position.copy(this.basePosition).add(this.shakeOffset);
    this.camera.lookAt(this.lookPoint);
    const nextFov = damp(this.camera.fov, 58 + Math.min(Math.max(speedRatio, 0), 1) * 6, 5, dt);
    if (Math.abs(nextFov - this.camera.fov) > 0.01) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
