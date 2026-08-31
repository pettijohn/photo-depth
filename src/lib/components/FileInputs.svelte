<script lang="ts">
  let {
    photoName,
    depthName,
    disabled = false,
    onPhoto,
    onDepth,
  }: {
    photoName?: string;
    depthName?: string;
    disabled?: boolean;
    onPhoto: (file: File) => void;
    onDepth: (file: File) => void;
  } = $props();

  function firstFile(event: Event): File | undefined {
    return (event.currentTarget as HTMLInputElement).files?.[0];
  }
</script>

<section class="input-card" aria-labelledby="input-title">
  <div>
    <p class="step">Step 1</p>
    <h2 id="input-title">Choose source files</h2>
  </div>
  <div class="file-field">
    <label for="photo-input">Photograph</label>
    <input id="photo-input" type="file" accept="image/*" {disabled} onchange={(event) => { const file = firstFile(event); if (file) onPhoto(file); }} />
    <small>{photoName ?? 'JPEG, PNG, WebP, or another browser image format'}</small>
  </div>
  <div class="file-field">
    <label for="depth-input">DA3 depth map</label>
    <input id="depth-input" type="file" accept=".npz,application/octet-stream" {disabled} onchange={(event) => { const file = firstFile(event); if (file) onDepth(file); }} />
    <small>{depthName ?? 'DA3 mini_npz with a float32 depth array'}</small>
  </div>
</section>
