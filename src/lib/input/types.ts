export interface LoadedPhoto {
  readonly bitmap: ImageBitmap;
  readonly width: number;
  readonly height: number;
  readonly mimeType: string;
  readonly baseName: string;
}

export interface ParsedDepth {
  readonly data: Float32Array;
  readonly width: number;
  readonly height: number;
}

export interface NormalizedDepth {
  readonly data: Float32Array;
  readonly width: number;
  readonly height: number;
  readonly lowValue: number;
  readonly highValue: number;
}

export interface NormalizationOptions {
  readonly lowPercentile: number;
  readonly highPercentile: number;
}
