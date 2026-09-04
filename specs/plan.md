# Photo Depth Bokeh Implementation Plan

## Delivery rules

- [x] Keep all source and configuration files in TypeScript when the tool supports TypeScript.
- [x] Set `allowJs` to `false` and enable strict TypeScript checks.
- [x] Keep photographs and depth data in the browser.
- [x] Keep the last valid preview when a new input causes an error.
- [x] Complete each phase output gate before work starts on the next phase.
- [x] Record deferred work outside the first-version scope.

## Phase 1: Project foundation

### Input gate

- [x] Approve `specs/requirements.md` and `specs/tech-design.md` as the implementation baseline.
- [x] Resolve conflicts between the requirements and the technical design.
- [x] Confirm that different image resolutions are valid when their aspect ratios match.

### Deliverables

- [x] Create the Svelte 5 and Vite application with Bun.
- [x] Add strict TypeScript, Vitest, Svelte Testing Library, and Playwright configurations.
- [x] Add `fflate` for NPZ decompression.
- [x] Add tasks for development, type checks, unit tests, browser tests, and production builds.
- [x] Create the source directories from the technical design.
- [x] Add a minimal application shell and responsive page layout.
- [x] Add test fixtures for a photograph, a valid depth map, and invalid depth maps.
- [x] Define one configuration module for preview limits, percentiles, aspect tolerance, and JPEG quality.

### Key contracts

- [x] Define `AppConfig` with preview, normalization, aspect, blur, and export limits.
- [x] Define typed fixture builders for small photographs and NumPy arrays.
- [x] Keep configuration values in one module and do not duplicate numeric limits.

### Tests

- [x] Add a smoke test that mounts the application shell.
- [x] Add a static-build smoke test.
- [x] Make the type-check task reject JavaScript source files.

### Output gate

- [x] Make `bun run check` pass.
- [x] Make `bun run test` pass.
- [x] Make `bun run build` produce static HTML, CSS, and bundled assets.
- [x] Open the production build from a local static server without a runtime backend.

## Phase 2: Domain state, focus model, and errors

### Input gate

- [x] Complete the Phase 1 output gate.
- [x] Approve the normalized depth direction: zero is nearest and one is farthest.
- [x] Approve control ranges and default values within the normalized zero-to-one domain.

### Deliverables

- [x] Implement the application state without WebGL dependencies.
- [x] Implement cutoff clamping so the foreground cutoff never exceeds the background cutoff.
- [x] Implement independent softness values for both cutoffs.
- [x] Implement the sharpness mask and local blur amount as pure functions.
- [x] Define error codes and map each expected error to a clear user message.
- [x] Define load, ready, preview, export, and error status values.

### Key contracts

- [x] Define `FocusSettings` with `foregroundCutoff`, `backgroundCutoff`, and both softness values.
- [x] Define `RenderSettings` with `focus` and normalized `blurStrength` values.
- [x] Define `OutputFormat` as `'jpeg' | 'png'`.
- [x] Define `AppState` with inputs, render settings, output format, status, and current error.
- [x] Define `AppErrorCode` for every expected input, GPU, and encoding error.
- [x] Define `AppError` with a code, user message, cause, and recoverable flag.
- [x] Expose `clampFocusSettings(settings): FocusSettings`.
- [x] Expose `calculateSharpness(depth, focus): number`.
- [x] Expose `calculateBlurAmount(depth, settings): number`.

### Tests

- [x] Test cutoff ordering at normal, equal, and crossed values.
- [x] Test each independent soft transition near its cutoff.
- [x] Test that the sharpness mask remains between zero and one.
- [x] Test that values inside the focus range remain sharp.
- [x] Test that depth distance increases the local blur outside the focus range.
- [x] Test that zero blur strength returns zero local blur for all depths.
- [x] Test every error code and user-message mapping.

### Output gate

- [x] Make all state and focus-model unit tests pass.
- [x] Review the CPU focus formulas as the reference contract for the shader.
- [x] Export all shared contracts without importing Svelte or WebGL modules.

## Phase 3: Photograph, NPZ, and depth input pipeline

