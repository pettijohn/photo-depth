import { describe, expect, it } from 'vitest';
import { calculateBlurAmount, calculateSharpness, clampFocusSettings } from './focus';
import type { FocusSettings } from './types';

const focus: FocusSettings = {
  foregroundCutoff: 0.3,
  backgroundCutoff: 0.7,
  foregroundSoftness: 0.1,
  backgroundSoftness: 0.2,
};

describe('focus model', () => {
  it('clamps values and preserves cutoff order', () => {
    expect(clampFocusSettings({ ...focus, foregroundCutoff: 0.8, backgroundCutoff: 0.2 })).toMatchObject({
      foregroundCutoff: 0.8,
      backgroundCutoff: 0.8,
    });
    expect(clampFocusSettings({ ...focus, foregroundCutoff: -1, backgroundCutoff: 2 })).toMatchObject({
      foregroundCutoff: 0,
      backgroundCutoff: 1,
    });
  });

  it('keeps the selected range sharp', () => {
    expect(calculateSharpness(0.5, focus)).toBe(1);
    expect(calculateSharpness(0, focus)).toBe(0);
    expect(calculateSharpness(1, focus)).toBe(0);
  });

  it('uses independent smooth transitions', () => {
    expect(calculateSharpness(0.3, focus)).toBeCloseTo(0.5);
    expect(calculateSharpness(0.7, focus)).toBeCloseTo(0.5);
    expect(calculateSharpness(0.24, focus)).toBe(0);
    expect(calculateSharpness(0.81, focus)).toBe(0);
  });

  it('always returns a bounded mask', () => {
    for (let depth = -0.2; depth <= 1.2; depth += 0.01) {
      expect(calculateSharpness(depth, focus)).toBeGreaterThanOrEqual(0);
      expect(calculateSharpness(depth, focus)).toBeLessThanOrEqual(1);
    }
  });

  it('increases blur with distance and disables blur at zero strength', () => {
    const renderSettings = { focus, blurStrength: 0.8 };
    expect(calculateBlurAmount(0, renderSettings)).toBeGreaterThan(calculateBlurAmount(0.25, renderSettings));
    expect(calculateBlurAmount(1, renderSettings)).toBeGreaterThan(calculateBlurAmount(0.75, renderSettings));
    expect(calculateBlurAmount(0.5, renderSettings)).toBe(0);
    expect(calculateBlurAmount(0, { focus, blurStrength: 0 })).toBe(0);
    expect(calculateBlurAmount(1, { focus, blurStrength: 0 })).toBe(0);
  });
});
