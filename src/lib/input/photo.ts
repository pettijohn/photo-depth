import { AppError } from '../errors/AppError';
import type { LoadedPhoto } from './types';

function fileBaseName(name: string): string {
  const index = name.lastIndexOf('.');
  return (index > 0 ? name.slice(0, index) : name).trim() || 'photo';
}

export async function loadPhoto(file: File): Promise<LoadedPhoto> {
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width < 1 || bitmap.height < 1) {
      bitmap.close();
      throw new Error('The decoded image has invalid dimensions.');
    }
    return {
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      mimeType: file.type,
      baseName: fileBaseName(file.name),
    };
  } catch (cause) {
    throw cause instanceof AppError ? cause : new AppError('PHOTO_DECODE_FAILED', { cause });
  }
}
