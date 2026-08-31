# Implementation Validation

## Test baseline

The test suite covers the focus model, input parsing, normalization, interface, renderer, and export workflow.

The renderer reference tests use Chromium and permit a small pixel difference. This limit permits differences between GPU implementations.

## Performance baseline

The supplied depth fixture contains 169,344 values. Ten normalization runs had an average time of approximately 57 ms on the development system.

This result does not justify worker startup for the supplied DA3 output size. The worker protocol remains available for larger future inputs.

The browser workflow loaded the supplied 5492-by-3672 photograph in approximately 1.2 seconds during the final automated run. The result includes browser startup overhead.

The combined JPEG and PNG export workflow took approximately 7.2 seconds. Both files used the 5492-by-3672 source dimensions.

A control update completes in one requested animation frame. The lifecycle test found equal GPU-resource creation and deletion counts after repeated loads, resize, and disposal.

Browsers do not expose a portable GPU-memory value. The tests use resource counts and allocation errors instead of an estimated GPU-memory value.

The renderer builds the blur pyramid after an input or preview-size change. A control change runs only the composition pass.

The preview controller requests a frame only after a state change. It does not use a continuous render loop.

## Browser and GPU limits

The application requires WebGL 2. It reads these limits before full-resolution export:

- Maximum texture size
- Maximum renderbuffer size
- Maximum viewport width and height

Available GPU memory can impose a lower limit. The application reports allocation errors and keeps the preview available.

The automated browser tests use Chromium. Other WebGL 2 browsers can have different image-encoding and GPU limits.

## Accessibility review

Each input and control has a visible label. The range controls use native keyboard-compatible inputs and visible focus indicators.

The status area announces load, export, recovery, and error messages. The automated workflow operates every slider with keyboard input.

The responsive layout keeps controls in document order at narrow viewport widths.

## Privacy

The production workflow test loads the supplied inputs and examines browser requests. It found no upload or processing endpoint.

The application reads local files with browser APIs. It does not send photograph or depth data across the network.
