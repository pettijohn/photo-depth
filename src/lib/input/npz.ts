import { unzipSync } from 'fflate';
import { AppError } from '../errors/AppError';
import { parseNpy } from './npy';
import type { ParsedDepth } from './types';

export function parseMiniNpz(buffer: ArrayBuffer | Uint8Array): ParsedDepth {
  try {
    const archive = unzipSync(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
    const key = Object.keys(archive).find((name) => name === 'depth.npy' || name.endsWith('/depth.npy'));
    if (!key) throw new AppError('DEPTH_MISSING');
    return parseNpy(archive[key]!);
  } catch (cause) {
    throw cause instanceof AppError ? cause : new AppError('NPZ_MALFORMED', { cause });
  }
}
