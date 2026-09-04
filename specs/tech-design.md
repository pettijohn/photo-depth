# Photo Depth Bokeh Application Technical Design

## Goals

The application provides a responsive bokeh preview from a photograph and a DA3 depth map.

The application runs locally in a browser. It does not send photographs or depth data across the network.

## Technology

The project uses these primary tools:

- **Bun:** Installs packages and runs project tasks.
- **Svelte 5:** Implements the user interface and reactive state.
- **Vite:** Provides the development server and creates the static build.
- **TypeScript:** Implements all application, test, worker, and configuration files.
- **WebGL 2:** Processes the image and depth textures on the GPU.

The renderer uses the browser WebGL 2 API directly. A small internal TypeScript layer manages programs, textures, framebuffers, and resource cleanup.

Three.js is not necessary because the application does not use scenes, cameras, geometry, lighting, or 3D object management.

The repository will not contain JavaScript source files. Configuration files will use TypeScript when the related tool supports it.

Small WebGL shaders will exist as string constants in TypeScript files. The repository will not contain separate JavaScript files.

## Browser architecture

The application has four main parts:

1. The file loader reads the photograph and depth map.
2. The depth processor normalizes depth values and creates a GPU texture.
3. The renderer creates the blurred image and combines it with the sharp image.
4. The Svelte interface manages controls, status messages, and the preview canvas.

Svelte stores only user-interface state. The renderer owns WebGL resources and image-processing state.

## Input formats

The photograph loader accepts browser-supported image formats, such as JPEG, PNG, and WebP.

The first version accepts the DA3 `mini_npz` output. This file contains a `depth` array with shape `[1, height, width]`.

The NPZ loader uses `fflate` to decompress the archive. A small TypeScript parser reads the NumPy array header and `float32` data.

The parser rejects unsupported array types, invalid shapes, and malformed files. It does not execute data from the input file.

The application compares the aspect ratios of both inputs. It reports an error when the aspect ratios differ beyond a small tolerance.

The renderer scales the lower-resolution depth map across the photograph. Linear texture sampling prevents block-shaped depth regions.

## Depth normalization

DA3MONO-LARGE produces relative depth without fixed real-world units. The application converts the depth values to a normalized range from zero to one.

The normalization uses low and high percentiles instead of the absolute minimum and maximum. This method reduces the effect of extreme values.

A normalized value of zero represents the nearest valid depth. A normalized value of one represents the farthest valid depth.

The depth processor replaces invalid values with the nearest valid range boundary. It reports an error when no valid depth values exist.

## Focus model

The foreground cutoff defines the near edge of the sharp range. The background cutoff defines the far edge.

Each cutoff has an independent softness value. The renderer uses smooth interpolation across each softness range.

The foreground transition changes from blurred to sharp. The background transition changes from sharp to blurred.

The renderer multiplies both transitions to create the final sharpness mask. This mask always contains values from zero to one.

The interface prevents the foreground cutoff from passing the background cutoff. This rule always keeps the sharp range valid.

One global blur-strength value sets the maximum blur radius. A value of zero selects only the original sharp texture.

The first version uses the same maximum blur for the foreground and background. The depth distance from each cutoff controls the local blur amount.

## Bokeh renderer

The renderer uses WebGL 2 because CPU canvas filters cannot provide a consistent live preview for large photographs.

The renderer decodes the photograph once and uploads it as a GPU texture. It also uploads the normalized depth map once.

A multi-pass blur creates several blur levels at reduced resolutions. A dual-Kawase method provides a fast, soft bokeh-style result.

The renderer creates the full blur pyramid once for each loaded photograph. The configured maximum blur radius limits the pyramid size.

The final pass selects and blends blur levels from the normalized depth. Pixels farther outside the sharp range receive more blur.

The blur-strength value limits the highest selected blur level. Cutoff, softness, and strength changes run only the final composition pass.

A control change does not decode files or rebuild the blur levels.

The renderer limits the preview resolution to a configurable maximum. This limit keeps interaction responsive on high-resolution photographs.

The browser preserves the source files in memory. A resize operation rebuilds only the preview resources.

## User interface

The page contains these areas:

- An input area for the photograph and depth map.
- A preview canvas that preserves the photograph aspect ratio.
- A foreground cutoff slider and its edge-softness control.
- A background cutoff slider and its edge-softness control.
- A global Blur Strength slider.
- A download format selector with JPEG and PNG options.
- A Download Image button.
- A status area for load progress, export progress, GPU errors, and input errors.

Each slider supports keyboard input. Each control has a visible label and a numeric value.

Svelte updates the renderer through one typed state object. `requestAnimationFrame` combines rapid slider events into one preview update per frame.

## TypeScript structure

The source tree separates interface code from image-processing code:

- `src/lib/components/` contains Svelte components.
- `src/lib/state/` contains typed application state.
- `src/lib/input/` contains image, NPZ, and NumPy parsers.
- `src/lib/render/` contains WebGL setup, shaders, textures, and render passes.
- `src/lib/errors/` contains application error types and user messages.
- `src/workers/` contains optional depth-normalization workers.

All modules use strict TypeScript types. The TypeScript configuration sets `allowJs` to `false`.

## Image download

The download action creates a separate offscreen render target at the source resolution. It uses the current focus, softness, and strength values.

The renderer reads the completed pixels into a canvas. The canvas creates a downloadable image blob.

JPEG is the default format with a quality value of 0.92. PNG provides lossless output and a larger file.

The application assigns the correct MIME type, file extension, and descriptive file name. It revokes each temporary object URL after the download starts.

The renderer queries WebGL texture and renderbuffer limits before export. It reports an error when the source dimensions exceed these limits.

The export process does not replace or resize the live preview. It releases full-resolution GPU resources after the browser creates the image blob.

## Performance

The main thread decodes files and controls the interface. A Web Worker can calculate depth percentiles for large maps.

The renderer keeps textures and framebuffers between updates. It releases these resources when the user replaces an input file.

The application requests animation frames only after state changes. It does not operate a continuous render loop while the preview is idle.

## Error handling

The application gives a specific message for each expected error:

- The browser does not support WebGL 2.
- The photograph cannot be decoded.
- The NPZ file does not contain `depth`.
- The depth array has an unsupported type or shape.
- The input aspect ratios do not match.
- The GPU cannot allocate the required preview resources.
- The source dimensions exceed the full-resolution export limits.
- The browser cannot encode the selected download format.

An input error does not remove the last valid preview. The user can replace the incorrect file and try again.

## Testing

Vitest runs unit tests for depth normalization, NPZ parsing, state limits, mask calculations, and download file names.

Svelte Testing Library tests control labels, keyboard input, error messages, strength changes, format selection, and state updates.

Playwright tests the complete browser workflow with fixed photograph and depth fixtures. It also tests JPEG and PNG downloads.

Renderer tests compare small output images with approved reference images. The tests permit a small numeric tolerance for GPU differences.

## Build and deployment

Vite creates static HTML, CSS, and bundled assets. The completed build does not require Bun or a server at run time.

Bun runs development, type, test, and build tasks. The build process fails when TypeScript or Svelte reports an error.

The static build can run from a local web server or any static hosting service. All image processing remains in the browser.

## Initial scope limits

The first version does not infer depth. The user creates the depth map with DA3 before use.

The first version processes one photograph and one depth map at a time. It does not process videos or image batches.

The first version provides the live preview, focus controls, global blur strength, and full-resolution image download.
