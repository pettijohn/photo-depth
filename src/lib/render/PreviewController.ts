import type { LoadedPhoto, NormalizedDepth } from '../input/types';
import type { RenderSettings } from '../state/types';
import type { ExportOptions, ExportResult } from './export';
import type { PreviewSize } from './types';

export interface PreviewRendererPort {
  load(photo: LoadedPhoto, depth: NormalizedDepth): Promise<void>;
  resizePreview(size: PreviewSize): void;
  render(settings: RenderSettings): void;
  export(settings: RenderSettings, options: ExportOptions): Promise<ExportResult>;
  dispose(): void;
}

export class PreviewController {
  private frame: number | null = null;
  private settings: RenderSettings;
  private disposed = false;

  constructor(
    private readonly renderer: PreviewRendererPort,
    initialSettings: RenderSettings,
    private readonly requestFrame: (callback: FrameRequestCallback) => number = (callback) => window.requestAnimationFrame(callback),
    private readonly cancelFrame: (handle: number) => void = (handle) => window.cancelAnimationFrame(handle),
  ) {
    this.settings = initialSettings;
  }

  async setInputs(photo: LoadedPhoto, depth: NormalizedDepth): Promise<void> {
    this.assertActive();
    await this.renderer.load(photo, depth);
    this.schedule();
  }

  setSettings(settings: RenderSettings): void {
    this.assertActive();
    this.settings = settings;
    this.schedule();
  }

  resize(size: PreviewSize): void {
    this.assertActive();
    this.renderer.resizePreview(size);
    this.schedule();
  }

  async export(settings: RenderSettings, options: ExportOptions): Promise<ExportResult> {
    this.assertActive();
    return this.renderer.export(settings, options);
  }

  dispose(): void {
    if (this.disposed) return;
    if (this.frame !== null) this.cancelFrame(this.frame);
    this.frame = null;
    this.renderer.dispose();
    this.disposed = true;
  }

  private schedule(): void {
    if (this.frame !== null) return;
    this.frame = this.requestFrame(() => {
      this.frame = null;
      if (!this.disposed) this.renderer.render(this.settings);
    });
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('The preview controller is disposed.');
  }
}
