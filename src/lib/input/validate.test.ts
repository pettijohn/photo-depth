import { describe, expect, it } from 'vitest';
import { AppError } from '../errors/AppError';
import { validateInputPair } from './validate';

describe('validateInputPair', () => {
  it('accepts matching aspect ratios at different resolutions', () => {
    expect(() => validateInputPair({ width: 6000, height: 4000 }, { width: 504, height: 336 }, 0.01)).not.toThrow();
  });

  it('accepts a difference at the tolerance boundary', () => {
    expect(() => validateInputPair({ width: 100, height: 100 }, { width: 99, height: 100 }, 0.01)).not.toThrow();
  });

  it('rejects an aspect mismatch', () => {
    expect(() => validateInputPair({ width: 16, height: 9 }, { width: 4, height: 3 }, 0.01)).toThrowError(AppError);
    try {
      validateInputPair({ width: 16, height: 9 }, { width: 4, height: 3 }, 0.01);
    } catch (error) {
      expect((error as AppError).code).toBe('ASPECT_RATIO_MISMATCH');
    }
  });
});
