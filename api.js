(() => {
  'use strict';

  const API_URL_KEY = 'goalTracker:apiUrl:v1';
  const CACHE_KEY = 'goalTracker:lastData:v1';
  const SYNC_KEY = 'goalTracker:lastSynced:v1';
  const REQUEST_TIMEOUT_MS = 12000;

  function normalizeUrl(value) {
    const url = String(value || '').trim();
    if (!url) return '';

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return '';
      if (!/script\.google\.com$/i.test(parsed.hostname)) return '';
      if (!/\/macros\/s\//.test(parsed.pathname)) return '';
      return parsed.toString();
    } catch {
      return '';
    }
  }

  function getEndpoint() {
    return normalizeUrl(localStorage.getItem(API_URL_KEY));
  }

  function setEndpoint(value) {
    const normalized = normalizeUrl(value);
    if (!normalized) {
      throw new Error('That does not look like a Google Apps Script Web App address.');
    }
    localStorage.setItem(API_URL_KEY, normalized);
    return normalized;
  }

  function clearEndpoint() {
    localStorage.removeItem(API_URL_KEY);
  }

  function withTimeout(promise, ms = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return Promise.race([
      promise(controller.signal),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('Request timed out.')), { once: true });
      })
    ]).finally(() => clearTimeout(timer));
  }

  async function getWithFetch(action) {
    const endpoint = getEndpoint();
    if (!endpoint) throw new Error('Google Sheet is not connected.');

    const url = new URL(endpoint);
    url.searchParams.set('action', action);
    url.searchParams.set('_', String(Date.now()));

    return withTimeout(async (signal) => {
      const response = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
        redirect: 'follow',
        signal
      });
      if (!response.ok) throw new Error(`Google returned ${response.status}.`);
      const data = await response.json();
      if (data && data.success === false) throw new Error(data.error || 'Google returned an error.');
      return data;
    });
  }

  function getWithJsonp(action) {
    const endpoint = getEndpoint();
    if (!endpoint) return Promise.reject(new Error('Google Sheet is not connected.'));

    return new Promise((resolve, reject) => {
      const callbackName = `goalTrackerJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const url = new URL(endpoint);
      let finished = false;

      function cleanup() {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        script.remove();
        try {
          delete window[callbackName];
        } catch {
          window[callbackName] = undefined;
        }
      }

      window[callbackName] = (data) => {
        if (data && data.success === false) {
          cleanup();
          reject(new Error(data.error || 'Google returned an error.'));
          return;
        }
        cleanup();
        resolve(data);
      };

      url.searchParams.set('action', action);
      url.searchParams.set('callback', callbackName);
      url.searchParams.set('_', String(Date.now()));
      script.src = url.toString();
      script.async = true;
      script.onerror = () => {
        cleanup();
        reject(new Error('Could not reach Google.'));
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Google took too long to respond.'));
      }, REQUEST_TIMEOUT_MS);

      document.head.appendChild(script);
    });
  }

  async function get(action) {
    try {
      return await getWithFetch(action);
    } catch (fetchError) {
      try {
        return await getWithJsonp(action);
      } catch {
        throw fetchError;
      }
    }
  }

  async function post(payload) {
    const endpoint = getEndpoint();
    if (!endpoint) throw new Error('Google Sheet is not connected.');

    return withTimeout(async (signal) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        cache: 'no-store',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        signal
      });

      if (!response.ok) throw new Error(`Google returned ${response.status}.`);
      const data = await response.json();
      if (data && data.success === false) throw new Error(data.error || 'Google returned an error.');
      return data;
    });
  }

  async function testConnection(candidateUrl) {
    const previous = getEndpoint();
    setEndpoint(candidateUrl);
    try {
      const data = await get('getApp');
      if (!data || !data.success) throw new Error('The Web App responded, but the Goal Tracker data was not found.');
      return data;
    } catch (error) {
      if (previous) {
        localStorage.setItem(API_URL_KEY, previous);
      } else {
        clearEndpoint();
      }
      throw error;
    }
  }

  function saveCachedData(value) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(value));
    } catch {
      // Cache failures should never stop the tracker from working online.
    }
  }

  function readCachedData() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function setLastSynced(date = new Date()) {
    const iso = date.toISOString();
    localStorage.setItem(SYNC_KEY, iso);
    return iso;
  }

  function getLastSynced() {
    return localStorage.getItem(SYNC_KEY) || '';
  }

  window.GoalTrackerAPI = {
    getEndpoint,
    setEndpoint,
    clearEndpoint,
    testConnection,
    getApp: () => get('getApp'),
    getToday: () => get('getToday'),
    getWeek: () => get('getWeek'),
    getHistory: () => get('getHistory'),
    logAction: (payload) => post({ action: 'logAction', ...payload }),
    completeMilestone: (payload) => post({ action: 'completeMilestone', ...payload }),
    saveCachedData,
    readCachedData,
    setLastSynced,
    getLastSynced
  };
})();
