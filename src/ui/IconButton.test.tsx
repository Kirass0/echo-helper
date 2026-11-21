import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';
import { PencilIcon } from './icons';

function renderButton(onClick = () => {}) {
  const user = userEvent.setup();
  render(<IconButton label="Change the Substat at +5" icon={<PencilIcon />} onClick={onClick} />);
  return user;
}

const button = () => screen.getByRole('button', { name: 'Change the Substat at +5' });
const tooltip = () => screen.queryByRole('tooltip');

describe('IconButton', () => {
  it('is labelled by its text and shows no tooltip at first', () => {
    renderButton();
    expect(button()).not.toHaveAttribute('title');
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('shows its label as a tooltip on hover', async () => {
    const user = renderButton();
    await user.hover(button());
    expect(tooltip()).toHaveTextContent('Change the Substat at +5');
    await user.unhover(button());
    await waitFor(() => expect(tooltip()).not.toBeInTheDocument());
  });

  it('shows its tooltip on keyboard focus, and Escape closes it without moving focus', async () => {
    const user = renderButton();
    await user.tab();
    expect(tooltip()).toHaveTextContent('Change the Substat at +5');
    await user.keyboard('{Escape}');
    expect(tooltip()).not.toBeInTheDocument();
    expect(button()).toHaveFocus();
  });

  it('still acts on a click', async () => {
    const onClick = vi.fn();
    const user = renderButton(onClick);
    await user.click(button());
    expect(onClick).toHaveBeenCalledOnce();
  });
});
