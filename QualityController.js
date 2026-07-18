const TIER_NAMES = Object.freeze(['high', 'effects-reduced', 'shadows-512', 'shadows-off']);

/**
 * Presentation-only frame pacing governor. Its counters are scalar fields so
 * sampling it per animation frame does not allocate arrays or closures.
 */
export class QualityController {
  constructor({
    effects = null,
    environment = null,
    shadows = null,
    sampleInterval = 1,
    sustainedLowSeconds = 2,
    cooldownSeconds = 4,
  } = {}) {
    this.effects = effects;
    this.environment = environment;
    this.shadows = shadows;
    this.sampleInterval = sampleInterval;
    this.sustainedLowSeconds = sustainedLowSeconds;
    this.cooldownSeconds = cooldownSeconds;
    this.elapsed = 0;
    this.sampleElapsed = 0;
    this.frameCount = 0;
    this.fps = 60;
    this.lowSeconds = 0;
    this.cooldownUntil = 0;
    this.tierIndex = 0;
  }

  setEffects(effects) {
    this.effects = effects;
    if (this.tierIndex >= 1) effects?.setQuality?.('medium');
  }

  update(dt) {
    const safeDt = Math.max(0, Number.isFinite(dt) ? dt : 0);
    this.elapsed += safeDt;
    this.sampleElapsed += safeDt;
    this.frameCount += 1;
    if (this.sampleElapsed < this.sampleInterval) return;

    this.fps = this.frameCount / this.sampleElapsed;
    if (this.fps < 50) this.lowSeconds += this.sampleElapsed;
    else this.lowSeconds = 0;
    this.sampleElapsed = 0;
    this.frameCount = 0;

    if (this.lowSeconds < this.sustainedLowSeconds || this.elapsed < this.cooldownUntil) return;
    this.#degrade();
    this.lowSeconds = 0;
    this.cooldownUntil = this.elapsed + this.cooldownSeconds;
  }

  getSnapshot() {
    return {
      fps: Math.round(this.fps * 10) / 10,
      tier: TIER_NAMES[this.tierIndex],
      effects: {
        active: this.effects?.activeCount ?? 0,
        capacity: this.effects?.activeBudget ?? this.effects?.pool?.length ?? 0,
      },
      objects: this.environment?.objectCount ?? 0,
    };
  }

  #degrade() {
    if (this.tierIndex >= TIER_NAMES.length - 1) return;
    this.tierIndex += 1;
    if (this.tierIndex === 1) {
      this.effects?.setQuality?.('medium');
      this.environment?.setQuality?.('low');
    } else if (this.tierIndex === 2) {
      this.shadows?.setSize?.(512);
    } else if (this.tierIndex === 3) {
      this.shadows?.setEnabled?.(false);
    }
  }
}
