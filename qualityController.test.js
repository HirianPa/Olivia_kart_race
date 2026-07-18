import { describe, expect, it } from 'vitest';
import { QualityController } from '../src/scene/QualityController.js';

function createTargets() {
  const calls = [];
  return {
    calls,
    effects: { setQuality: (level) => calls.push(`effects:${level}`), activeCount: 7, pool: Array(72) },
    environment: { setQuality: (level) => calls.push(`environment:${level}`), objectCount: 123 },
    shadows: { setSize: (size) => calls.push(`shadow-size:${size}`), setEnabled: (enabled) => calls.push(`shadow-enabled:${enabled}`) },
  };
}

function runAtFps(controller, fps, seconds) {
  const frames = Math.round(fps * seconds);
  for (let index = 0; index < frames; index += 1) controller.update(1 / fps);
}

describe('QualityController', () => {
  it('degrades presentation in the intended order after sustained sub-50 FPS pacing', () => {
    const targets = createTargets();
    const quality = new QualityController({ ...targets, sampleInterval: 1, sustainedLowSeconds: 2, cooldownSeconds: 0 });

    runAtFps(quality, 40, 6);

    expect(targets.calls).toEqual([
      'effects:medium', 'environment:low',
      'shadow-size:512',
      'shadow-enabled:false',
    ]);
    expect(quality.getSnapshot().tier).toBe('shadows-off');
  });

  it('uses a cooldown and sustained threshold so a brief hitch cannot flap quality', () => {
    const targets = createTargets();
    const quality = new QualityController({ ...targets, sampleInterval: 1, sustainedLowSeconds: 2, cooldownSeconds: 4 });

    runAtFps(quality, 40, 2);
    runAtFps(quality, 60, 1);
    runAtFps(quality, 40, 2);

    expect(targets.calls).toEqual(['effects:medium', 'environment:low']);
    expect(quality.getSnapshot().fps).toBeCloseTo(40, 1);
  });

  it('reports a concise allocation-free-on-update QA snapshot with target counts', () => {
    const targets = createTargets();
    const quality = new QualityController({ ...targets, sampleInterval: 1, sustainedLowSeconds: 4 });

    runAtFps(quality, 60, 1);
    const snapshot = quality.getSnapshot();

    expect(snapshot).toMatchObject({ fps: 60, tier: 'high', effects: { active: 7, capacity: 72 }, objects: 123 });
  });

  it('applies the current tier to effects connected after a fallback', () => {
    const targets = createTargets();
    const quality = new QualityController({ environment: targets.environment, shadows: targets.shadows, sampleInterval: 1, sustainedLowSeconds: 2, cooldownSeconds: 4 });

    runAtFps(quality, 40, 2);
    quality.setEffects(targets.effects);

    expect(targets.calls).toEqual(['environment:low', 'effects:medium']);
  });
});
