import { STORAGE_KEY, MAX_SETUP, MAX_BACKUP, DAYS, AREAS, QUESTIONS, SAFETY_MESSAGE, LocalStore, StorageError, ValidationError, freshState, safetyConcern, makePrompt, parseSetup, matchPlan, repairPrompt, validateConfig, completeAction, calculate, dateKey, makeBackup, parseBackup } from './core.js';

const $ = id => document.getElementById(id);
const main = $('main');
let store, state, preview = null, screen = null, toastTimer, historyLimit = 100, renderedDate = dateKey();
let writes = Promise.resolve();
try { store = new LocalStore(localStorage, navigator.locks); state = store.read(); } catch (error) { showStorageError(error); }

// All user/AI/backup strings enter the DOM through textContent or input.value.
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, onClick, secondary = false) {
  const b = el('button', text, secondary ? 'button button-secondary' : 'button'); b.type = 'button';
  b.addEventListener('click', async () => {
    if (b.disabled) return;
    b.disabled = true;
    try { await onClick(); } catch (error) { if (error instanceof StorageError) showStorageError(error); else toast(error instanceof ValidationError ? error.problems.join(' ') : 'That could not be completed. Please try again.'); }
    finally { if (b.isConnected) b.disabled = false; }
  }); return b;
}
function para(text, parent = main, cls = 'subtle') { const p = el('p', text, cls); parent.append(p); return p; }
function title(text, eyebrow) { if (eyebrow) main.append(el('p', eyebrow, 'eyebrow')); const h = el('h1', text); h.tabIndex = -1; main.append(h); return h; }
function row(...nodes) { const div = el('div', undefined, 'button-row'); div.append(...nodes); return div; }
function card() { const node = el('section', undefined, 'card hero-card'); main.append(node); return node; }
function toast(text) { clearTimeout(toastTimer); $('toast').textContent = text; $('toast').classList.add('show'); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 5000); }
function showStorageError(error) { $('storageMessage').textContent = error.message; $('storageMessage').classList.remove('hidden'); }
function mutate(fn) {
  const result = writes.then(async () => { state = await store.change(fn); $('storageMessage').classList.add('hidden'); return state; });
  writes = result.catch(() => {}); return result;
}
async function go(stage) { await mutate(s => { s.onboarding.stage = stage; return s; }); screen = null; preview = null; render(); }
function setOnboarding(fn) { return mutate(s => { fn(s.onboarding); return s; }); }
function field(label, value, max = 500, large = true) {
  const wrap = el('div', undefined, 'field'); const id = `field-${document.querySelectorAll('textarea,input').length}`;
  const l = el('label', label); l.htmlFor = id;
  const input = el(large ? 'textarea' : 'input'); input.id = id; input.value = value; input.maxLength = max; input.autocomplete = 'off'; input.spellcheck = true;
  if (large) input.rows = 5;
  wrap.append(l, input); return { wrap, input };
}
function progress(value, max, label, parent) {
  const p = el('progress'); p.max = max; p.value = Math.min(value, max); p.setAttribute('aria-label', label); parent.append(p);
}
function summary(c, parent) {
  const dl = el('dl', undefined, 'summary');
  for (const [label, value] of [['Tracker', c.appName], ['Goal', c.mainGoal], ['Success', c.successDefinition], ['Time', c.targetDate], ['Schedule', c.scheduledDays.map(d => DAYS[d]).join(', ')], ['Daily target', `${c.dailyTarget} useful action${c.dailyTarget === 1 ? '' : 's'}`], ['Style', `${c.style.feel} · ${c.style.mode} · ${c.style.accent}`]]) dl.append(el('dt', label), el('dd', value));
  parent.append(dl, el('h2', 'Your actions'));
  const list = el('ul'); c.actions.forEach(a => list.append(el('li', `${a.name} · ${a.difficulty} · ${a.points} ${c.pointsName}`))); parent.append(list);
  if (c.milestones.length) { parent.append(el('h2', 'Milestones')); const ms = el('ul'); c.milestones.forEach(m => ms.append(el('li', m.name))); parent.append(ms); }
}
function applyTheme(c) {
  document.documentElement.dataset.mode = c?.style.mode || 'dark';
  document.documentElement.dataset.accent = c?.style.accent || 'lime';
  document.documentElement.dataset.feel = c?.style.feel || 'calm';
}
function render(focus = true) {
  main.replaceChildren();
  applyTheme(preview || state?.trackerConfig);
  document.title = state?.trackerConfig?.appName || 'Universal Goal Tracker';
  if (!state) recovery();
  else if (screen === 'teacher') teacher();
  else if (screen === 'tools') settings();
  else if (preview) previewScreen();
  else ({ welcome, area, builder, review, handoff, import: importScreen, tracker }[state.onboarding.stage])();
  if (focus) main.querySelector('h1')?.focus();
}
function welcome() {
  title('Build Your Own Goal Tracker', 'SMALL ACTIONS. SOMETHING THAT MATTERS.');
  para('Turn something you want to improve into your own personal tracker.');
  const box = card(); box.append(el('h2', 'You make the important decisions.'));
  para('AI helps organize your plan. Use AI to build something that helps you do the work.', box);
  para('About 15–25 minutes. No account needed here.', box);
  box.append(row(button('BUILD MY TRACKER', () => go('area')), button("I'M A TEACHER", () => { screen = 'teacher'; render(); }, true)));
  para('Age 13+. If you are younger than 13, complete the AI part with a teacher, parent, guardian, or another appropriate adult using an appropriate account.', box);
  para('Keep legal names, contact details, school, location and health information out of your plan. The AI tool you use has its own privacy rules. Only copy a plan you are comfortable sharing.', box);
  showLegacyNotice(box);
}
const LEGACY_KEYS = ['goalTracker:apiUrl:v1', 'goalTracker:lastData:v1', 'goalTracker:lastSynced:v1', 'goalTracker:offlineQueue:v1', 'goalTracker:lastTap:v1'];
function legacyData() { try { return Object.fromEntries(LEGACY_KEYS.map(k => [k, localStorage.getItem(k)]).filter(([, v]) => v !== null)); } catch { return {}; } }
function showLegacyNotice(parent) {
  if (!Object.keys(legacyData()).length) return;
  para('Data from an earlier tracker is still on this browser. It has been left untouched. Its old history cannot be automatically converted into a complete V1 tracker.', parent, 'notice');
  parent.append(button('Save earlier data for safekeeping', () => download(JSON.stringify(legacyData(), null, 2), 'earlier-tracker-archive.json'), true));
  para('This archive is for safekeeping; it is not a V1 restore file.', parent);
}
function area() {
  title('What would you like to work on?', 'STEP 1 · CHOOSE A GOAL AREA');
  para('Pick a starting point. You decide the goal.');
  const grid = el('div', undefined, 'action-grid');
  AREAS.forEach(a => grid.append(button(a, async () => { await setOnboarding(o => { o.area = a; o.approved = false; o.stage = 'builder'; o.step = 0; }); render(); }, true)));
  main.append(grid, row(button('BACK', () => go('welcome'), true)));
}
const IDEAS = {
  School: ['Explain a math method in my own words', 'Practice a few questions, then check my work'],
  Sports: ['Practice a technique safely', 'Ask my coach for feedback on one skill'],
  Fitness: ['Build a comfortable movement routine', 'Choose an enjoyable activity with time for rest'],
  Reading: ['Read regularly and remember what I learn', 'Read a short section and write one thought'],
  'Art / Music': ['Practice a drawing or music technique', 'Make a small study and notice one improvement'],
  'Saving Money': ['Plan small purchases more thoughtfully', 'Compare a want with my saving goal'],
  'Learning a Skill': ['Learn a few useful phrases', 'Practice one small skill and use it'],
  'Helping at Home': ['Help with a regular household task', 'Finish one agreed task carefully'],
  'Something Else': ['Get better at something I enjoy', 'Practice a small useful step'],
  "I Don't Know Yet": ['What would you like to feel more confident doing?', 'Try a small goal: summarize what you read, practice a skill, or finish a helpful task. Choose one that matters to you.']
};
function builder() {
  const o = state.onboarding, [key, question, help] = QUESTIONS[o.step];
  title(question, `QUESTION ${o.step + 1} OF ${QUESTIONS.length} · ${o.area}`);
  progress(o.step + 1, QUESTIONS.length, `Question ${o.step + 1} of ${QUESTIONS.length}`, main);
  para(help);
  const box = card(); let input;
  if (key === 'schedule') {
    const group = el('fieldset'), legend = el('legend', 'Choose the days that work for you'); group.append(legend);
    const count = para(`${o.scheduledDays.length} days each week`, box);
    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
      const label = el('label', undefined, 'day-choice'); const check = el('input'); check.type = 'checkbox'; check.value = String(day); check.checked = o.scheduledDays.includes(day);
      check.addEventListener('change', () => {
        const selected = [...group.querySelectorAll('input:checked')].map(n => Number(n.value));
        count.textContent = `${selected.length} days each week`;
        setOnboarding(d => { d.scheduledDays = selected; d.approved = false; }).catch(showStorageError);
      }); label.append(check, el('span', DAYS[day])); group.append(label);
    }
    box.append(group);
  } else {
    const f = field('Your answer', o.answers[key], key === 'name' ? 60 : key === 'time' ? 100 : 500, !['name', 'time'].includes(key)); input = f.input; box.append(f.wrap);
    input.addEventListener('input', () => { const value = input.value; setOnboarding(d => { d.answers[key] = value; d.approved = false; }).catch(showStorageError); });
    const ideas = el('div', undefined, 'notice hidden'); ideas.setAttribute('role', 'status');
    const generic = { why: 'Think about how this would help you in everyday life.', success: 'What could you show, explain, finish, or do more confidently?', time: 'Try a time frame with room to learn, such as 6 weeks.', easy: 'Pick the smallest useful version of an action you already listed.', effort: 'Which action needs more focus or practice, while staying safe?', feel: 'Calm and dark? Sporty and blue? A simple light layout? You choose.', name: 'Try a short title such as Small Steps, Practice Lab, or My Next Chapter.' };
    box.append(button('GIVE ME IDEAS', () => { ideas.textContent = generic[key] || IDEAS[o.area].join(' '); ideas.classList.remove('hidden'); }, true), ideas);
  }
  const error = el('p', '', 'form-message error'); error.setAttribute('role', 'alert'); box.append(error);
  box.append(row(button('NEXT', async () => {
    await writes;
    const latest = state.onboarding;
    if (key === 'schedule' ? !latest.scheduledDays.length : !latest.answers[key].trim()) { error.textContent = key === 'schedule' ? 'Choose at least one realistic day.' : 'Add your answer before moving on.'; input?.focus(); return; }
    if (safetyConcern(Object.values(latest.answers).join(' '))) { error.textContent = SAFETY_MESSAGE; return; }
    await setOnboarding(d => { if (d.step === 9) d.stage = 'review'; else d.step++; }); render();
  }), button('BACK', async () => { await setOnboarding(d => { if (d.step === 0) d.stage = 'area'; else d.step--; }); render(); }, true)));
}
function review() {
  title('Your Goal Plan', 'STEP 2 · YOU DECIDE');
  para('Check that this sounds like you. Approve it before sharing anything with AI.');
  const box = card(), dl = el('dl', undefined, 'summary');
  QUESTIONS.forEach(([key, q]) => dl.append(el('dt', q), el('dd', key === 'schedule' ? state.onboarding.scheduledDays.map(d => DAYS[d]).join(', ') : state.onboarding.answers[key])));
  box.append(dl, row(button('LOOKS GOOD', async () => {
    if (safetyConcern(JSON.stringify(state.onboarding.answers))) { toast(SAFETY_MESSAGE); return; }
    await setOnboarding(o => { o.approved = true; o.stage = 'handoff'; }); render();
  }), button('CHANGE SOMETHING', async () => { await setOnboarding(o => { o.approved = false; o.step = 0; o.stage = 'builder'; }); render(); }, true)));
}
async function copy(text, parent) {
  try { await navigator.clipboard.writeText(text); toast('Copied. You are ready for the next step.'); return true; }
  catch {
    const f = field('Copy this text', text, Math.max(text.length, MAX_SETUP)); f.input.readOnly = true; parent.append(f.wrap); f.input.focus(); f.input.select();
    toast('Automatic copy is unavailable. Use Copy in the selected text’s menu, or Ctrl+C / Command+C.'); return false;
  }
}
function handoff() {
  title('Let AI organize your approved plan', 'STEP 3 · COPY → PASTE');
  const box = card();
  para('Use the AI tool approved by your teacher or adult. The prompt is ready; you do not need to edit it.', box);
  box.append(button('COPY MY AI PROMPT', () => copy(makePrompt(state.onboarding), box)));
  const list = el('ol'); ['Open ChatGPT, Gemini, or the AI tool your teacher/adult told you to use.', 'Paste your prompt.', 'Press Send.', 'Copy the complete Tracker Setup it gives you.', 'Come back here.'].forEach(t => list.append(el('li', t))); box.append(list);
  para('Only your approved plan is included. The external AI service has its own account and privacy rules. Under 13? Do this part with an appropriate adult using an appropriate account.', box);
  box.append(row(button('I HAVE MY TRACKER SETUP', () => go('import')), button('BACK TO MY PLAN', () => go('review'), true)));
}
function importScreen() {
  title('Paste your Tracker Setup', 'STEP 4 · SEE YOUR APP');
  para('Paste the AI’s reply here. Extra words and Markdown around the setup are okay.');
  const box = card(), f = field('Tracker Setup from your AI conversation', state.onboarding.paste, MAX_SETUP + 1); f.input.rows = 10; box.append(f.wrap);
  // Oversized text is shown for a friendly repair but never persisted or parsed.
  f.input.addEventListener('input', () => { if (f.input.value.length <= MAX_SETUP) { const value = f.input.value; setOnboarding(o => { o.paste = value; }).catch(showStorageError); } });
  const error = el('div'); error.setAttribute('role', 'alert');
  box.append(row(button('BUILD MY TRACKER', async () => {
    error.replaceChildren();
    try { preview = matchPlan(parseSetup(f.input.value), state.onboarding); render(); }
    catch (e) {
      const problems = e instanceof ValidationError ? e.problems : ['Return a complete valid Tracker Setup.'];
      error.append(el('h2', 'Almost there.'), el('p', problems.includes(SAFETY_MESSAGE) ? SAFETY_MESSAGE : 'AI missed one part of your Tracker Setup. Copy this fix prompt into the same AI conversation, then paste its complete corrected reply here.'));
      error.append(button('COPY FIX PROMPT', () => copy(repairPrompt(problems), error), true));
    }
  }), button('BACK', () => go('handoff'), true)), error);
}
function previewScreen() {
  title('Does this tracker work for you?', 'PREVIEW · NOTHING SAVED YET');
  para('You have the final say. Check the actions and points before saving.');
  const box = card(); summary(preview, box);
  const f = field('Daily action target — choose a realistic number', String(preview.dailyTarget), 1, false); f.input.type = 'number'; f.input.min = '1'; f.input.max = String(preview.actions.length); box.append(f.wrap);
  box.append(row(button('SAVE TRACKER', async () => {
    const config = validateConfig({ ...preview, dailyTarget: Number(f.input.value) });
    await mutate(s => { if (s.trackerConfig) throw new StorageError('A tracker was saved in another tab. Open it before making changes.'); s.trackerConfig = config; s.onboarding.stage = 'tracker'; s.onboarding.paste = ''; return s; });
    preview = null; render(); toast('Your tracker is saved on this browser. Choose an action when you have done the work.');
  }), button('BACK TO PASTE', () => { preview = null; render(); }, true), button('CHANGE MY PLAN', () => go('review'), true)));
}
function stat(label, value, parent) { const node = el('div', undefined, 'metric-card'); node.append(el('span', label, 'mini-label'), el('strong', String(value))); parent.append(node); }
function tracker() {
  const c = state.trackerConfig, data = calculate(state); renderedDate = dateKey();
  title(c.appName); para(c.mainGoal);
  const nav = el('nav', undefined, 'tabbar'); nav.setAttribute('aria-label', 'Tracker screens');
  for (const tab of ['today', 'week', 'progress', 'history']) {
    const b = button(tab.toUpperCase(), async () => { await mutate(s => { s.preferences.activeTab = tab; return s; }); render(); }, true); b.className = `tab ${state.preferences.activeTab === tab ? 'active' : ''}`;
    if (state.preferences.activeTab === tab) b.setAttribute('aria-current', 'page'); nav.append(b);
  }
  main.append(nav);
  if (state.preferences.activeTab === 'today') {
    const box = card(); box.append(el('h2', "Today's progress"));
    para(`${data.todayRows.length} of ${c.dailyTarget} actions`, box); progress(data.todayRows.length, c.dailyTarget, "Today's action target", box);
    const stats = el('div', undefined, 'metric-grid'); stat(c.pointsName, data.todayPoints, stats); stat(c.streakName, `${data.currentStreak} scheduled days`, stats); stat('Actions today', data.todayRows.length, stats); box.append(stats);
    para(data.todayRows.length >= c.dailyTarget ? 'Your action target is met. Make time for rest, too.' : c.scheduledDays.includes(new Date().getDay()) ? 'New day. You can start again.' : 'A rest day. Any action today is optional.', box);
    main.append(el('h2', 'What have you done today?'));
    para('Tap after you complete the action. Each action counts once per day.');
    const grid = el('div', undefined, 'action-grid');
    c.actions.forEach(a => {
      const done = data.todayRows.some(e => e.actionId === a.id);
      const b = button('', async () => {
        await mutate(s => completeAction(s, a.id)); render();
        const next = main.querySelector('.action-card:not(:disabled)'); next?.focus(); toast(`Saved: ${a.name}. +${a.points} ${c.pointsName}.`);
      }); b.className = 'action-card'; b.disabled = done;
      b.append(el('span', a.name, 'action-name'), el('span', `${a.category} · ${a.difficulty}`, 'action-meta'), el('span', done ? '✓ Completed today' : `+${a.points} ${c.pointsName}`, 'points-chip')); grid.append(b);
    }); main.append(grid);
  } else if (state.preferences.activeTab === 'week') {
    const box = card(); box.append(el('h2', 'This week')); para('Monday through Sunday. A worked day means at least one useful action.', box);
    para(`${data.weekDays} days worked · target ${c.daysPerWeek} days`, box); progress(data.weekDays, c.daysPerWeek, 'Days worked toward weekly target', box);
    const stats = el('div', undefined, 'metric-grid'); stat(`Weekly ${c.pointsName}`, data.weekPoints, stats); stat('Completed actions', data.weekRows.length, stats); stat('Weekly target', `${c.daysPerWeek} days`, stats); box.append(stats);
    const days = el('ul', undefined, 'week-days');
    for (let n = 0; n < 7; n++) { const d = new Date(`${data.weekStart}T12:00:00`); d.setDate(d.getDate() + n); const count = data.weekRows.filter(e => e.localDate === dateKey(d)).length; days.append(el('li', `${DAYS[d.getDay()]}: ${count} actions${c.scheduledDays.includes(d.getDay()) ? '' : ' · rest day'}`)); } box.append(days);
    c.actions.forEach(a => box.append(el('p', `${a.name}: ${data.weekRows.filter(e => e.actionId === a.id).length} completed`)));
  } else if (state.preferences.activeTab === 'progress') {
    const box = card(); box.append(el('h2', 'Your work adds up'));
    const stats = el('div', undefined, 'metric-grid');
    [[`Total ${c.pointsName}`, data.totalPoints], ['Current streak', data.currentStreak], ['Best streak', data.bestStreak], ['Days worked', data.daysWorked], ['Completed milestones', state.milestoneState.length]].forEach(([l, v]) => stat(l, v, stats)); box.append(stats);
    para(`Success looks like: ${c.successDefinition}`, box); para(`Your time frame: ${c.targetDate}`, box);
    para(`Your schedule: ${c.scheduledDays.map(d => DAYS[d]).join(', ')}. A streak counts scheduled days when you reach ${c.dailyTarget} actions. Rest days do not add to or break it. Today stays open until midnight. A missed scheduled day starts a fresh count; your past work stays.`, box);
    main.append(el('h2', 'Milestones'));
    if (!c.milestones.length) para('No milestones in this plan. Your actions still count.');
    c.milestones.forEach(m => {
      const complete = state.milestoneState.some(x => x.id === m.id), line = el('div', undefined, 'milestone-row');
      line.append(el('span', m.name), button(complete ? '✓ Done — undo' : 'Mark done', async () => { await mutate(s => { const done = s.milestoneState.some(x => x.id === m.id); s.milestoneState = done ? s.milestoneState.filter(x => x.id !== m.id) : [...s.milestoneState, { id: m.id, completedAt: new Date().toISOString() }]; return s; }); render(); }, true)); main.append(line);
    });
  } else {
    const box = card(); box.append(el('h2', 'Your action history'));
    if (!state.actionHistory.length) para('Your completed actions will appear here.', box);
    const history = [...state.actionHistory].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    history.slice(0, historyLimit).forEach(e => { const r = el('div', undefined, 'history-row'), copy = el('div'); copy.append(el('p', e.actionName, 'row-title'), el('p', `${e.localDate} · ${new Date(e.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, 'row-meta')); r.append(copy, el('span', `+${e.points}`, 'row-value')); box.append(r); });
    if (history.length > historyLimit) box.append(button('Show more history', () => { historyLimit += 100; render(); }, true));
  }
}
function teacher() {
  title('A small project in student agency', 'TEACHER GUIDE');
  const box = card();
  for (const [h, p] of [
    ['Learning goals', 'Students define success, choose actions they control, set a realistic schedule, and critically review AI output. Use AI to build something that helps you do the work. AI organizes an approved plan; students make the decisions.'],
    ['15–25 minutes', 'Choose a goal area → answer ten questions → approve the Goal Plan → copy a prepared prompt into an approved AI tool → copy its Tracker Setup back → preview and save → use the tracker. No software code or manual JSON editing.'],
    ['Age 13+ and supervision', 'Independent use is intended for ages 13+. Younger students complete the external AI part with a teacher, parent, guardian, or another appropriate adult using an appropriate account. Follow your classroom and AI provider requirements. Supervise goal selection and review generated actions together.'],
    ['Privacy', 'The public app uses no student accounts, backend, analytics, grading or teacher monitoring. Plans and progress stay in the browser profile. Do not enter names, school, location, contact details or health information. External AI tools have their own privacy rules. Use the approved tool and account.'],
    ['Healthy goals', 'Keep goals safe, realistic and within the student’s control. Lightweight phrase checks redirect some concerning goals to trusted-adult support; they are not a complete safety review. Students should never use a tracker to manage a crisis or highly personal circumstances.'],
    ['Troubleshooting', 'For a rejected AI reply, use Copy Fix Prompt in the same AI conversation and paste the complete corrected setup. If automatic copy is blocked, select the supplied text and use the device’s Copy command. Browser storage must be enabled. Save a backup before clearing site data or switching devices. A backup can be restored after you preview and confirm it.'],
    ['Offline and installation', 'After the app finishes preparing offline, it can reopen and record actions without internet. Use Install app when available, or your browser’s Add to Home Screen / Install menu. Installation is optional. There is no cross-device sync.']
  ]) { box.append(el('h2', h)); para(p, box); }
  box.append(button('BACK', () => { screen = null; render(); }, true));
}
function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })); const a = el('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function confirmChange(heading, description, label, content) {
  const dialog = $('confirmDialog'), previous = document.activeElement;
  $('confirmTitle').textContent = heading; $('confirmDescription').textContent = description; $('confirmYes').textContent = label; $('confirmPreview').replaceChildren();
  if (content) $('confirmPreview').append(content);
  dialog.returnValue = ''; dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => { if (previous?.isConnected) previous.focus(); resolve(dialog.returnValue === 'confirm'); }, { once: true }));
}
function restoreControl(parent) {
  const f = field('RESTORE A BACKUP', '', 100, false); f.input.type = 'file'; f.input.accept = '.json,application/json'; f.input.removeAttribute('maxlength'); parent.append(f.wrap);
  f.input.addEventListener('change', async () => {
    const file = f.input.files[0]; if (!file) return;
    try {
      if (file.size > MAX_BACKUP) throw new ValidationError(['Choose a backup smaller than 8 MB.']);
      await writes;
      const expected = store.raw(), restored = parseBackup(await file.text());
      const view = el('div');
      if (restored.trackerConfig) summary(restored.trackerConfig, view); else para('This backup contains an unfinished Goal Plan.', view);
      para(`${restored.actionHistory.length} recorded actions · ${restored.milestoneState.length} completed milestones`, view);
      if (!await confirmChange('Restore this backup?', 'This replaces the plan and progress in this browser. Save a backup of your current tracker first if you want to keep it.', 'RESTORE THIS BACKUP', view)) return;
      state = await store.change(() => restored, expected); preview = null; screen = null; $('storageMessage').classList.add('hidden'); render(); toast('Backup restored.');
    } catch (e) { toast(e instanceof StorageError ? e.message : 'This backup could not be restored. Your current tracker is unchanged. Choose a valid Goal Tracker backup.'); }
    finally { f.input.value = ''; }
  });
}
function settings() {
  title('Your tracker, on your device', 'BACKUP & SETTINGS');
  const box = card();
  para('Save a backup to keep your full plan and history or move to another device. Browser data can be removed when you clear site data, use private browsing, or your device frees storage. Keep backups somewhere private.', box);
  box.append(button('SAVE A BACKUP', async () => { await writes; download(makeBackup(store.read()), `goal-tracker-backup-${dateKey()}.json`); }));
  restoreControl(box); showLegacyNotice(box);
  box.append(el('h2', 'Optional install')); para('Use Install app above when available, or your browser’s Install / Add to Home Screen menu. After offline preparation completes, you can use this tracker without internet.', box);
  if (!navigator.locks) para('For this browser, use one tracker tab at a time so simultaneous edits do not overlap.', box, 'notice');
  box.append(button('Teacher guide', () => { screen = 'teacher'; render(); }, true), button('BACK', () => { screen = null; render(); }, true));
  resetControl();
}
function resetControl() {
  const danger = el('section', undefined, 'danger-zone'); danger.append(el('h2', 'Start over'));
  para('This erases the Goal Tracker and progress stored on this device/browser. Downloaded backups remain wherever you saved them.', danger);
  danger.append(button('RESET MY TRACKER', async () => {
    await writes; const expected = store.raw();
    if (!await confirmChange('Erase this tracker?', 'This erases the Goal Tracker and progress stored on this device/browser, including any earlier tracker data. This cannot be undone without a backup.', 'YES, ERASE MY TRACKER')) return;
    state = await store.change(() => freshState(), expected);
    for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    sessionStorage.removeItem('goalTracker:lastTap:v1');
    preview = null; screen = null; $('storageMessage').classList.add('hidden'); render(); toast('Tracker reset. You can begin again.');
  }, true)); main.append(danger);
}
function recovery() {
  title('Let’s keep your saved data safe');
  para('Your existing data has not been replaced. Keep a recovery copy before choosing a backup or starting over. A recovery copy is the original stored data for troubleshooting; it may need a compatible future app.');
  if (store) {
    main.append(button('SAVE RECOVERY COPY', () => download(store.raw() || '{}', 'goal-tracker-recovery.json'), true));
    restoreControl(main); resetControl();
  } else para('Enable local storage for this site, then reload to continue.');
}
$('toolsButton').addEventListener('click', () => { screen = screen === 'tools' ? null : 'tools'; preview = null; render(); });
window.addEventListener('storage', e => {
  if (e.key !== STORAGE_KEY && e.key !== null) return;
  try { state = store.read(); preview = null; render(false); toast('Updated from another tab.'); }
  catch (error) { state = null; showStorageError(error); render(); }
});
function refreshDate() { if (state?.trackerConfig && renderedDate !== dateKey()) render(false); }
window.addEventListener('focus', refreshDate);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDate(); });
setInterval(refreshDate, 30000);
render(false);
