import { describe, expect, it, vi } from 'vitest';
import { encodeCanvas } from './exportCanvas';

describe('encodeCanvas', () => {
  it('passes the MIME type and JPEG quality to the canvas', async () => {
    const blob = new Blob(['image'], { type: 'image/jpeg' });
    const canvas = { toBlob: vi.fn((callback: BlobCallback) => callback(blob)) } as unknown as HTMLCanvasElement;
    await expect(encodeCanvas(canvas, 'image/jpeg', 0.92)).resolves.toBe(blob);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.92);
  });

  it('rejects a missing encoded blob', async () => {
    const canvas = { toBlob: vi.fn((callback: BlobCallback) => callback(null)) } as unknown as HTMLCanvasElement;
    await expect(encodeCanvas(canvas, 'image/png')).rejects.toMatchObject({ code: 'EXPORT_ENCODING_FAILED' });
  });
});
