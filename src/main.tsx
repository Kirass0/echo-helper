import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
// Onest, self-hosted: the font files are bundled from the npm package, never fetched elsewhere.
import '@fontsource-variable/onest';
import './global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App buildDate={__BUILD_DATE__} />
  </StrictMode>,
);
