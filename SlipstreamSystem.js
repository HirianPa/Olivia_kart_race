import * as THREE from 'three';

const CHARGE_THRESHOLD = 1.4;
const RANGE = 14;
const FORWARD_CONE = 0.88;
const DECAY_RATE = 1.25;

const forwardFor = (racer) => {
  const heading = Number.isFinite(racer.heading) ? racer.heading : racer.group.rotation.y;
  return new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
};

export class SlipstreamSystem {
  constructor() {
    this.charge = 0;
    this.locked = false;
  }

  update(dt, { player, targets }) {
    const drafting = targets.some((target) => this.#qualifies(player, target));
    let boost = false;

    if (drafting && !this.locked) {
      this.charge = Math.min(CHARGE_THRESHOLD, this.charge + dt);
      if (this.charge >= CHARGE_THRESHOLD) {
        this.charge = 0;
        this.locked = true;
        boost = true;
      }
    } else if (!drafting) {
      this.charge = Math.max(0, this.charge - DECAY_RATE * dt);
      this.locked = false;
    }

    return { charge: this.charge, boost };
  }

  #qualifies(player, target) {
    const playerPosition = player.group.position;
    const targetPosition = target.group.position;
    const toTarget = targetPosition.clone().sub(playerPosition);
    const distance = toTarget.length();
    if (distance === 0 || distance >= RANGE) return false;

    toTarget.divideScalar(distance);
    const playerForward = forwardFor(player);
    if (playerForward.dot(toTarget) <= FORWARD_CONE) return false;

    const targetForward = forwardFor(target);
    const fromTarget = playerPosition.clone().sub(targetPosition).normalize();
    return targetForward.dot(fromTarget) < 0;
  }
}
