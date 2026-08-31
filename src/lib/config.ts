export interface AppConfig {
  readonly previewMaxDimension: number;
  readonly percentileLow: number;
  readonly percentileHigh: number;
  readonly aspectRatioTolerance: number;
  readonly maxBlurRadius: number;
  readonly jpegQuality: number;
}

export const APP_CONFIG: AppConfig = Object.freeze({
  previewMaxDimension: 1600,
  percentileLow: 0.01,
  percentileHigh: 0.99,
  aspectRatioTolerance: 0.01,
  maxBlurRadius: 32,
  jpegQuality: 0.92,
});
