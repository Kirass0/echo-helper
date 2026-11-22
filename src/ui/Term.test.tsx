import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Term } from './Term';

const TEXT = 'The Echo Score you aim for in a fully tuned Echo.';

function renderTerm() {
  const user = userEvent.setup();
  render(
    <p>
      Set a <Term tooltip={TEXT}>Target Score</Term> below. <button type="button">Elsewhere</button>
    </p>,
  );
  return user;
}

const term = () => screen.getByRole('button', { name: 'Target Score' });
const tooltip = () => screen.queryByRole('tooltip');

describe('Term', () => {
  it('is a text button described by its tooltip, closed at first', () => {
    renderTerm();
    expect(term()).toHaveAttribute('type', 'button');
    expect(term()).toHaveAccessibleDescription(TEXT);
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('opens on keyboard focus and closes on Escape without moving focus', async () => {
    const user = renderTerm();
    await user.tab();
    expect(term()).toHaveFocus();
    expect(tooltip()).toHaveTextContent(TEXT);

    await user.keyboard('{Escape}');
    expect(tooltip()).not.toBeInTheDocument();
    expect(term()).toHaveFocus();
  });

  it('closes when focus leaves', async () => {
    const user = renderTerm();
    await user.tab();
    await user.tab();
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('opens on hover, stays open while the pointer is over it, and closes when the pointer leaves', async () => {
    const user = renderTerm();
    await user.hover(term());
    expect(tooltip()).toHaveTextContent(TEXT);

    await user.hover(screen.getByRole('tooltip'));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(tooltip()).toBeInTheDocument();

    await user.unhover(screen.getByRole('tooltip'));
    await waitFor(() => expect(tooltip()).not.toBeInTheDocument());
  });

  it('closes on Escape while hovered', async () => {
    const user = renderTerm();
    await user.hover(term());
    await user.keyboard('{Escape}');
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('opens on a tap and closes on a tap elsewhere', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Term tooltip={TEXT}>Target Score</Term>
        <p>Some other text</p>
      </div>,
    );
    await user.pointer({ keys: '[TouchA]', target: term() });
    expect(tooltip()).toHaveTextContent(TEXT);

    await user.pointer({ keys: '[TouchA]', target: screen.getByText('Some other text') });
    expect(tooltip()).not.toBeInTheDocument();
  });
});
