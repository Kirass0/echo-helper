import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  // Each test opens the app as on a fresh visit: nothing remembered.
  localStorage.clear();
});

// jsdom has no modal dialogs: showModal() and close() only toggle `open`, and Escape fires `cancel` as a browser does.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const dialog = [...document.querySelectorAll('dialog')].reverse().find((open) => open.open);
    if (dialog?.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
  });
}
