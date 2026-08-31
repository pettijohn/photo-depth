import { describe, expect, it } from 'vitest';
import { AppError } from '../errors/AppError';
import { normalizeDepth } from './normalize';

const options = { lowPercentile: 0.2, highPercentile: 0.8 };

function depth(values: number[]) {
  return { data: new Float32Array(values), width: values.length, height: 1 };
}

describe('normalizeDepth', () => {
  it('uses percentiles to limit outliers', () => {
    const result = normalizeDepth(depth([-100, 0, 1, 2, 3, 4, 100]), options);
    expect(result.lowValue).toBe(0);
    expect(result.highValue).toBe(4);
    expect(Array.from(result.data)).toEqual([0, 0, 0.25, 0.5, 0.75, 1, 1]);
  });

  it('maps a constant finite map to the middle', () => {
    expect(Array.from(normalizeDepth(depth([4, 4]), options).data)).toEqual([0.5, 0.5]);
  });

  it('replaces invalid values with range boundaries', () => {
    const result = normalizeDepth(depth([0, 1, Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]), {
      lowPercentile: 0,
      highPercentile: 1,
    });
    expect(Array.from(result.data)).toEqual([0, 1, 0, 0, 1]);
  });

  it('rejects a map without finite values', () => {
    expect(() => normalizeDepth(depth([Number.NaN, Number.POSITIVE_INFINITY]), options)).toThrowError(AppError);
    try {
      normalizeDepth(depth([Number.NaN]), options);
    } catch (error) {
      expect((error as AppError).code).toBe('DEPTH_NO_VALID_VALUES');
    }
  });
});
