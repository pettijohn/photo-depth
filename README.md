# Photo Depth Bokeh

Photo Depth Bokeh creates a depth-aware focus effect in a browser. It uses a photograph and a DA3 `mini_npz` depth map.

The application processes all image data locally. It does not upload the photograph or the depth map.

## Requirements

- Bun 1.4 or later
- A browser with WebGL 2
- A GPU that supports the source dimensions for full-resolution export

## Development

Install the packages:

```text
bun install
```

Start the Vite development server:

```text
bun run dev
```

Run the checks and tests:

```text
bun run check
bun run test
bun run test:e2e
```

## Production build

Create the static build:

```text
bun run build
```

Vite writes the completed static files to `docs/`. Serve this directory with a local web server or a static hosting service.

## Inputs

Select these files:

- A photograph in a format that the browser can decode
- A DA3 `mini_npz` file with a `float32` array named `depth` 
- A sample image and npz are available in `sample/`

The depth array must have the shape `[1, height, width]`. The input resolutions can differ, but their aspect ratios must match.

## Controls

The foreground and background cutoffs define the sharp depth range. Each cutoff has a separate edge-softness control.

Blur Strength controls the maximum blur outside the sharp range. A value of zero keeps the photograph sharp.

## Export

JPEG is the default format and uses a quality value of `0.92`. PNG gives lossless output with a larger file size.

The export uses the photograph source dimensions. The application shows an error when a browser or GPU limit prevents export.

## Scope

The application processes one photograph and one prepared depth map. It does not infer depth, process videos, or process image batches.
