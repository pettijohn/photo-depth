import { describe, expect, it } from 'vitest';
import { fitPreviewSize, supportsExportDimensions } from './types';

describe('fitPreviewSize', () => {
  it('preserves aspect ratio and limits the render target', () => {
    expect(fitPreviewSize(6000, 4000, 1200, 1600)).toEqual({
      cssWidth: 1200,
      cssHeight: 800,
      renderWidth: 1200,
      renderHeight: 800,
    });
    expect(fitPreviewSize(6000, 4000, 3000, 1600)).toEqual({
      cssWidth: 3000,
      cssHeight: 2000,
      renderWidth: 1600,
      renderHeight: 1067,
    });
  });

  it('rejects dimensions beyond each GPU limit', () => {
    const capabilities = {
      maxTextureSize: 8192,
      maxRenderbufferSize: 4096,
      maxViewportWidth: 5000,
      maxViewportHeight: 4000,
    };
    expect(supportsExportDimensions(capabilities, 4000, 3000)).toBe(true);
    expect(supportsExportDimensions(capabilities, 4097, 3000)).toBe(false);
    expect(supportsExportDimensions(capabilities, 3000, 4001)).toBe(false);
    expect(supportsExportDimensions(capabilities, 0, 100)).toBe(false);
  });
});
