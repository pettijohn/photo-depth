import { AppError } from '../errors/AppError';
import type { ParsedDepth } from './types';

const MAGIC = [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59] as const;

export function parseNpy(bytes: Uint8Array): ParsedDepth {
  try {
    if (bytes.length < 10 || !MAGIC.every((value, index) => bytes[index] === value)) {
      throw new AppError('NPZ_MALFORMED');
    }
    const major = bytes[6];
    const headerLengthBytes = major === 1 ? 2 : major === 2 || major === 3 ? 4 : 0;
    if (!headerLengthBytes) throw new AppError('NPZ_MALFORMED');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const headerLength = headerLengthBytes === 2 ? view.getUint16(8, true) : view.getUint32(8, true);
    const headerStart = 8 + headerLengthBytes;
    const dataStart = headerStart + headerLength;
    if (dataStart > bytes.length) throw new AppError('NPZ_MALFORMED');
    const header = new TextDecoder(major === 3 ? 'utf-8' : 'latin1').decode(bytes.subarray(headerStart, dataStart));
    const descr = /['"]descr['"]\s*:\s*['"]([^'"]+)['"]/.exec(header)?.[1];
    const fortran = /['"]fortran_order['"]\s*:\s*(True|False)/.exec(header)?.[1];
    const shapeText = /['"]shape['"]\s*:\s*\(([^)]*)\)/.exec(header)?.[1];
    if (!descr || !fortran || shapeText === undefined) throw new AppError('NPZ_MALFORMED');
    if (descr !== '<f4' && descr !== '|f4' && descr !== '=f4') {
      throw new AppError('DEPTH_TYPE_UNSUPPORTED');
    }
    if (fortran !== 'False') throw new AppError('DEPTH_SHAPE_UNSUPPORTED');
    const shape = shapeText.split(',').map((part) => part.trim()).filter(Boolean).map(Number);
    if (shape.length !== 3 || shape[0] !== 1 || !Number.isInteger(shape[1]) || !Number.isInteger(shape[2]) || shape[1]! < 1 || shape[2]! < 1) {
      throw new AppError('DEPTH_SHAPE_UNSUPPORTED');
    }
    const height = shape[1]!;
    const width = shape[2]!;
    const count = width * height;
    if (!Number.isSafeInteger(count) || bytes.length - dataStart !== count * 4) {
      throw new AppError('NPZ_MALFORMED');
    }
    const data = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      data[index] = view.getFloat32(dataStart + index * 4, true);
    }
    return { data, width, height };
  } catch (cause) {
    throw cause instanceof AppError ? cause : new AppError('NPZ_MALFORMED', { cause });
  }
}
