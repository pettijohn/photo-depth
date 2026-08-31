import { describe, expect, it, vi } from 'vitest';
import { buildDownloadName, startDownload, type DownloadAdapter } from './export';

describe('download helpers', () => {
  it('builds safe descriptive file names', () => {
    expect(buildDownloadName('portrait.final', 'jpeg')).toBe('portrait-final-bokeh.jpg');
    expect(buildDownloadName(' portrait_1 ', 'png')).toBe('portrait_1-bokeh.png');
    expect(buildDownloadName('...', 'jpeg')).toBe('photo-bokeh.jpg');
  });

  it('starts a download and revokes its object URL', () => {
    let deferred: (() => void) | undefined;
    const adapter: DownloadAdapter = {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
      click: vi.fn(),
      defer: vi.fn((callback) => { deferred = callback; }),
    };
    const result = { blob: new Blob(), mimeType: 'image/png' as const, fileName: 'photo-bokeh.png' };
    startDownload(result, adapter);
    expect(adapter.click).toHaveBeenCalledWith('blob:test', result.fileName);
    expect(adapter.revokeObjectURL).not.toHaveBeenCalled();
    deferred!();
    expect(adapter.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
