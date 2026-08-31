import type { NormalizationOptions, NormalizedDepth, ParsedDepth } from '../lib/input/types';

export type NormalizationWorkerRequest = {
  readonly id: number;
  readonly depth: ParsedDepth;
  readonly options: NormalizationOptions;
};

export type NormalizationWorkerResponse =
  | { readonly id: number; readonly result: NormalizedDepth }
  | { readonly id: number; readonly error: string };
