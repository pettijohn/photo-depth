import { AppError } from '../errors/AppError';
import type { LoadedPhoto, ParsedDepth } from './types';

export function validateInputPair(
  photo: Pick<LoadedPhoto, 'width' | 'height'>,
  depth: Pick<ParsedDepth, 'width' | 'height'>,
  tolerance: number,
): void {
  const photoRatio = photo.width / photo.height;
  const depthRatio = depth.width / depth.height;
  const relativeDifference = Math.abs(photoRatio - depthRatio) / Math.max(photoRatio, depthRatio);
  if (!Number.isFinite(relativeDifference) || relativeDifference - Math.max(0, tolerance) > Number.EPSILON * 8) {
    throw new AppError('ASPECT_RATIO_MISMATCH');
  }
}