### Input gate

- [x] Complete the Phase 2 output gate.
- [x] Confirm the supported NumPy contract for DA3 `mini_npz` files.
- [x] Prepare valid, malformed, wrong-type, wrong-shape, and no-finite-value fixtures.

### Deliverables

- [x] Decode browser-supported photographs and retain their source dimensions.
- [x] Decompress NPZ archives with `fflate`.
- [x] Locate the `depth` member without evaluating input data.
- [x] Parse the NumPy header, dimensions, byte order, and `float32` payload.
- [x] Accept only depth arrays with shape `[1, height, width]`.
- [x] Normalize finite depth values with configured low and high percentiles.
- [x] Replace non-finite values with the nearest valid normalized boundary.
- [x] Reject a depth map that has no finite values.
- [x] Compare aspect ratios with the configured tolerance.
- [x] Permit different resolutions when the aspect ratios match.
- [x] Release stale bitmap and array resources when the user replaces an input.
- [x] Add a worker boundary for percentile calculation when profiling requires it.

### Key contracts

- [x] Define `LoadedPhoto` with its bitmap, width, height, MIME type, and base name.
- [x] Define `ParsedDepth` with `Float32Array`, width, and height.
- [x] Define `NormalizedDepth` with normalized data, dimensions, and percentile bounds.
- [x] Expose `loadPhoto(file): Promise<LoadedPhoto>`.
- [x] Expose `parseMiniNpz(buffer): ParsedDepth`.
- [x] Expose `normalizeDepth(depth, options): NormalizedDepth`.
- [x] Expose `validateInputPair(photo, depth, tolerance): void`.
- [x] Make loaders throw typed `AppError` instances.

### Tests

- [x] Test valid DA3 `mini_npz` parsing.
- [x] Test missing `depth`, malformed archives, malformed headers, truncated data, and extra data.
- [x] Test unsupported NumPy types, byte orders, ranks, and shapes.
- [x] Test percentile normalization with outliers and constant finite values.
- [x] Test positive infinity, negative infinity, and `NaN` replacement.
- [x] Test rejection when no finite depth value exists.
- [x] Test matching and mismatching aspect ratios around the tolerance boundary.
- [x] Test a lower-resolution depth map with the photograph aspect ratio.
- [x] Test photograph decode errors.

### Output gate

- [x] Make every parser and normalization unit test pass.
- [x] Load the fixed photograph and DA3 fixture through the public input contracts.
- [x] Show a typed error for every documented input failure.
- [x] Confirm that the input pipeline makes no network request.

## Phase 4: WebGL resource layer and bokeh renderer

### Input gate

- [x] Complete the Phase 3 output gate.
- [x] Approve the CPU focus formulas as the shader reference.
- [x] Confirm WebGL 2 availability in the target Playwright browser.

### Deliverables

- [x] Create WebGL 2 context, shader-program, texture, framebuffer, and cleanup helpers.
- [x] Upload the photograph and normalized depth map once for each valid input pair.
- [x] Configure linear depth-texture sampling for lower-resolution depth maps.
- [x] Build a reduced-resolution dual-Kawase blur pyramid.
- [x] Limit the pyramid with the configured maximum blur radius.
- [x] Implement the final composition shader with both cutoffs and softness values.
- [x] Select and blend blur levels from local depth distance and global blur strength.
- [x] Use only the original photograph when blur strength is zero.
- [x] Limit preview dimensions while preserving the photograph aspect ratio.
- [x] Rebuild preview targets after a size change without decoding either input again.
- [x] Reuse blur resources when only a control value changes.
- [x] Release all GPU resources on input replacement and renderer disposal.

### Key contracts

- [x] Define `GLResource` with an idempotent `dispose(): void` method.
- [x] Define `PreviewSize` with CSS and render-target dimensions.
- [x] Define `RendererCapabilities` with texture, renderbuffer, and viewport limits.
- [x] Implement `BokehRenderer.load(photo, depth): Promise<void>`.
- [x] Implement `BokehRenderer.resizePreview(size): void`.
- [x] Implement `BokehRenderer.render(settings): void`.
- [x] Implement `BokehRenderer.getCapabilities(): RendererCapabilities`.
- [x] Implement `BokehRenderer.dispose(): void`.
- [x] Keep shader uniforms aligned with `RenderSettings` fields.

