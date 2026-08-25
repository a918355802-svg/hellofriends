import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

// Remove the pre-React splash the moment we have something to paint.
document.getElementById('boot-splash')?.remove();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: register the service worker after load so it never competes with the
// first paint for bandwidth on a slow mobile connection.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // A failed registration must never break the app.
    });
  });
}
