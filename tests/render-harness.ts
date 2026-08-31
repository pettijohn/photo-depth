import { BokehRenderer } from '../src/lib/render/BokehRenderer';
import type { LoadedPhoto, NormalizedDepth } from '../src/lib/input/types';
import type { RenderSettings } from '../src/lib/state/types';

const size = 64;
const source = new OffscreenCanvas(size, size);
const context = source.getContext('2d')!;
for (let y = 0; y < 8; y += 1) {
  for (let x = 0; x < 8; x += 1) {
    context.fillStyle = (x + y) % 2 ? '#ffffff' : '#000000';
    context.fillRect(x * 8, y * 8, 8, 8);
  }
}
const bitmap = await createImageBitmap(source);
const photo: LoadedPhoto = { bitmap, width: size, height: size, mimeType: 'image/png', baseName: 'fixture' };
const depthSize = 16;
const values = new Float32Array(depthSize * depthSize);
for (let y = 0; y < depthSize; y += 1) {
  for (let x = 0; x < depthSize; x += 1) values[y * depthSize + x] = x / (depthSize - 1);
}
const depth: NormalizedDepth = { data: values, width: depthSize, height: depthSize, lowValue: 0, highValue: 1 };
const canvas = document.querySelector<HTMLCanvasElement>('#preview')!;
const gl = canvas.getContext('webgl2')!;
const resources = { texturesCreated: 0, texturesDeleted: 0, framebuffersCreated: 0, framebuffersDeleted: 0 };
const createTexture = gl.createTexture.bind(gl);
const deleteTexture = gl.deleteTexture.bind(gl);
const createFramebuffer = gl.createFramebuffer.bind(gl);
const deleteFramebuffer = gl.deleteFramebuffer.bind(gl);
gl.createTexture = () => { resources.texturesCreated += 1; return createTexture(); };
gl.deleteTexture = (value) => { resources.texturesDeleted += 1; deleteTexture(value); };
gl.createFramebuffer = () => { resources.framebuffersCreated += 1; return createFramebuffer(); };
gl.deleteFramebuffer = (value) => { resources.framebuffersDeleted += 1; deleteFramebuffer(value); };
try {
  const renderer = new BokehRenderer(canvas);
  await renderer.load(photo, depth);
  const strength = new URLSearchParams(location.search).get('strength') === 'zero' ? 0 : 1;
  const settings: RenderSettings = {
    focus: { foregroundCutoff: 0.4, backgroundCutoff: 0.6, foregroundSoftness: 0.1, backgroundSoftness: 0.1 },
    blurStrength: strength,
  };
  renderer.render(settings);
  const capabilities = renderer.getCapabilities();
  if (new URLSearchParams(location.search).has('lifecycle')) {
    await renderer.load(photo, depth);
    renderer.resizePreview({ cssWidth: 64, cssHeight: 64, renderWidth: 32, renderHeight: 32 });
    renderer.render(settings);
    renderer.dispose();
  }
  Object.assign(window, { testReady: true, testError: null, rendererCapabilities: capabilities, rendererResources: resources });
} catch (error) {
  Object.assign(window, { testReady: true, testError: String(error) });
}
