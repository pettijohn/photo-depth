import { describe, expect, it } from 'vitest';
import { AppError, messageForError, type AppErrorCode } from './AppError';

const codes: AppErrorCode[] = [
  'WEBGL2_UNSUPPORTED', 'WEBGL_CONTEXT_LOST', 'PHOTO_DECODE_FAILED', 'NPZ_MALFORMED', 'DEPTH_MISSING',
  'DEPTH_TYPE_UNSUPPORTED', 'DEPTH_SHAPE_UNSUPPORTED', 'DEPTH_NO_VALID_VALUES',
  'ASPECT_RATIO_MISMATCH', 'GPU_PREVIEW_ALLOCATION_FAILED', 'EXPORT_DIMENSIONS_UNSUPPORTED',
  'EXPORT_ALLOCATION_FAILED', 'EXPORT_ENCODING_FAILED',
];

describe('AppError', () => {
  it.each(codes)('maps %s to a user message', (code) => {
    const error = new AppError(code);
    expect(error.userMessage).toBe(messageForError(code));
    expect(error.userMessage.length).toBeGreaterThan(10);
    expect(error.recoverable).toBe(true);
  });
});