### Tests

- [x] Test shader compilation and framebuffer completeness with a small fixture.
- [x] Compare GPU sharpness output with the CPU focus formula.
- [x] Compare small rendered outputs with approved reference images and a numeric tolerance.
- [x] Test near blur, far blur, both soft boundaries, and maximum blur.
- [x] Test that zero strength matches the source pixels within encoding tolerance.
- [x] Test lower-resolution depth sampling without block-shaped regions.
- [x] Test preview resizing and aspect-ratio preservation.
- [x] Test resource counts across render, resize, replacement, and disposal operations.
- [x] Test the WebGL 2 unsupported error path.

### Output gate

- [x] Make renderer unit and reference-image tests pass in the target browser.
- [x] Keep cutoff, softness, and strength updates in the composition pass only.
- [x] Confirm that an idle preview does not request animation frames.
- [x] Confirm that resize work does not decode source files again.

## Phase 5: Svelte interface and preview coordination

### Input gate

- [x] Complete the Phase 4 output gate.
- [x] Provide the renderer through its typed public contract.
- [x] Approve control labels, value formats, and responsive layout behavior.

### Deliverables

- [x] Add photograph and NPZ file controls.
- [x] Add the preview canvas with a responsive aspect-ratio container.
- [x] Add cutoff, softness, and blur-strength sliders with numeric values.
- [x] Add JPEG and PNG format selection with JPEG as the default.
- [x] Add the Download Image button in a disabled state until inputs are ready.
- [x] Add a status area for load, render, export, input, and GPU messages.
- [x] Connect Svelte state to one typed `RenderSettings` object.
- [x] Combine rapid control events into one render per animation frame.
- [x] Preserve the last valid preview after a replacement input fails.
- [x] Make all controls usable with a keyboard and visible focus indicators.

### Key contracts

- [x] Define `PreviewController` as the owner of scheduling, renderer calls, and cancellation.
- [x] Implement `PreviewController.setInputs(photo, depth): Promise<void>`.
- [x] Implement `PreviewController.setSettings(settings): void`.
- [x] Implement `PreviewController.resize(size): void`.
- [x] Implement `PreviewController.dispose(): void`.
- [x] Keep Svelte components free of shader and framebuffer details.

### Tests

- [x] Test every visible control label and numeric value.
- [x] Test keyboard changes for every slider.
- [x] Test foreground and background ordering through interface events.
- [x] Test preview updates after each cutoff, softness, and strength change.
- [x] Test event coalescing to one renderer call per animation frame.
- [x] Test JPEG as the default and PNG selection.
- [x] Test disabled and enabled Download Image states.
- [x] Test specific error messages and last-valid-preview retention.
- [x] Test responsive canvas sizing.

### Output gate

- [x] Make all Svelte component tests pass.
- [x] Complete the input-to-preview workflow with the fixed fixtures.
- [x] Use the keyboard to operate each interactive control.
- [x] Confirm that rapid slider input remains responsive.

## Phase 6: Full-resolution export and download

### Input gate

- [x] Complete the Phase 5 output gate.
- [x] Confirm the source dimensions and renderer capabilities before each export.
- [x] Keep the preview renderer active and unchanged during export.

### Deliverables

- [x] Create separate full-resolution textures and render targets for export.
- [x] Apply the current focus, softness, and blur-strength values.
- [x] Reject dimensions beyond texture, renderbuffer, or viewport limits.
- [x] Read completed pixels into a canvas with correct vertical orientation.
- [x] Encode JPEG with quality `0.92` by default.
- [x] Encode lossless PNG when the user selects PNG.
- [x] Build a descriptive file name with the correct extension.
- [x] Start the browser download with the correct MIME type.
- [x] Revoke each object URL after the download starts.
- [x] Release full-resolution GPU and canvas resources after encoding.
- [x] Report allocation and encoding errors without changing the preview.

