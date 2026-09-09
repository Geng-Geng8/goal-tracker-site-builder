(() => {
  'use strict';
  let deferredInstall = null, waitingWorker = null, updating = false;
  const install = document.getElementById('installButton');
  const update = document.getElementById('updateButton');
  const message = document.getElementById('pwaMessage');
  const status = document.getElementById('offlineStatus');
  const network = () => { status.textContent = navigator.onLine ? 'Works locally' : 'Offline · saved locally'; };
  network(); window.addEventListener('online', network); window.addEventListener('offline', network);
  function offerUpdate(worker) { waitingWorker = worker; update.classList.remove('hidden'); message.textContent = 'An update is ready. Finish any current paste or preview before updating. Your saved plan and progress will stay.'; }
  update.addEventListener('click', () => { if (waitingWorker) { updating = true; update.disabled = true; waitingWorker.postMessage({ type: 'ACTIVATE_UPDATE' }); } });
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; install.classList.remove('hidden'); });
  install.addEventListener('click', async () => {
    if (!deferredInstall) return;
    install.disabled = true;
    try { await deferredInstall.prompt(); await deferredInstall.userChoice; }
    catch { message.textContent = 'Use your browser’s Install or Add to Home Screen menu when available.'; }
    finally { deferredInstall = null; install.disabled = false; install.classList.add('hidden'); }
  });
  window.addEventListener('appinstalled', () => { deferredInstall = null; install.classList.add('hidden'); });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (updating) location.reload();
      else message.textContent = 'Ready to use offline on this browser.';
    });
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(registration => {
      if (registration.waiting) offerUpdate(registration.waiting);
      else if (registration.active) message.textContent = 'Ready to use offline on this browser.';
      else message.textContent = 'Preparing this app for offline use…';
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
          if (worker.state === 'redundant') message.textContent = 'Offline preparation did not finish. Reopen online to try again. Your local data is still saved.';
        });
      });
    }).catch(() => { message.textContent = 'Offline installation is unavailable right now. Your tracker still saves locally. Reopen online to try again.'; });
  } else message.textContent = 'This browser saves locally but does not support offline installation.';
})();
