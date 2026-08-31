import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../errors/AppError';
import { loadPhoto } from './photo';

describe('loadPhoto', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns decoded dimensions and a base name', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 12, height: 8, close }));
    const result = await loadPhoto(new File(['photo'], 'portrait.jpg', { type: 'image/jpeg' }));
    expect(result).toMatchObject({ width: 12, height: 8, mimeType: 'image/jpeg', baseName: 'portrait' });
  });

  it('maps decode failures to a typed error', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')));
    await expect(loadPhoto(new File([], 'bad.jpg'))).rejects.toMatchObject({ code: 'PHOTO_DECODE_FAILED' } satisfies Partial<AppError>);
  });
});
