import type { AppError } from '../errors/AppError';

export interface FocusSettings {
  readonly foregroundCutoff: number;
  readonly backgroundCutoff: number;
  readonly foregroundSoftness: number;
  readonly backgroundSoftness: number;
}

export interface RenderSettings {
  readonly focus: FocusSettings;
  readonly blurStrength: number;
}

export type OutputFormat = 'jpeg' | 'png';
export type AppStatus = 'empty' | 'loading' | 'ready' | 'rendering' | 'exporting' | 'error';

export interface InputSummary {
  readonly photoName?: string;
  readonly depthName?: string;
}

export interface AppState {
  readonly inputs: InputSummary;
  readonly renderSettings: RenderSettings;
  readonly outputFormat: OutputFormat;
  readonly status: AppStatus;
  readonly error: AppError | null;
}

export const DEFAULT_RENDER_SETTINGS: RenderSettings = Object.freeze({
  focus: Object.freeze({
    foregroundCutoff: 0.3,
    backgroundCutoff: 0.6,
    foregroundSoftness: 0.08,
    backgroundSoftness: 0.08,
  }),
  blurStrength: 0.7,
});

export function createInitialState(): AppState {
  return {
    inputs: {},
    renderSettings: DEFAULT_RENDER_SETTINGS,
    outputFormat: 'jpeg',
    status: 'empty',
    error: null,
  };
}
