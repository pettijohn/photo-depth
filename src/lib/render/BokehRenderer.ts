import { APP_CONFIG, type AppConfig } from '../config';
import { AppError } from '../errors/AppError';
import type { LoadedPhoto, NormalizedDepth } from '../input/types';
import { clampFocusSettings } from '../state/focus';
import type { RenderSettings } from '../state/types';
import { buildDownloadName, type ExportOptions, type ExportResult } from './export';
import { encodeCanvas } from './exportCanvas';
import { GLProgram, GLTarget, GLTexture } from './gl';
import { COMPOSE_FRAGMENT, FULLSCREEN_VERTEX, KAWASE_FRAGMENT } from './shaders';
import { supportsExportDimensions, type PreviewSize, type RendererCapabilities, type RendererDiagnostics } from './types';

const BLUR_LEVELS = 5;

export class BokehRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly vao: WebGLVertexArrayObject;
  private readonly kawaseProgram: GLProgram;
  private readonly composeProgram: GLProgram;
  private photoTexture: GLTexture | null = null;
  private depthTexture: GLTexture | null = null;
  private blurTargets: GLTarget[] = [];
  private photo: LoadedPhoto | null = null;
  private depth: NormalizedDepth | null = null;
  private previewSize: PreviewSize | null = null;
  private disposed = false;

  constructor(readonly canvas: HTMLCanvasElement, private readonly config: AppConfig = APP_CONFIG) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false });
    if (!gl) throw new AppError('WEBGL2_UNSUPPORTED', { recoverable: false });
    this.gl = gl;
    const vao = gl.createVertexArray();
    if (!vao) throw new AppError('GPU_PREVIEW_ALLOCATION_FAILED');
    this.vao = vao;
    try {
      this.kawaseProgram = new GLProgram(gl, FULLSCREEN_VERTEX, KAWASE_FRAGMENT);
      this.composeProgram = new GLProgram(gl, FULLSCREEN_VERTEX, COMPOSE_FRAGMENT);
    } catch (cause) {
      gl.deleteVertexArray(vao);
      throw new AppError('GPU_PREVIEW_ALLOCATION_FAILED', { cause });
    }
    gl.bindVertexArray(vao);
  }

  async load(photo: LoadedPhoto, depth: NormalizedDepth): Promise<void> {
    this.assertActive();
    this.photo = photo;
    this.depth = depth;
    const width = Math.max(1, Math.round(photo.width * Math.min(1, this.config.previewMaxDimension / Math.max(photo.width, photo.height))));
    const height = Math.max(1, Math.round(photo.height * width / photo.width));
    this.resizePreview({ cssWidth: width, cssHeight: height, renderWidth: width, renderHeight: height });
  }

  resizePreview(size: PreviewSize): void {
    this.assertActive();
    if (!this.photo || !this.depth) return;
    const max = this.config.previewMaxDimension;
    const scale = Math.min(1, max / Math.max(size.renderWidth, size.renderHeight));
    const renderWidth = Math.max(1, Math.round(size.renderWidth * scale));
    const renderHeight = Math.max(1, Math.round(size.renderHeight * scale));
    this.previewSize = { ...size, renderWidth, renderHeight };
    this.canvas.width = renderWidth;
    this.canvas.height = renderHeight;
    this.canvas.style.width = `${size.cssWidth}px`;
    this.canvas.style.height = `${size.cssHeight}px`;
    this.rebuildPreviewResources();
  }

  render(settings: RenderSettings): void {
    this.assertActive();
    if (!this.photoTexture || !this.depthTexture || !this.previewSize || this.blurTargets.length !== BLUR_LEVELS) return;
    const gl = this.gl;
    const focus = clampFocusSettings(settings.focus);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.composeProgram.value);
    this.bindTexture(this.photoTexture.value, 0, 'u_photo', this.composeProgram);
    this.bindTexture(this.depthTexture.value, 1, 'u_depth', this.composeProgram);
    this.blurTargets.forEach((target, index) => this.bindTexture(target.texture.value, index + 2, `u_blur${index + 1}`, this.composeProgram));
    gl.uniform1f(this.composeProgram.uniform('u_foregroundCutoff'), focus.foregroundCutoff);
    gl.uniform1f(this.composeProgram.uniform('u_backgroundCutoff'), focus.backgroundCutoff);
    gl.uniform1f(this.composeProgram.uniform('u_foregroundSoftness'), focus.foregroundSoftness);
    gl.uniform1f(this.composeProgram.uniform('u_backgroundSoftness'), focus.backgroundSoftness);
    gl.uniform1f(this.composeProgram.uniform('u_blurStrength'), Math.max(0, Math.min(1, settings.blurStrength)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  getCapabilities(): RendererCapabilities {
    const viewport = this.gl.getParameter(this.gl.MAX_VIEWPORT_DIMS) as Int32Array;
    return {
      maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) as number,
      maxRenderbufferSize: this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE) as number,
      maxViewportWidth: viewport[0]!,
      maxViewportHeight: viewport[1]!,
    };
  }

  getDiagnostics(): RendererDiagnostics | undefined {
    if (!import.meta.env.DEV) return undefined;
    return {
      previewWidth: this.previewSize?.renderWidth ?? 0,
      previewHeight: this.previewSize?.renderHeight ?? 0,
      blurLevels: this.blurTargets.length,
      hasPhotoTexture: this.photoTexture !== null,
      hasDepthTexture: this.depthTexture !== null,
    };
  }

  async export(settings: RenderSettings, options: ExportOptions): Promise<ExportResult> {
    this.assertActive();
    if (!this.photo || !this.depth) throw new AppError('EXPORT_ALLOCATION_FAILED');
    const capabilities = this.getCapabilities();
    const { width, height } = this.photo;
    if (!supportsExportDimensions(capabilities, width, height)) {
      throw new AppError('EXPORT_DIMENSIONS_UNSUPPORTED');
    }

    const exportCanvas = document.createElement('canvas');
    let exportRenderer: BokehRenderer | null = null;
    try {
      exportRenderer = new BokehRenderer(exportCanvas, { ...this.config, previewMaxDimension: Math.max(width, height) });
      await exportRenderer.load(this.photo, this.depth);
      exportRenderer.render(settings);
      const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const quality = options.format === 'jpeg' ? options.jpegQuality : undefined;
      const blob = await encodeCanvas(exportCanvas, mimeType, quality);
      return {
        blob,
        mimeType,
        fileName: buildDownloadName(options.sourceBaseName, options.format),
      };
    } catch (cause) {
      if (cause instanceof AppError && cause.code === 'EXPORT_ENCODING_FAILED') throw cause;
      if (cause instanceof AppError && cause.code === 'EXPORT_DIMENSIONS_UNSUPPORTED') throw cause;
      throw new AppError('EXPORT_ALLOCATION_FAILED', { cause });
    } finally {
      exportRenderer?.dispose();
      exportCanvas.width = 1;
      exportCanvas.height = 1;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.releasePreviewResources();
    this.kawaseProgram.dispose();
    this.composeProgram.dispose();
    this.gl.deleteVertexArray(this.vao);
    this.photo = null;
    this.depth = null;
    this.disposed = true;
  }

  private rebuildPreviewResources(): void {
    const photo = this.photo;
    const depth = this.depth;
    const size = this.previewSize;
    if (!photo || !depth || !size) return;
    this.releasePreviewResources();
    const gl = this.gl;
    try {
      const imageCanvas = new OffscreenCanvas(size.renderWidth, size.renderHeight);
      const context = imageCanvas.getContext('2d');
      if (!context) throw new Error('A 2D image context is not available.');
      context.drawImage(photo.bitmap, 0, 0, size.renderWidth, size.renderHeight);
      this.photoTexture = new GLTexture(gl);
      gl.bindTexture(gl.TEXTURE_2D, this.photoTexture.value);
      this.setTextureParameters();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, imageCanvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

      this.depthTexture = new GLTexture(gl);
      gl.bindTexture(gl.TEXTURE_2D, this.depthTexture.value);
      this.setTextureParameters();
      const depthBytes = new Uint8Array(depth.data.length);
      for (let y = 0; y < depth.height; y += 1) {
        for (let x = 0; x < depth.width; x += 1) {
          const sourceIndex = y * depth.width + x;
          const targetIndex = (depth.height - y - 1) * depth.width + x;
          depthBytes[targetIndex] = Math.round(depth.data[sourceIndex]! * 255);
        }
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, depth.width, depth.height, 0, gl.RED, gl.UNSIGNED_BYTE, depthBytes);
      this.buildBlurPyramid(size.renderWidth, size.renderHeight);
      const error = gl.getError();
      if (error !== gl.NO_ERROR) throw new Error(`WebGL error ${error}.`);
    } catch (cause) {
      this.releasePreviewResources();
      throw new AppError('GPU_PREVIEW_ALLOCATION_FAILED', { cause });
    }
  }

  private buildBlurPyramid(width: number, height: number): void {
    const gl = this.gl;
    gl.useProgram(this.kawaseProgram.value);
    let source = this.photoTexture!.value;
    let sourceWidth = width;
    let sourceHeight = height;
    for (let level = 0; level < BLUR_LEVELS; level += 1) {
      const target = new GLTarget(gl, Math.max(1, Math.floor(sourceWidth / 2)), Math.max(1, Math.floor(sourceHeight / 2)));
      this.blurTargets.push(target);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.viewport(0, 0, target.width, target.height);
      this.bindTexture(source, 0, 'u_source', this.kawaseProgram);
      gl.uniform2f(this.kawaseProgram.uniform('u_texel'), 1 / sourceWidth, 1 / sourceHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      source = target.texture.value;
      sourceWidth = target.width;
      sourceHeight = target.height;
    }
  }

  private bindTexture(texture: WebGLTexture, unit: number, uniform: string, program: GLProgram): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.uniform1i(program.uniform(uniform), unit);
  }

  private setTextureParameters(): void {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private releasePreviewResources(): void {
    this.photoTexture?.dispose();
    this.depthTexture?.dispose();
    this.blurTargets.forEach((target) => target.dispose());
    this.photoTexture = null;
    this.depthTexture = null;
    this.blurTargets = [];
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('The renderer is disposed.');
  }
}
