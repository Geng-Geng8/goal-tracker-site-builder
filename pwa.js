(() => {
  'use strict';

  let deferredInstallPrompt = null;
  const installButton = document.getElementById('installButton');

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('goaltracker:updateavailable'));
          }
        });
      });
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installButton) installButton.classList.remove('hidden');
  });

  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        return;
      }

      installButton.disabled = true;
      try {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
      } finally {
        deferredInstallPrompt = null;
        installButton.disabled = false;
        installButton.classList.add('hidden');
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (installButton) installButton.classList.add('hidden');
  });

  registerServiceWorker();
})();
