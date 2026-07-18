export class DriftSystem {
  constructor() {
    this.active = false;
    this.charge = 0;
    this.level = 0;
  }

  update(dt, { held, steer, speed, slip, collided }) {
    let releasedBoost = 0;
    if (!this.active && held && Math.abs(steer) > 0.2 && Math.abs(speed) >= 8) this.active = true;

    if (this.active && collided) {
      this.charge *= 0.25;
    }

    if (this.active && held && Math.abs(steer) > 0.15 && Math.abs(speed) >= 6) {
      this.charge = Math.min(1.7, this.charge + dt * (1.05 + Math.min(Math.abs(slip) / 8, 0.45)));
    }

    this.level = this.charge >= 1.35 ? 2 : this.charge >= 0.55 ? 1 : 0;
    if (this.active && (!held || Math.abs(speed) < 5)) {
      releasedBoost = held ? 0 : this.level;
      this.active = false;
      this.charge = 0;
      this.level = 0;
    }
    return { active: this.active, level: this.level, charge: this.charge, releasedBoost };
  }
}
