import { describe, expect, it, vi } from 'vitest';
import type { LoadedPhoto, NormalizedDepth } from '../input/types';
import { DEFAULT_RENDER_SETTINGS } from '../state/types';
import { PreviewController, type PreviewRendererPort } from './PreviewController';

function makeRenderer(): PreviewRendererPort & Record<string, ReturnType<typeof vi.fn>> {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    resizePreview: vi.fn(),
    render: vi.fn(),
    export: vi.fn().mockResolvedValue({ blob: new Blob(), mimeType: 'image/png', fileName: 'test.png' }),
    dispose: vi.fn(),
  };
}

describe('PreviewController', () => {
  it('combines rapid state updates into one animation frame', () => {
    const renderer = makeRenderer();
    const callbacks: FrameRequestCallback[] = [];
    const controller = new PreviewController(renderer, DEFAULT_RENDER_SETTINGS, (callback) => {
      callbacks.push(callback);
      return callbacks.length;
    }, vi.fn());
    controller.setSettings({ ...DEFAULT_RENDER_SETTINGS, blurStrength: 0.1 });
    controller.setSettings({ ...DEFAULT_RENDER_SETTINGS, blurStrength: 0.9 });
    expect(callbacks).toHaveLength(1);
    callbacks[0]!(0);
    expect(renderer.render).toHaveBeenCalledOnce();
    expect(renderer.render).toHaveBeenCalledWith(expect.objectContaining({ blurStrength: 0.9 }));
  });

  it('loads inputs, resizes, and disposes owned resources', async () => {
    const renderer = makeRenderer();
    let callback: FrameRequestCallback | undefined;
    const cancel = vi.fn();
    const controller = new PreviewController(renderer, DEFAULT_RENDER_SETTINGS, (value) => { callback = value; return 7; }, cancel);
    const photo = { width: 2, height: 2 } as LoadedPhoto;
    const depth = { width: 2, height: 2 } as NormalizedDepth;
    await controller.setInputs(photo, depth);
    expect(renderer.load).toHaveBeenCalledWith(photo, depth);
    controller.resize({ cssWidth: 2, cssHeight: 2, renderWidth: 2, renderHeight: 2 });
    expect(renderer.resizePreview).toHaveBeenCalledOnce();
    controller.dispose();
    expect(cancel).toHaveBeenCalledWith(7);
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(callback).toBeDefined();
  });
});
