import { strToU8, zipSync } from 'fflate';

export interface NpyFixtureOptions {
  readonly descr?: string;
  readonly shape?: readonly number[];
  readonly fortran?: boolean;
  readonly truncateBytes?: number;
  readonly extraBytes?: number;
}

export function makeNpy(values: readonly number[], options: NpyFixtureOptions = {}): Uint8Array {
  const descr = options.descr ?? '<f4';
  const shape = options.shape ?? [1, 2, Math.max(1, values.length / 2)];
  let header = `{'descr': '${descr}', 'fortran_order': ${options.fortran ? 'True' : 'False'}, 'shape': (${shape.join(', ')},), }`;
  const preambleLength = 10;
  const padding = (16 - ((preambleLength + header.length + 1) % 16)) % 16;
  header += ' '.repeat(padding) + '\n';
  const payloadLength = Math.max(0, values.length * 4 - (options.truncateBytes ?? 0)) + (options.extraBytes ?? 0);
  const bytes = new Uint8Array(preambleLength + header.length + payloadLength);
  bytes.set([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0], 0);
  new DataView(bytes.buffer).setUint16(8, header.length, true);
  bytes.set(strToU8(header), preambleLength);
  const view = new DataView(bytes.buffer);
  const availableValues = Math.floor((payloadLength - (options.extraBytes ?? 0)) / 4);
  for (let index = 0; index < Math.min(values.length, availableValues); index += 1) {
    view.setFloat32(preambleLength + header.length + index * 4, values[index]!, true);
  }
  return bytes;
}

export function makeNpz(values: readonly number[], options: NpyFixtureOptions = {}, key = 'depth.npy'): Uint8Array {
  return zipSync({ [key]: makeNpy(values, options) });
}
