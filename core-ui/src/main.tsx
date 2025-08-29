import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { preloadFaviconAndLogo } from './utils/favicon'

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
};

// Wait for DOM to be ready, then preload favicon and render app
document.addEventListener('DOMContentLoaded', () => {
  // Preload favicon and logo before rendering the app
  preloadFaviconAndLogo()
    .then(() => {
      renderApp();
    })
    .catch(() => {
      // Render app even if preloading fails
      renderApp();
    });
});
