import { describe, expect, it } from 'vitest';
import { clampDelta, damp, moveToward } from '../src/math/arcadeMath.js';

describe('arcadeMath', () => {
  it('limits long frames to 1/30 second', () => {
    expect(clampDelta(0.2)).toBeCloseTo(1 / 30);
  });

  it('damps without overshooting', () => {
    const result = damp(0, 10, 8, 1 / 60);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(10);
  });

  it('moves toward a target by a bounded amount', () => {
    expect(moveToward(2, 10, 3)).toBe(5);
    expect(moveToward(9, 10, 3)).toBe(10);
    expect(moveToward(2, -10, 3)).toBe(-1);
  });
});
