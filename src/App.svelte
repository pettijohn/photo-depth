<script lang="ts">
  import { onMount } from 'svelte';
  import FileInputs from './lib/components/FileInputs.svelte';
  import RangeControl from './lib/components/RangeControl.svelte';
  import { APP_CONFIG } from './lib/config';
  import { AppError, toAppError } from './lib/errors/AppError';
  import { loadPhoto } from './lib/input/photo';
  import { normalizeDepth } from './lib/input/normalize';
  import { parseMiniNpz } from './lib/input/npz';
  import type { LoadedPhoto, NormalizedDepth } from './lib/input/types';
  import { validateInputPair } from './lib/input/validate';
  import { BokehRenderer } from './lib/render/BokehRenderer';
  import { PreviewController } from './lib/render/PreviewController';
  import { startDownload } from './lib/render/export';
  import { fitPreviewSize } from './lib/render/types';
  import { clampFocusSettings } from './lib/state/focus';
  import { DEFAULT_RENDER_SETTINGS, type AppStatus, type OutputFormat, type RenderSettings } from './lib/state/types';

  let canvas: HTMLCanvasElement;
  let previewFrame: HTMLElement;
  let controller = $state<PreviewController | null>(null);
  let resizeObserver: ResizeObserver | null = null;
  let renderSettings: RenderSettings = $state({
    focus: { ...DEFAULT_RENDER_SETTINGS.focus },
    blurStrength: DEFAULT_RENDER_SETTINGS.blurStrength,
  });
  let outputFormat: OutputFormat = $state('jpeg');
  let status: AppStatus = $state('empty');
  let statusMessage = $state('Choose a photograph and its matching DA3 depth map.');
  let currentError: AppError | null = $state(null);
  let photoName: string | undefined = $state();
  let depthName: string | undefined = $state();
  let pendingPhoto: LoadedPhoto | null = null;
  let pendingDepth: NormalizedDepth | null = null;
  let activePhoto = $state<LoadedPhoto | null>(null);
  let activeDepth = $state<NormalizedDepth | null>(null);
  let photoGeneration = 0;
  let depthGeneration = 0;
  let activationGeneration = 0;

  const ready = $derived(Boolean(activePhoto && activeDepth && controller));

  onMount(() => {
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    try {
      controller = createController();
      resizeObserver = new ResizeObserver(() => resizePreview());
      resizeObserver.observe(previewFrame);
    } catch (error) {
      showError(toAppError(error, 'WEBGL2_UNSUPPORTED'));
    }
    return () => {
      resizeObserver?.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      controller?.dispose();
      if (pendingPhoto && pendingPhoto !== activePhoto) pendingPhoto.bitmap.close();
      activePhoto?.bitmap.close();
    };
  });

  async function choosePhoto(file: File): Promise<void> {
    const generation = ++photoGeneration;
    status = 'loading';
    statusMessage = 'Loading the photograph…';
    currentError = null;
    try {
      const photo = await loadPhoto(file);
      if (generation !== photoGeneration) {
        photo.bitmap.close();
        return;
      }
      if (pendingPhoto && pendingPhoto !== activePhoto) pendingPhoto.bitmap.close();
      pendingPhoto = photo;
      photoName = file.name;
      await activatePair();
    } catch (error) {
      if (generation === photoGeneration) showError(toAppError(error, 'PHOTO_DECODE_FAILED'));
    }
  }

  async function chooseDepth(file: File): Promise<void> {
    const generation = ++depthGeneration;
    status = 'loading';
    statusMessage = 'Reading and normalizing the depth map…';
    currentError = null;
    try {
      const parsed = parseMiniNpz(await file.arrayBuffer());
      const depth = normalizeDepth(parsed, {
        lowPercentile: APP_CONFIG.percentileLow,
        highPercentile: APP_CONFIG.percentileHigh,
      });
      if (generation !== depthGeneration) return;
      pendingDepth = depth;
      depthName = file.name;
      await activatePair();
    } catch (error) {
      if (generation === depthGeneration) showError(toAppError(error, 'NPZ_MALFORMED'));
    }
  }

  function createController(): PreviewController {
    return new PreviewController(new BokehRenderer(canvas), renderSettings);
  }

  async function activatePair(): Promise<void> {
    if (!pendingPhoto || !pendingDepth || !controller) {
      status = 'loading';
      statusMessage = pendingPhoto ? 'Choose the matching depth map.' : 'Choose the matching photograph.';
      return;
    }
    const generation = ++activationGeneration;
    try {
      validateInputPair(pendingPhoto, pendingDepth, APP_CONFIG.aspectRatioTolerance);
      statusMessage = 'Preparing the GPU preview…';
      await controller.setInputs(pendingPhoto, pendingDepth);
      if (generation !== activationGeneration) return;
      const oldPhoto = activePhoto;
      activePhoto = pendingPhoto;
      activeDepth = pendingDepth;
      if (oldPhoto && oldPhoto !== activePhoto) oldPhoto.bitmap.close();
      status = 'ready';
      currentError = null;
      statusMessage = 'Preview ready. Adjust the focus controls.';
      resizePreview();
    } catch (error) {
      controller?.setSettings(renderSettings);
      showError(toAppError(error, 'GPU_PREVIEW_ALLOCATION_FAILED'));
    }
  }

  function handleContextLost(event: Event): void {
    event.preventDefault();
    controller?.dispose();
    controller = null;
    showError(new AppError('WEBGL_CONTEXT_LOST'));
  }

  async function handleContextRestored(_event: Event): Promise<void> {
    try {
      controller = createController();
      if (activePhoto && activeDepth) {
        await controller.setInputs(activePhoto, activeDepth);
        status = 'ready';
        currentError = null;
        statusMessage = 'The GPU preview was restored.';
        resizePreview();
      }
    } catch (error) {
      showError(toAppError(error, 'GPU_PREVIEW_ALLOCATION_FAILED'));
    }
  }

  function resizePreview(): void {
    if (!controller || !activePhoto || !previewFrame) return;
    const width = previewFrame.clientWidth;
    const size = fitPreviewSize(activePhoto.width, activePhoto.height, width, APP_CONFIG.previewMaxDimension);
    controller.resize(size);
  }

  function updateFocus(change: Partial<RenderSettings['focus']>): void {
    renderSettings = {
      ...renderSettings,
      focus: clampFocusSettings({ ...renderSettings.focus, ...change }),
    };
    controller?.setSettings(renderSettings);
  }

  function updateBlurStrength(value: number): void {
    renderSettings = { ...renderSettings, blurStrength: value };
    controller?.setSettings(renderSettings);
  }

  async function downloadImage(): Promise<void> {
    if (!controller || !activePhoto) return;
    status = 'exporting';
    currentError = null;
    statusMessage = 'Creating the full-resolution image…';
    try {
      const result = await controller.export(renderSettings, {
        format: outputFormat,
        jpegQuality: APP_CONFIG.jpegQuality,
        sourceBaseName: activePhoto.baseName,
      });
      startDownload(result);
      status = 'ready';
      statusMessage = `Downloaded ${result.fileName}.`;
    } catch (error) {
      showError(toAppError(error, 'EXPORT_ENCODING_FAILED'));
    }
  }

  function showError(error: AppError): void {
    currentError = error;
    status = 'error';
    statusMessage = error.userMessage;
  }
