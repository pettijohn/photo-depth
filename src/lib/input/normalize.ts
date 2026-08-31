import { AppError } from '../errors/AppError';
import type { NormalizationOptions, NormalizedDepth, ParsedDepth } from './types';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export function normalizeDepth(depth: ParsedDepth, options: NormalizationOptions): NormalizedDepth {
  const finite = Array.from(depth.data).filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length === 0) throw new AppError('DEPTH_NO_VALID_VALUES');
  const lowIndex = Math.round((finite.length - 1) * clamp01(options.lowPercentile));
  const highIndex = Math.round((finite.length - 1) * clamp01(options.highPercentile));
  const lowValue = finite[Math.min(lowIndex, highIndex)]!;
  const highValue = finite[Math.max(lowIndex, highIndex)]!;
  const range = highValue - lowValue;
  const data = new Float32Array(depth.data.length);
  for (let index = 0; index < depth.data.length; index += 1) {
    const value = depth.data[index]!;
    if (value === Number.POSITIVE_INFINITY) data[index] = 1;
    else if (!Number.isFinite(value)) data[index] = 0;
    else if (range === 0) data[index] = 0.5;
    else data[index] = clamp01((value - lowValue) / range);
  }
  return { data, width: depth.width, height: depth.height, lowValue, highValue };
}
