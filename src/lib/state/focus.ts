import type { FocusSettings, RenderSettings } from './types';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const position = clamp01((value - edge0) / (edge1 - edge0));
  return position * position * (3 - 2 * position);
}

export function clampFocusSettings(settings: FocusSettings): FocusSettings {
  const foregroundCutoff = clamp01(settings.foregroundCutoff);
  const backgroundCutoff = Math.max(foregroundCutoff, clamp01(settings.backgroundCutoff));
  return {
    foregroundCutoff,
    backgroundCutoff,
    foregroundSoftness: clamp01(settings.foregroundSoftness),
    backgroundSoftness: clamp01(settings.backgroundSoftness),
  };
}

export function calculateSharpness(depth: number, input: FocusSettings): number {
  const focus = clampFocusSettings(input);
  const value = clamp01(depth);
  const foregroundHalfWidth = focus.foregroundSoftness / 2;
  const backgroundHalfWidth = focus.backgroundSoftness / 2;
  const foregroundTransition = smoothstep(
    focus.foregroundCutoff - foregroundHalfWidth,
    focus.foregroundCutoff + foregroundHalfWidth,
    value,
  );
  const backgroundTransition = 1 - smoothstep(
    focus.backgroundCutoff - backgroundHalfWidth,
    focus.backgroundCutoff + backgroundHalfWidth,
    value,
  );
  return clamp01(foregroundTransition * backgroundTransition);
}

export function calculateBlurAmount(depth: number, input: RenderSettings): number {
  const focus = clampFocusSettings(input.focus);
  const value = clamp01(depth);
  const sharpnessBlur = 1 - calculateSharpness(value, focus);
  let distance = 0;
  if (value < focus.foregroundCutoff) {
    distance = (focus.foregroundCutoff - value) / Math.max(focus.foregroundCutoff, 0.000001);
  } else if (value > focus.backgroundCutoff) {
    distance = (value - focus.backgroundCutoff) / Math.max(1 - focus.backgroundCutoff, 0.000001);
  }
  const transitionScale = value <= focus.foregroundCutoff
    ? focus.foregroundSoftness
    : focus.backgroundSoftness;
  const blurInfluence = Math.max(clamp01(distance), sharpnessBlur * transitionScale);
  return clamp01(input.blurStrength) * clamp01(blurInfluence);
}