</script>

<svelte:head><title>Photo Depth Bokeh</title></svelte:head>

<main>
  <header class="hero">
    <div>
      <p class="eyebrow">Private, local image processing</p>
      <h1>Photo Depth Bokeh</h1>
    </div>
    <p>Create a depth-aware focus effect. Your files stay in this browser.</p>
  </header>

  <FileInputs {photoName} {depthName} disabled={!controller} onPhoto={choosePhoto} onDepth={chooseDepth} />

  <section class="workspace" aria-label="Bokeh editor">
    <div class="preview-panel">
      <div class="panel-heading">
        <div>
          <p class="step">Step 2</p>
          <h2>Preview</h2>
        </div>
        <span class:ready class="status-chip">{ready ? 'Live' : 'Waiting for files'}</span>
      </div>
      <div class="preview-frame" class:has-preview={ready} bind:this={previewFrame}>
        <canvas bind:this={canvas} aria-label="Bokeh preview"></canvas>
        {#if !ready}
          <div class="preview-placeholder" aria-hidden="true">
            <span>Depth-aware preview</span>
          </div>
        {/if}
      </div>
    </div>

    <aside class="controls" aria-labelledby="controls-title">
      <div>
        <p class="step">Step 3</p>
        <h2 id="controls-title">Focus controls</h2>
      </div>
      <RangeControl id="foreground" label="Foreground cutoff" value={renderSettings.focus.foregroundCutoff} disabled={!ready} onValue={(value) => updateFocus({ foregroundCutoff: value })} />
      <RangeControl id="foreground-softness" label="Foreground edge softness" value={renderSettings.focus.foregroundSoftness} disabled={!ready} onValue={(value) => updateFocus({ foregroundSoftness: value })} />
      <RangeControl id="background" label="Background cutoff" value={renderSettings.focus.backgroundCutoff} disabled={!ready} onValue={(value) => updateFocus({ backgroundCutoff: Math.max(value, renderSettings.focus.foregroundCutoff) })} />
      <RangeControl id="background-softness" label="Background edge softness" value={renderSettings.focus.backgroundSoftness} disabled={!ready} onValue={(value) => updateFocus({ backgroundSoftness: value })} />
      <RangeControl id="blur-strength" label="Blur Strength" value={renderSettings.blurStrength} disabled={!ready} onValue={updateBlurStrength} />

      <div class="export-controls">
        <label for="format">Download format</label>
        <select id="format" bind:value={outputFormat} disabled={!ready}>
          <option value="jpeg">High-quality JPEG</option>
          <option value="png">Lossless PNG</option>
        </select>
        <button type="button" disabled={!ready || status === 'exporting'} onclick={downloadImage}>Download Image</button>
      </div>
    </aside>
  </section>

  <div class:error={currentError} class="status-area" role="status" aria-live="polite">
    <span class="status-dot"></span>
    <span>{statusMessage}</span>
  </div>
</main>
