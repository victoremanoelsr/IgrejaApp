
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Service Worker Registration for PWA & Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = import.meta.env.PROD ? '/sw.js' : '/sw-push.js';
    navigator.serviceWorker.register(swUrl, { scope: '/' })
      .then((registration) => {
        console.log('SW registrado com sucesso:', registration.scope);
      })
      .catch((registrationError) => {
        console.warn('Falha no registro do SW:', registrationError);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
