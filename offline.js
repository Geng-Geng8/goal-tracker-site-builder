(() => {
  'use strict';

  const QUEUE_KEY = 'goalTracker:offlineQueue:v1';
  const LAST_TAP_KEY = 'goalTracker:lastTap:v1';
  const RAPID_TAP_MS = 900;
  let flushPromise = null;

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `gt-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function readQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function writeQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('goaltracker:queuechange', {
      detail: { count: queue.length }
    }));
  }

  function count() {
    return readQueue().length;
  }

  function isRapidRepeat(key) {
    const now = Date.now();
    let previous = null;
    try {
      previous = JSON.parse(sessionStorage.getItem(LAST_TAP_KEY) || 'null');
    } catch {
      previous = null;
    }

    sessionStorage.setItem(LAST_TAP_KEY, JSON.stringify({ key, at: now }));
    return Boolean(previous && previous.key === key && now - Number(previous.at || 0) < RAPID_TAP_MS);
  }

  function enqueue(type, payload, options = {}) {
    const key = options.rapidTapKey || `${type}:${payload.actionName || payload.milestone || ''}`;
    if (options.preventRapidTap !== false && isRapidRepeat(key)) {
      const error = new Error('That was tapped twice very quickly, so only one action was saved.');
      error.code = 'RAPID_TAP';
      throw error;
    }

    const mutationId = payload.mutationId || makeId();
    const queuedAt = payload.occurredAt || new Date().toISOString();
    const item = {
      id: mutationId,
      type,
      queuedAt,
      attempts: 0,
      lastError: '',
      payload: {
        ...payload,
        mutationId,
        occurredAt: queuedAt
      }
    };

    const queue = readQueue();
    if (!queue.some((existing) => existing.id === item.id)) {
      queue.push(item);
      writeQueue(queue);
    }
    return item;
  }

  function remove(id) {
    const queue = readQueue().filter((item) => item.id !== id);
    writeQueue(queue);
  }

  function updateFailure(id, error) {
    const queue = readQueue();
    const item = queue.find((entry) => entry.id === id);
    if (!item) return;
    item.attempts = Number(item.attempts || 0) + 1;
    item.lastError = String(error && error.message ? error.message : error || 'Sync failed');
    writeQueue(queue);
  }

  async function sendItem(item) {
    if (!window.GoalTrackerAPI) throw new Error('API connector is not ready.');
    if (item.type === 'logAction') {
      return window.GoalTrackerAPI.logAction(item.payload);
    }
    if (item.type === 'completeMilestone') {
      return window.GoalTrackerAPI.completeMilestone(item.payload);
    }
    throw new Error(`Unknown queued action: ${item.type}`);
  }

  async function flush() {
    if (flushPromise) return flushPromise;
    if (!navigator.onLine || !window.GoalTrackerAPI || !window.GoalTrackerAPI.getEndpoint()) {
      return { synced: 0, remaining: count() };
    }

    flushPromise = (async () => {
      let synced = 0;
      const snapshot = readQueue();

      for (const item of snapshot) {
        if (!navigator.onLine) break;
        try {
          await sendItem(item);
          remove(item.id);
          synced += 1;
        } catch (error) {
          updateFailure(item.id, error);
          break;
        }
      }

      const result = { synced, remaining: count() };
      window.dispatchEvent(new CustomEvent('goaltracker:flushcomplete', { detail: result }));
      return result;
    })().finally(() => {
      flushPromise = null;
    });

    return flushPromise;
  }

  function pendingHistoryRows() {
    return readQueue()
      .filter((item) => item.type === 'logAction')
      .map((item) => ({
        ID: item.id,
        Timestamp: item.queuedAt,
        Date: item.queuedAt.slice(0, 10),
        Action: item.payload.actionName || 'Action',
        Points: Number(item.payload.points || 0),
        Category: item.payload.category || '',
        Difficulty: item.payload.difficulty || '',
        Pending: true
      }));
  }

  window.GoalTrackerOffline = {
    enqueue,
    flush,
    count,
    readQueue,
    pendingHistoryRows,
    makeId
  };

  window.addEventListener('online', () => {
    flush().catch(() => {});
  });
})();
