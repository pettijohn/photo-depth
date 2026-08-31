import { AppError } from '../errors/AppError';

export function encodeCanvas(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new AppError('EXPORT_ENCODING_FAILED'));
      }, mimeType, quality);
    } catch (cause) {
      reject(new AppError('EXPORT_ENCODING_FAILED', { cause }));
    }
  });
}
