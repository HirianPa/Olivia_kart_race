import { damp } from '../math/arcadeMath.js';

const MAX_STEER = 0.46;
const HIT_DURATION = 0.46;

/**
 * Presentation-only motion for the toy karts. It only changes named model parts
 * and deliberately never writes a kart's position, heading, or speed.
 */
export class KartAnimator {
  constructor(parts) {
    this.parts = parts;
    this.suspensionVelocity = 0;
    this.hitTimer = 0;
    this.driverPhase = 0;
  }

  update(dt, snapshot = {}) {
    const frame = Math.max(0, dt);
    const speed = snapshot.speed ?? 0;
    const steer = Math.max(-1, Math.min(1, snapshot.steer ?? 0));
    const wheels = this.parts.wheels ?? [];
    const steering = this.parts.steering;
    const suspension = this.parts.suspension;
    const driver = this.parts.driver;

    for (const wheel of wheels) wheel.rotation.x += (speed / 0.55) * frame;
    if (steering) steering.rotation.y = damp(steering.rotation.y, steer * MAX_STEER, 15, frame);

    if (snapshot.landed) this.suspensionVelocity -= 2.45;
    const suspensionTarget = snapshot.airborne ? 0.055 : 0;
    if (suspension) {
      this.suspensionVelocity += (suspensionTarget - suspension.position.y) * 65 * frame;
      this.suspensionVelocity *= Math.exp(-12 * frame);
      suspension.position.y += this.suspensionVelocity * frame;
      suspension.rotation.z = damp(
        suspension.rotation.z,
        (snapshot.lean ?? -steer * Math.min(Math.abs(speed) / 34, 1) * 0.1),
        9,
        frame,
      );
    }

    if (snapshot.hit) this.hitTimer = HIT_DURATION;
    this.hitTimer = Math.max(0, this.hitTimer - frame);
    this.driverPhase += frame * (3.5 + Math.min(Math.abs(speed), 38) * 0.17);
    if (!driver) return;

    const hitAmount = this.hitTimer / HIT_DURATION;
    const hitLean = hitAmount > 0 ? 0.38 * (0.72 + hitAmount * 0.28) : 0;
    const drivingLean = -steer * Math.min(Math.abs(speed) / 35, 1) * 0.1;
    driver.rotation.z = damp(driver.rotation.z, hitLean + drivingLean, 18, frame);
    driver.rotation.y = damp(driver.rotation.y, steer * 0.16, 10, frame);
    driver.position.y = damp(driver.position.y, Math.sin(this.driverPhase) * Math.min(Math.abs(speed) / 34, 1) * 0.018, 9, frame);

    const { head, leftArm, rightArm } = driver.userData;
    if (head) head.rotation.y = damp(head.rotation.y, steer * 0.19, 11, frame);
    if (leftArm) leftArm.rotation.z = damp(leftArm.rotation.z, 0.22 + steer * 0.17, 12, frame);
    if (rightArm) rightArm.rotation.z = damp(rightArm.rotation.z, -0.22 + steer * 0.17, 12, frame);
  }
}
