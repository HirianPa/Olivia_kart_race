import { clampDelta } from '../math/arcadeMath.js';

const GRAVITY = 18;
const LAUNCH_SPEED = 6;
const TRICK_WINDOW = 0.22;

export class JumpSystem {
  constructor() {
    this.airborne = false;
    this.height = 0;
    this.verticalSpeed = 0;
    this.rampLatched = false;
    this.trickBuffer = 0;
    this.driftHeld = false;
    this.launches = 0;
  }

  update(rawDt, { ramp = false, driftPressed = false } = {}) {
    const dt = clampDelta(rawDt);
    let landed = false;
    let trickBoost = 0;

    if (driftPressed && !this.driftHeld) this.trickBuffer = TRICK_WINDOW;
    else this.trickBuffer = Math.max(0, this.trickBuffer - dt);
    this.driftHeld = driftPressed;

    if (!ramp) this.rampLatched = false;
    if (ramp && !this.rampLatched && !this.airborne) {
      this.rampLatched = true;
      this.airborne = true;
      this.verticalSpeed = LAUNCH_SPEED;
      this.launches += 1;
    }

    if (this.airborne) {
      this.verticalSpeed -= GRAVITY * dt;
      this.height += this.verticalSpeed * dt;
      if (this.height <= 0) {
        this.height = 0;
        this.verticalSpeed = 0;
        this.airborne = false;
        landed = true;
        trickBoost = this.trickBuffer > 0 ? 1 : 0;
        this.trickBuffer = 0;
      }
    }

    return {
      height: this.height,
      pitch: this.airborne ? Math.atan2(this.verticalSpeed, 9) : 0,
      landed,
      trickBoost,
    };
  }
}
