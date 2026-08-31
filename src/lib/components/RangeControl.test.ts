import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import RangeControl from './RangeControl.svelte';

describe('RangeControl', () => {
  it('has a label, numeric value, and keyboard-compatible range input', async () => {
    const onValue = vi.fn();
    render(RangeControl, { id: 'blur', label: 'Blur Strength', value: 0.7, onValue });
    const input = screen.getByRole('slider', { name: 'Blur Strength' });
    expect(screen.getByText('0.70')).toBeInTheDocument();
    await fireEvent.input(input, { target: { value: '0.8' } });
    expect(onValue).toHaveBeenCalledWith(0.8);
  });
});
