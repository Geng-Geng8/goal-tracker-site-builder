(() => {
  'use strict';

  const API = window.GoalTrackerAPI;
  const Offline = window.GoalTrackerOffline;

  const DEMO = {
    app: {
      success: true,
      settings: {
        'App Name': 'My Goal Tracker',
        'Main Goal': 'Turn your goal into daily action.',
        'Daily Point Goal': 10,
        'Weekly Point Goal': 40,
        'Streak Rule': 'Every day'
      },
      categories: [],
      actions: [
        { Action: 'Practice for 10 minutes', Category: 'Practice', Difficulty: 'Easy', Points: 1, 'Daily Goal': 1, 'Weekly Goal': 5, Enabled: 'Yes' },
        { Action: 'Do one focused work block', Category: 'Learning', Difficulty: 'Medium', Points: 3, 'Daily Goal': 1, 'Weekly Goal': 4, Enabled: 'Yes' },
        { Action: 'Finish an important task', Category: 'Big Wins', Difficulty: 'Hard', Points: 5, 'Daily Goal': 0, 'Weekly Goal': 2, Enabled: 'Yes' }
      ],
      milestones: [
        { Milestone: 'Finish my first week', Completed: 'No' },
        { Milestone: 'Reach my first big checkpoint', Completed: 'No' }
      ],
      appText: {
        'Points Name': 'XP',
        'Streak Name': 'Streak'
      }
    },
    today: { success: true, points: 0, actions: [] },
    week: { success: true, points: 0, actions: [] },
    history: { success: true, actions: [] }
  };

  const state = {
    app: DEMO.app,
    today: DEMO.today,
    week: DEMO.week,
    history: DEMO.history,
    loading: false,
    activeView: 'today'
  };

  const els = {};
  let toastTimer = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheElements();
    bindEvents();
    hydrateFromCache();
    updateNetworkStatus();
    updateConnectionCard();
    render();

    if (API.getEndpoint()) {
      refreshData({ quiet: true });
    }
  }

  function cacheElements() {
    [
      'appName', 'mainGoal', 'networkStatus', 'queueStatus', 'connectionCard', 'connectionForm', 'apiUrl',
      'connectionMessage', 'changeConnectionButton', 'todayPoints', 'pointsLabelToday', 'todayProgressText',
      'todayPercent', 'todayProgressBar', 'currentStreak', 'todayActionCount', 'todayGoalStatus', 'streakLabel',
      'actionList', 'actionEmpty', 'weekPoints', 'pointsLabelWeek', 'weekProgressText', 'weekPercent',
      'weekProgressBar', 'weekActionList', 'progressGoalText', 'totalPoints', 'totalActions', 'progressStreak',
      'milestoneList', 'milestoneEmpty', 'historyList', 'historyEmpty', 'refreshButton', 'lastSynced', 'toast'
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

    els.connectionForm.addEventListener('submit', connectSheet);
    els.changeConnectionButton.addEventListener('click', () => {
      els.connectionCard.classList.remove('hidden');
      els.apiUrl.value = API.getEndpoint();
      els.apiUrl.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    els.refreshButton.addEventListener('click', () => refreshData({ quiet: false }));

    window.addEventListener('online', async () => {
      updateNetworkStatus();
      if (API.getEndpoint()) {
        await syncQueueAndRefresh();
      }
    });
    window.addEventListener('offline', updateNetworkStatus);
    window.addEventListener('goaltracker:queuechange', () => {
      updateQueueStatus();
      render();
    });
    window.addEventListener('goaltracker:flushcomplete', (event) => {
      updateQueueStatus();
      if (event.detail && event.detail.synced > 0) {
        showToast(`${event.detail.synced} saved action${event.detail.synced === 1 ? '' : 's'} synced.`);
      }
    });
  }

  function hydrateFromCache() {
    const cached = API.readCachedData();
    if (!cached) return;
    state.app = cached.app || state.app;
    state.today = cached.today || state.today;
    state.week = cached.week || state.week;
    state.history = cached.history || state.history;
  }

  async function connectSheet(event) {
    event.preventDefault();
    const url = els.apiUrl.value;
    setConnectionMessage('Connecting…');

    try {
      await API.testConnection(url);
      setConnectionMessage('Connected. Loading your tracker…');
      await refreshData({ quiet: true });
      els.connectionCard.classList.add('hidden');
      showToast('Google Sheet connected.');
    } catch (error) {
      setConnectionMessage(humanError(error), true);
    }
  }

  function setConnectionMessage(message, isError = false) {
    els.connectionMessage.textContent = message;
    els.connectionMessage.classList.toggle('error', isError);
  }

  function updateConnectionCard() {
    const endpoint = API.getEndpoint();
    els.connectionCard.classList.toggle('hidden', Boolean(endpoint));
    els.changeConnectionButton.textContent = endpoint ? 'Change Google Sheet' : 'Connect Google Sheet';
    if (endpoint) els.apiUrl.value = endpoint;
  }

  async function refreshData({ quiet = false } = {}) {
    if (state.loading || !API.getEndpoint()) {
      updateConnectionCard();
      return;
    }

    if (!navigator.onLine) {
      if (!quiet) showToast('You are offline. Showing saved information.');
      render();
      return;
    }

    state.loading = true;
    els.refreshButton.disabled = true;

    try {
      await Offline.flush();
      const [app, today, week, history] = await Promise.all([
        API.getApp(),
        API.getToday(),
        API.getWeek(),
        API.getHistory()
      ]);

      state.app = app;
      state.today = today;
      state.week = week;
      state.history = history;
      API.saveCachedData({ app, today, week, history });
      API.setLastSynced();
      updateConnectionCard();
      render();
      if (!quiet) showToast('Tracker refreshed.');
    } catch (error) {
      const cached = API.readCachedData();
      if (cached) {
        state.app = cached.app || state.app;
        state.today = cached.today || state.today;
        state.week = cached.week || state.week;
        state.history = cached.history || state.history;
      }
      render();
      if (!quiet) showToast(`Could not refresh: ${humanError(error)}`);
    } finally {
      state.loading = false;
      els.refreshButton.disabled = false;
    }
  }

  async function syncQueueAndRefresh() {
    try {
      const result = await Offline.flush();
      if (result.synced > 0 || result.remaining === 0) {
        await refreshData({ quiet: true });
      }
    } catch {
      updateQueueStatus();
    }
  }

  function switchView(view) {
    state.activeView = view;
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.view === view);
    });
    document.querySelectorAll('.view').forEach((section) => {
      section.classList.toggle('active', section.id === `view-${view}`);
    });
  }

  function render() {
    updateNetworkStatus();
    updateQueueStatus();
    renderHeader();
    renderToday();
    renderWeek();
    renderProgress();
    renderHistory();
    renderLastSynced();
  }

  function renderHeader() {
    const settings = getSettings();
    const appName = getSetting(['App Name', 'Name'], 'My Goal Tracker');
    const mainGoal = getSetting(['Main Goal', 'Goal'], 'Turn your goal into daily action.');
    document.title = appName;
    els.appName.textContent = appName;
    els.mainGoal.textContent = mainGoal;
    els.progressGoalText.textContent = mainGoal;
    els.streakLabel.textContent = getText(['Streak Name', 'Streak'], 'Streak');
  }

  function renderToday() {
    const actions = enabledActions();
    const pointsName = getText(['Points Name', 'Points', 'XP Name'], 'XP');
    const pending = pendingRowsForDate(todayKey());
    const serverActions = Array.isArray(state.today.actions) ? state.today.actions : [];
    const todayRows = [...serverActions, ...pending];
    const serverPoints = number(state.today.points);
    const pendingPoints = pending.reduce((sum, row) => sum + number(row.Points), 0);
    const points = serverPoints + pendingPoints;
    const goal = dailyPointGoal();
    const percent = percentOf(points, goal);
    const streak = calculateStreak();

    els.todayPoints.textContent = formatNumber(points);
    els.pointsLabelToday.textContent = pointsName;
    els.todayProgressText.textContent = `${formatNumber(points)} of ${formatNumber(goal)} ${pointsName}`;
    els.todayPercent.textContent = `${percent}%`;
    setProgress(els.todayProgressBar, percent);
    els.todayActionCount.textContent = String(todayRows.length);
    els.currentStreak.textContent = `${streak} day${streak === 1 ? '' : 's'}`;
    els.todayGoalStatus.textContent = points >= goal && goal > 0 ? 'Goal complete' : 'Keep going';

    els.actionList.replaceChildren();
    els.actionEmpty.classList.toggle('hidden', actions.length > 0);

    actions.forEach((action) => {
      els.actionList.appendChild(makeActionButton(action, pointsName));
    });
  }

  function makeActionButton(action, pointsName) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action-card';

    const top = document.createElement('div');
    top.className = 'action-topline';

    const copy = document.createElement('div');
    copy.className = 'row-copy';

    const name = document.createElement('div');
    name.className = 'action-name';
    name.textContent = String(action.Action || 'Action');

    const meta = document.createElement('div');
    meta.className = 'action-meta';
    meta.textContent = [action.Category, action.Difficulty].filter(Boolean).join(' • ') || 'Goal action';

    const chip = document.createElement('span');
    chip.className = 'points-chip';
    chip.textContent = `+${formatNumber(number(action.Points))} ${pointsName}`;

    copy.append(name, meta);
    top.append(copy, chip);
    button.append(top);
    button.addEventListener('click', () => logAction(action, button));
    return button;
  }

  async function logAction(action, button) {
    if (!API.getEndpoint()) {
      els.connectionCard.classList.remove('hidden');
      showToast('Connect your Google Sheet first.');
      els.apiUrl.focus();
      return;
    }

    try {
      const item = Offline.enqueue('logAction', {
        actionName: String(action.Action || ''),
        points: number(action.Points),
        category: String(action.Category || ''),
        difficulty: String(action.Difficulty || '')
      });

      button.disabled = true;
      render();
      showToast(`Saved ${action.Action}. +${formatNumber(number(action.Points))}`);

      if (navigator.onLine) {
        await Offline.flush();
        await refreshData({ quiet: true });
      }

      return item;
    } catch (error) {
      showToast(humanError(error));
    } finally {
      setTimeout(() => {
        button.disabled = false;
      }, 350);
    }
  }

  function renderWeek() {
    const pointsName = getText(['Points Name', 'Points', 'XP Name'], 'XP');
    const pending = pendingRowsForWeek();
    const serverRows = Array.isArray(state.week.actions) ? state.week.actions : [];
    const rows = [...serverRows, ...pending];
    const points = number(state.week.points) + pending.reduce((sum, row) => sum + number(row.Points), 0);
    const goal = weeklyPointGoal();
    const percent = percentOf(points, goal);

    els.weekPoints.textContent = formatNumber(points);
    els.pointsLabelWeek.textContent = pointsName;
    els.weekProgressText.textContent = `${formatNumber(points)} of ${formatNumber(goal)} ${pointsName}`;
    els.weekPercent.textContent = `${percent}%`;
    setProgress(els.weekProgressBar, percent);

    const actions = enabledActions();
    els.weekActionList.replaceChildren();

    if (!actions.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No actions are turned on yet.';
      els.weekActionList.appendChild(empty);
      return;
    }

    actions.forEach((action) => {
      const name = String(action.Action || 'Action');
      const count = rows.filter((row) => String(row.Action || '') === name).length;
      const target = number(action['Weekly Goal']);
      const row = document.createElement('div');
      row.className = 'week-row';

      const copy = document.createElement('div');
      copy.className = 'row-copy';
      const title = document.createElement('p');
      title.className = 'row-title';
      title.textContent = name;
      const meta = document.createElement('p');
      meta.className = 'row-meta';
      meta.textContent = target > 0 ? `Weekly goal: ${target}` : 'No weekly target';
      copy.append(title, meta);

      const value = document.createElement('span');
      value.className = 'row-value';
      value.textContent = target > 0 ? `${count}/${target}` : String(count);
      row.append(copy, value);
      els.weekActionList.appendChild(row);
    });
  }

  function renderProgress() {
    const rows = combinedHistoryRows();
    const streak = calculateStreak();
    els.totalPoints.textContent = formatNumber(rows.reduce((sum, row) => sum + number(row.Points), 0));
    els.totalActions.textContent = String(rows.length);
    els.progressStreak.textContent = `${streak} day${streak === 1 ? '' : 's'}`;

    const milestones = Array.isArray(state.app.milestones) ? state.app.milestones : [];
    els.milestoneList.replaceChildren();
    els.milestoneEmpty.classList.toggle('hidden', milestones.length > 0);

    milestones.forEach((milestone) => {
      const row = document.createElement('div');
      row.className = 'milestone-row';
      const copy = document.createElement('div');
      copy.className = 'row-copy';
      const title = document.createElement('p');
      title.className = 'row-title';
      title.textContent = String(milestone.Milestone || 'Milestone');
      const meta = document.createElement('p');
      meta.className = 'row-meta';

      const completed = yes(milestone.Completed);
      const pending = String(milestone.Completed || '').toLowerCase() === 'pending';
      meta.textContent = completed ? 'Completed' : pending ? 'Waiting to sync' : 'Not completed yet';
      copy.append(title, meta);
      row.appendChild(copy);

      if (completed) {
        const mark = document.createElement('span');
        mark.className = 'row-value milestone-complete';
        mark.textContent = '✓';
        row.appendChild(mark);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'milestone-button';
        button.textContent = pending ? 'Pending' : 'Mark done';
        button.disabled = pending;
        button.addEventListener('click', () => completeMilestone(milestone, button));
        row.appendChild(button);
      }

      els.milestoneList.appendChild(row);
    });
  }

  async function completeMilestone(milestone, button) {
    if (!API.getEndpoint()) {
      els.connectionCard.classList.remove('hidden');
      showToast('Connect your Google Sheet first.');
      return;
    }

    try {
      Offline.enqueue('completeMilestone', {
        milestone: String(milestone.Milestone || '')
      }, {
        rapidTapKey: `milestone:${milestone.Milestone}`
      });
      milestone.Completed = 'Pending';
      button.disabled = true;
      renderProgress();
      showToast('Milestone saved.');

      if (navigator.onLine) {
        await Offline.flush();
        await refreshData({ quiet: true });
      }
    } catch (error) {
      showToast(humanError(error));
    }
  }

  function renderHistory() {
    const rows = combinedHistoryRows().sort((a, b) => dateValue(b.Timestamp || b.Date) - dateValue(a.Timestamp || a.Date));
    els.historyList.replaceChildren();
    els.historyEmpty.classList.toggle('hidden', rows.length > 0);

    rows.slice(0, 100).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'history-row';

      const copy = document.createElement('div');
      copy.className = 'row-copy';
      const title = document.createElement('p');
      title.className = 'row-title';
      title.textContent = String(item.Action || 'Action');
      if (item.Pending) {
        const pending = document.createElement('span');
        pending.className = 'pending-tag';
        pending.textContent = 'Waiting to sync';
        title.appendChild(pending);
      }
      const meta = document.createElement('p');
      meta.className = 'row-meta';
      meta.textContent = formatDateTime(item.Timestamp || item.Date);
      copy.append(title, meta);

      const value = document.createElement('span');
      value.className = 'row-value';
      value.textContent = `+${formatNumber(number(item.Points))}`;
      row.append(copy, value);
      els.historyList.appendChild(row);
    });
  }

  function updateNetworkStatus() {
    const online = navigator.onLine;
    els.networkStatus.textContent = online ? 'Online' : 'Offline — actions will sync later';
    els.networkStatus.classList.toggle('online', online);
    els.networkStatus.classList.toggle('offline', !online);
  }

  function updateQueueStatus() {
    const count = Offline.count();
    els.queueStatus.textContent = `${count} waiting to sync`;
    els.queueStatus.classList.toggle('offline', count > 0);
  }

  function renderLastSynced() {
    const value = API.getLastSynced();
    if (!value) {
      els.lastSynced.textContent = API.getEndpoint() ? 'Not synced yet' : 'Google Sheet not connected';
      return;
    }
    els.lastSynced.textContent = `Last synced ${formatDateTime(value)}`;
  }

  function getSettings() {
    return state.app && state.app.settings && typeof state.app.settings === 'object' ? state.app.settings : {};
  }

  function getSetting(keys, fallback) {
    const settings = getSettings();
    for (const key of keys) {
      if (settings[key] !== undefined && settings[key] !== null && String(settings[key]).trim() !== '') {
        return settings[key];
      }
    }
    return fallback;
  }

  function getText(keys, fallback) {
    const appText = state.app && state.app.appText && typeof state.app.appText === 'object' ? state.app.appText : {};
    for (const key of keys) {
      if (appText[key] !== undefined && appText[key] !== null && String(appText[key]).trim() !== '') {
        return String(appText[key]);
      }
    }
    return fallback;
  }

  function enabledActions() {
    const actions = Array.isArray(state.app.actions) ? state.app.actions : [];
    return actions.filter((action) => !String(action.Enabled || 'Yes').trim().toLowerCase().startsWith('n'));
  }

  function dailyPointGoal() {
    const explicit = number(getSetting(['Daily Point Goal', 'Daily Points Goal', 'Daily Goal'], 0));
    if (explicit > 0) return explicit;
    const derived = enabledActions().reduce((sum, action) => sum + number(action.Points) * number(action['Daily Goal']), 0);
    return derived > 0 ? derived : 10;
  }

  function weeklyPointGoal() {
    const explicit = number(getSetting(['Weekly Point Goal', 'Weekly Points Goal', 'Weekly Goal'], 0));
    if (explicit > 0) return explicit;
    const derived = enabledActions().reduce((sum, action) => sum + number(action.Points) * number(action['Weekly Goal']), 0);
    return derived > 0 ? derived : dailyPointGoal() * 4;
  }

  function combinedHistoryRows() {
    const server = Array.isArray(state.history.actions) ? state.history.actions : [];
    const serverIds = new Set(server.map((row) => String(row.ID || '')));
    const pending = Offline.pendingHistoryRows().filter((row) => !serverIds.has(String(row.ID || '')));
    return [...server, ...pending];
  }

  function pendingRowsForDate(key) {
    return Offline.pendingHistoryRows().filter((row) => normalizeDateKey(row.Date || row.Timestamp) === key);
  }

  function pendingRowsForWeek() {
    const start = startOfWeek(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return Offline.pendingHistoryRows().filter((row) => {
      const d = new Date(row.Timestamp || row.Date);
      return !Number.isNaN(d.getTime()) && d >= start && d < end;
    });
  }

  function calculateStreak() {
    const goal = number(getSetting(['Successful Day Points', 'Daily Point Goal', 'Daily Points Goal'], dailyPointGoal()));
    if (goal <= 0) return 0;

    const totals = new Map();
    combinedHistoryRows().forEach((row) => {
      const key = normalizeDateKey(row.Date || row.Timestamp);
      if (!key) return;
      totals.set(key, (totals.get(key) || 0) + number(row.Points));
    });

    const rule = String(getSetting(['Streak Rule', 'Streak Rules'], 'Every day')).toLowerCase();
    const skipWeekends = rule.includes('weekday');
    let cursor = new Date();
    cursor.setHours(12, 0, 0, 0);

    if (!isRequiredDay(cursor, skipWeekends)) {
      cursor = previousRequiredDay(cursor, skipWeekends);
    }

    const todayMeets = (totals.get(localDateKey(cursor)) || 0) >= goal;
    if (!todayMeets && localDateKey(cursor) === todayKey()) {
      cursor = previousRequiredDay(cursor, skipWeekends);
    }

    let streak = 0;
    for (let i = 0; i < 366; i += 1) {
      const key = localDateKey(cursor);
      if ((totals.get(key) || 0) < goal) break;
      streak += 1;
      cursor = previousRequiredDay(cursor, skipWeekends);
    }
    return streak;
  }

  function isRequiredDay(date, skipWeekends) {
    if (!skipWeekends) return true;
    const day = date.getDay();
    return day !== 0 && day !== 6;
  }

  function previousRequiredDay(date, skipWeekends) {
    const result = new Date(date);
    do {
      result.setDate(result.getDate() - 1);
    } while (!isRequiredDay(result, skipWeekends));
    return result;
  }

  function todayKey() {
    return localDateKey(new Date());
  }

  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function normalizeDateKey(value) {
    if (!value) return '';
    const text = String(value);
    const simple = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (simple) return simple[1];
    return localDateKey(new Date(value));
  }

  function startOfWeek(date) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1);
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function setProgress(element, percent) {
    const safe = Math.min(100, Math.max(0, percent));
    element.style.width = `${safe}%`;
    const track = element.parentElement;
    if (track) track.setAttribute('aria-valuenow', String(safe));
  }

  function percentOf(value, goal) {
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((value / goal) * 100));
  }

  function yes(value) {
    const text = String(value || '').trim().toLowerCase();
    return ['yes', 'true', 'done', 'complete', 'completed', '1'].includes(text);
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(number(value));
  }

  function dateValue(value) {
    const d = new Date(value || 0);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function formatDateTime(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value || '');
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(d);
  }

  function humanError(error) {
    if (!error) return 'Something went wrong.';
    if (error.code === 'RAPID_TAP') return error.message;
    if (!navigator.onLine) return 'You are offline. Your saved actions will sync when internet returns.';
    return error.message || String(error);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('show');
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }
})();
