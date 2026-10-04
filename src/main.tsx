import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker for offline resilience (web only, avoid stale APK cache)
if ('serviceWorker' in navigator) {
  const isCapacitor = typeof (window as any).Capacitor !== 'undefined' || window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost';
  if (isCapacitor) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) caches.delete(name);
      });
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .catch(() => {});
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
