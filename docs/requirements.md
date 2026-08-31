# Photo Depth Bokeh Application Requirements

## Purpose

The application creates a bokeh effect from a photograph and its matching depth map.

The application uses the depth map as a per-pixel blur mask. It keeps a selected depth range sharp and blurs other areas.

## Application form

The application is a static web page. It runs entirely in the browser and does not require a server.

The application shows a live preview. Each control change updates the preview immediately.

## Inputs

The user supplies these input files:

- A photograph.
- A matching depth map.

The application shows a clear error when the files have incompatible dimensions or aspect ratios.

## Focus controls

The application defines the sharp focus range with two main controls:

- **Foreground cutoff:** Sets the nearest boundary of the sharp region.
- **Background cutoff:** Sets the farthest boundary of the sharp region.

The foreground cutoff cannot be farther than the background cutoff. The application keeps pixels between the two cutoffs sharp.

The application applies a bokeh-style blur to pixels outside the sharp range.

## Blur strength

The application has one global **Blur Strength** control. This control sets the maximum blur outside the sharp range.

A value of zero removes the blur effect. Larger values increase the blur without changing the selected focus range.

The same strength applies to the foreground and background in the first version.

## Boundary controls

Each cutoff has an edge-softness control. This control sets the width of the transition between sharp and blurred regions.

A small softness value produces a precise boundary. A large softness value produces a gradual transition.

The soft transition reduces visible depth edges around hair, branches, and other detailed objects.

## Preview

The preview combines the photograph, depth map, focus range, edge-softness values, and blur strength.

The preview preserves the aspect ratio of the photograph. It adapts to the available browser window size.

## Image download

The application has a **Download Image** button. This button creates the effect at the source resolution of the photograph.

The default download format is high-quality JPEG. The user can select PNG for lossless output.

The downloaded image contains the bokeh effect without interface elements. The application uses a clear file name and the correct file extension.

The application reports an error when the browser cannot create a full-resolution image because of a browser or GPU limit.

## Acceptance criteria

The application meets these requirements:

- The application runs as a static web page.
- The application accepts a photograph and its matching depth map.
- The preview updates when the user changes a cutoff, softness value, or blur strength.
- The foreground and background cutoffs define one sharp depth range.
- Each cutoff has an independent soft transition.
- The Blur Strength control sets the maximum blur outside the sharp range.
- A blur strength of zero produces an image without blur.
- Areas outside the sharp range receive a bokeh-style blur.
- The focus transition does not use a hard binary mask.
- The Download Image button creates a full-resolution image for supported browser and GPU limits.
- The default download is a high-quality JPEG.
- The user can select PNG output.
