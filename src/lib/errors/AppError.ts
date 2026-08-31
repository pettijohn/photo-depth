export type AppErrorCode =
  | 'WEBGL2_UNSUPPORTED'
  | 'WEBGL_CONTEXT_LOST'
  | 'PHOTO_DECODE_FAILED'
  | 'NPZ_MALFORMED'
  | 'DEPTH_MISSING'
  | 'DEPTH_TYPE_UNSUPPORTED'
  | 'DEPTH_SHAPE_UNSUPPORTED'
  | 'DEPTH_NO_VALID_VALUES'
  | 'ASPECT_RATIO_MISMATCH'
  | 'GPU_PREVIEW_ALLOCATION_FAILED'
  | 'EXPORT_DIMENSIONS_UNSUPPORTED'
  | 'EXPORT_ALLOCATION_FAILED'
  | 'EXPORT_ENCODING_FAILED';

const MESSAGES: Readonly<Record<AppErrorCode, string>> = {
  WEBGL2_UNSUPPORTED: 'This browser does not support WebGL 2.',
  WEBGL_CONTEXT_LOST: 'The GPU context was lost. The application will restore the preview when possible.',
  PHOTO_DECODE_FAILED: 'The photograph could not be decoded.',
  NPZ_MALFORMED: 'The depth file is not a valid NPZ file.',
  DEPTH_MISSING: 'The NPZ file does not contain a depth array.',
  DEPTH_TYPE_UNSUPPORTED: 'The depth array must contain 32-bit floating-point values.',
  DEPTH_SHAPE_UNSUPPORTED: 'The depth array must have the shape [1, height, width].',
  DEPTH_NO_VALID_VALUES: 'The depth map does not contain a finite depth value.',
  ASPECT_RATIO_MISMATCH: 'The photograph and depth map have different aspect ratios.',
  GPU_PREVIEW_ALLOCATION_FAILED: 'The GPU could not allocate the preview resources.',
  EXPORT_DIMENSIONS_UNSUPPORTED: 'The source image dimensions exceed this browser or GPU export limit.',
  EXPORT_ALLOCATION_FAILED: 'The GPU could not allocate the full-resolution export resources.',
  EXPORT_ENCODING_FAILED: 'The browser could not encode the selected image format.',
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;
  readonly cause?: unknown;
  readonly recoverable: boolean;

  constructor(code: AppErrorCode, options: { cause?: unknown; recoverable?: boolean } = {}) {
    super(MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = MESSAGES[code];
    this.cause = options.cause;
    this.recoverable = options.recoverable ?? true;
  }
}

export function toAppError(error: unknown, fallback: AppErrorCode): AppError {
  return error instanceof AppError ? error : new AppError(fallback, { cause: error });
}

export function messageForError(code: AppErrorCode): string {
  return MESSAGES[code];
}