### Key contracts

- [x] Define `ExportOptions` with format, JPEG quality, and source base name.
- [x] Define `ExportResult` with the blob, MIME type, and file name.
- [x] Implement `BokehRenderer.export(settings, options): Promise<ExportResult>`.
- [x] Expose `buildDownloadName(baseName, format): string` as a pure function.
- [x] Expose `startDownload(result): void` behind an injectable browser adapter.

### Tests

- [x] Test JPEG and PNG MIME types, extensions, and descriptive names.
- [x] Test JPEG quality `0.92` at the canvas-encoding boundary.
- [x] Test full-resolution dimensions in both output formats.
- [x] Test that export uses the current render settings.
- [x] Test GPU-limit rejection before large export resources are allocated.
- [x] Test browser encoding failure and allocation failure messages.
- [x] Test object URL creation and revocation.
- [x] Test that export does not resize or replace the preview.
- [x] Test export resource cleanup after success and failure.

### Output gate

- [x] Download valid JPEG and PNG files through Playwright.
- [x] Decode each downloaded file and confirm its source dimensions.
- [x] Compare each downloaded result with an approved reference image.
- [x] Confirm that a failed export leaves the live preview usable.

## Phase 7: Performance, recovery, and acceptance

### Input gate

- [x] Complete the Phase 6 output gate.
- [x] Run the complete workflow with representative source-size inputs.
- [x] Record baseline load, update, resize, export, memory, and GPU-resource results.

### Deliverables

- [x] Profile depth normalization and move it to a worker only when measurements justify the change.
- [x] Confirm that control changes do not rebuild the blur pyramid.
- [x] Confirm that input replacement cancels stale asynchronous results.
- [x] Handle WebGL context loss and restore a valid preview when possible.
- [x] Add recovery tests for failed replacement inputs and failed exports.
- [x] Add browser workflow tests for load, controls, preview, JPEG, and PNG.
- [x] Add a production-build check to continuous integration.
- [x] Document supported inputs, browser requirements, controls, privacy, and known GPU limits.
- [x] Document the commands for development, tests, and static deployment.

### Key contracts

- [x] Add cancellation tokens or generation identifiers to asynchronous input operations.
- [x] Define worker request and response unions if the normalization worker is enabled.
- [x] Keep worker results compatible with the existing `NormalizedDepth` contract.
- [x] Expose renderer diagnostics only through a development-only interface.

### Tests

- [x] Run all unit, component, renderer, and Playwright tests.
- [x] Test stale load cancellation when the user replaces files quickly.
- [x] Test WebGL context loss, cleanup, and recovery.
- [x] Test repeated input replacement for bitmap and GPU-resource leaks.
- [x] Test an idle page for the absence of a continuous render loop.
- [x] Test the production build from a static server with network processing disabled.
- [x] Complete an accessibility review for labels, keyboard use, focus, and status announcements.
- [x] Complete the acceptance-criteria traceability checklist.

### Output gate

- [x] Make `bun run check`, `bun run test`, and `bun run build` pass.
- [x] Make the Playwright workflow pass for JPEG and PNG downloads.
- [x] Pass every acceptance criterion in `specs/requirements.md`.
- [x] Confirm that the production application sends no photograph or depth data across the network.
- [x] Confirm that no JavaScript source file exists in the repository.
- [x] Record browser and GPU limits that remain after release testing.

## Acceptance-criteria traceability

- [x] Map static operation and static deployment to Phases 1 and 7.
- [x] Map photograph and depth-map input to Phase 3.
- [x] Map cutoff ordering and the sharp range to Phases 2, 4, and 5.
- [x] Map independent soft transitions to Phases 2, 4, and 5.
- [x] Map global blur strength and zero-strength behavior to Phases 2 and 4.
- [x] Map bokeh rendering and nonbinary masks to Phase 4.
- [x] Map immediate preview updates to Phase 5.
- [x] Map full-resolution JPEG and PNG downloads to Phase 6.
- [x] Map browser and GPU limit errors to Phases 4, 6, and 7.
