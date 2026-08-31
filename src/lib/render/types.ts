export interface GLResource {
  dispose(): void;
}

export interface PreviewSize {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly renderWidth: number;
  readonly renderHeight: number;
}

export interface RendererDiagnostics {
  readonly previewWidth: number;
  readonly previewHeight: number;
  readonly blurLevels: number;
  readonly hasPhotoTexture: boolean;
  readonly hasDepthTexture: boolean;
}

export interface RendererCapabilities {
  readonly maxTextureSize: number;
  readonly maxRenderbufferSize: number;
  readonly maxViewportWidth: number;
  readonly maxViewportHeight: number;
}

export function supportsExportDimensions(capabilities: RendererCapabilities, width: number, height: number): boolean {
  return width > 0 && height > 0
    && width <= capabilities.maxTextureSize && height <= capabilities.maxTextureSize
    && width <= capabilities.maxRenderbufferSize && height <= capabilities.maxRenderbufferSize
    && width <= capabilities.maxViewportWidth && height <= capabilities.maxViewportHeight;
}

export function fitPreviewSize(sourceWidth: number, sourceHeight: number, availableWidth: number, maxDimension: number): PreviewSize {
  const cssWidth = Math.max(1, Math.min(sourceWidth, Math.floor(availableWidth)));
  const cssHeight = Math.max(1, Math.round(cssWidth * sourceHeight / sourceWidth));
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight), cssWidth / sourceWidth);
  return {
    cssWidth,
    cssHeight,
    renderWidth: Math.max(1, Math.round(sourceWidth * scale)),
    renderHeight: Math.max(1, Math.round(sourceHeight * scale)),
  };
}
