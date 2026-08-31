import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.svelte';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe(): void {}
    disconnect(): void {}
  });
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as typeof HTMLCanvasElement.prototype.getContext;
});

describe('App shell', () => {
  it('shows the complete labeled interface', () => {
    render(App);
    expect(screen.getByRole('heading', { name: 'Photo Depth Bokeh' })).toBeInTheDocument();
    expect(screen.getByLabelText('Photograph')).toBeInTheDocument();
    expect(screen.getByLabelText('DA3 depth map')).toBeInTheDocument();
    for (const label of [
      'Foreground cutoff', 'Foreground edge softness', 'Background cutoff',
      'Background edge softness', 'Blur Strength',
    ]) expect(screen.getByRole('slider', { name: label })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Download format' })).toHaveValue('jpeg');
    expect(screen.getByRole('button', { name: 'Download Image' })).toBeDisabled();
  });
});
