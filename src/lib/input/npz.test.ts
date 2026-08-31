import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { AppError } from '../errors/AppError';
import { makeNpy, makeNpz } from '../../test/fixtures/npy';
import { parseMiniNpz } from './npz';

function expectCode(action: () => unknown, code: string): void {
  try {
    action();
    throw new Error('Expected an AppError.');
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}

describe('parseMiniNpz', () => {
  it('parses a valid DA3 depth array', () => {
    const result = parseMiniNpz(makeNpz([1, 2, 3, 4]));
    expect(result).toMatchObject({ width: 2, height: 2 });
    expect(Array.from(result.data)).toEqual([1, 2, 3, 4]);
  });

  it('finds depth in a nested archive path', () => {
    expect(parseMiniNpz(makeNpz([1, 2], { shape: [1, 1, 2] }, 'result/depth.npy')).width).toBe(2);
  });

  it('rejects malformed archives and missing depth', () => {
    expectCode(() => parseMiniNpz(new Uint8Array([1, 2, 3])), 'NPZ_MALFORMED');
    expectCode(() => parseMiniNpz(zipSync({ 'other.npy': makeNpy([1]) })), 'DEPTH_MISSING');
  });

  it.each(['>f4', '<f8', '<i4'])('rejects the %s data type', (descr) => {
    expectCode(() => parseMiniNpz(makeNpz([1, 2], { descr, shape: [1, 1, 2] })), 'DEPTH_TYPE_UNSUPPORTED');
  });

  it('rejects unsupported rank, shape, and Fortran order', () => {
    expectCode(() => parseMiniNpz(makeNpz([1, 2], { shape: [1, 2] })), 'DEPTH_SHAPE_UNSUPPORTED');
    expectCode(() => parseMiniNpz(makeNpz([1, 2], { shape: [2, 1, 1] })), 'DEPTH_SHAPE_UNSUPPORTED');
    expectCode(() => parseMiniNpz(makeNpz([1, 2], { shape: [1, 1, 2], fortran: true })), 'DEPTH_SHAPE_UNSUPPORTED');
  });

  it('rejects truncated and extra payload data', () => {
    expectCode(() => parseMiniNpz(makeNpz([1, 2], { shape: [1, 1, 2], truncateBytes: 1 })), 'NPZ_MALFORMED');
    expectCode(() => parseMiniNpz(makeNpz([1, 2], { shape: [1, 1, 2], extraBytes: 1 })), 'NPZ_MALFORMED');
  });
});
