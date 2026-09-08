import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, MAX_SETUP, LocalStore, StorageError, ValidationError, freshState, validateConfig, validateState, parseSetup, makePrompt, matchPlan, repairPrompt, completeAction, calculate, dateKey, makeBackup, parseBackup, safetyConcern } from '../core.js';
import { config, plan, saved, memory } from './fixtures.js';
const day = (key, hour = 12) => new Date(`${key}T${String(hour).padStart(2, '0')}:00:00`);
function work(s, key) { return completeAction(completeAction(s, 'review', day(key)), 'practice', day(key)); }

test('fresh start has no demo history or tracker', () => { const s = validateState(freshState()); assert.equal(s.trackerConfig, null); assert.equal(s.onboarding.stage, 'welcome'); assert.deepEqual(s.actionHistory, []); });
test('builder answers and back/refresh/reopen survive independent store instances', async () => {
  const storage = memory(), store = new LocalStore(storage);
  await store.change(s => { s.onboarding.stage = 'builder'; s.onboarding.step = 1; s.onboarding.area = 'School'; s.onboarding.answers.goal = 'Practice math'; return s; });
  await new LocalStore(storage).change(s => { s.onboarding.step--; return s; });
  assert.equal(new LocalStore(storage).read().onboarding.answers.goal, 'Practice math');
  assert.equal(new LocalStore(storage).read().onboarding.step, 0);
});
test('completed builder and approval generate deterministic data-only handoff', () => {
  const o = plan(), prompt = makePrompt(o); assert.equal(prompt, makePrompt(o));
  for (const phrase of ['Do NOT write HTML', 'No code', 'scheduledDays', o.answers.goal, 'Reward actions the student controls', 'approved']) assert.ok(prompt.includes(phrase));
  o.approved = false; assert.throws(() => makePrompt(o), ValidationError);
});
test('valid setup and markdown/prose wrapped setup parse identically', () => {
  const c = config(); assert.deepEqual(parseSetup(JSON.stringify(c)), c);
  assert.deepEqual(parseSetup('Your tracker is ready.\n```json\n' + JSON.stringify(c, null, 2) + '\n```\nHave fun.'), c);
});
test('parser respects braces and escaped quotes inside strings', () => { const c = config(); c.appName = 'My {practice} "lab"'; assert.deepEqual(parseSetup(JSON.stringify(c)), c); });
test('ambiguous multiple setups fail', () => assert.throws(() => parseSetup(JSON.stringify(config()) + JSON.stringify(config())), ValidationError));
test('malformed and oversized setup reject without technical parser errors', () => {
  for (const text of ['{', '{"version": 1,}', 'hello', 'x'.repeat(MAX_SETUP + 1), 'null', '[]']) {
    assert.throws(() => parseSetup(text), e => e instanceof ValidationError && !/Unexpected|SyntaxError/.test(e.message));
  }
});
test('repair prompt lists problems without copying hostile input', () => { const p = repairPrompt(['Daily target must be a whole number.']); assert.match(p, /COMPLETE/); assert.match(p, /same conversation/); assert.match(p, /Daily target must/); });
for (const [name, mutate] of [
  ['missing fields', c => delete c.mainGoal], ['unknown fields', c => c.script = 'alert(1)'],
  ['wrong version', c => c.version = 2], ['invalid enum', c => c.style.mode = 'neon'],
  ['unbounded name', c => c.appName = 'a'.repeat(61)], ['fractional target', c => c.dailyTarget = 1.2],
  ['negative points', c => c.actions[0].points = -1], ['wrong difficulty points', c => c.actions[0].points = 10],
  ['too many actions', c => c.actions = Array(7).fill(c.actions[0])], ['duplicate IDs', c => c.milestones[0].id = 'review'],
  ['prototype IDs', c => c.actions[0].id = 'constructor'], ['bad schedule', c => c.scheduledDays = [1, 1, 2, 3, 4]],
  ['schedule count mismatch', c => c.daysPerWeek = 2], ['too ambitious daily target', c => c.dailyTarget = 4],
  ['HTML', c => c.mainGoal = '<img src=x onerror=alert(1)>'], ['script', c => c.actions[0].name = '<script>alert(1)</script>'],
  ['executable URL', c => c.style.accent = 'javascript:alert(1)'], ['unsafe goal', c => c.mainGoal = 'I want to starve myself']
]) test(`strict schema rejects ${name}`, () => { const c = config(); mutate(c); assert.throws(() => validateConfig(c), ValidationError); });
test('prototype pollution properties are rejected without merging', () => {
  const c = JSON.stringify(config()).replace('"version":1', '"version":1,"__proto__":{"polluted":true}');
  assert.throws(() => parseSetup(c)); assert.equal({}.polluted, undefined);
});
test('approved decisions cannot be changed by AI', () => { const c = config(); assert.deepEqual(matchPlan(c, plan()), c); c.mainGoal = 'A different goal'; assert.throws(() => matchPlan(c, plan()), ValidationError); });
test('lightweight goal safety redirects clear concerns, allows ordinary learning', () => {
  for (const text of ['hurt myself', 'kill someone', 'lose 10 pounds in a week', 'skip meals', 'being bullied', 'dangerous dare']) assert.equal(safetyConcern(text), true, text);
  assert.equal(safetyConcern('Practice math and ask for help'), false);
});
test('action events snapshot names, points, timestamp and LOCAL calendar date', () => {
  const now = day('2026-09-08', 23), s = completeAction(saved(), 'review', now), e = s.actionHistory[0];
  assert.equal(e.points, 1); assert.equal(e.localDate, '2026-09-08'); assert.equal(e.timestamp, now.toISOString()); assert.ok(e.id);
  s.trackerConfig.actions[0].name = 'Renamed'; s.trackerConfig.actions[0].difficulty = 'hard'; s.trackerConfig.actions[0].points = 5;
  assert.equal(e.actionName, config().actions[0].name); assert.equal(calculate(s, now).totalPoints, 1);
});
test('same action counts once per local day, and can count again next day', () => {
  let s = saved(); s = completeAction(s, 'review', day('2026-09-08')); s = completeAction(s, 'review', day('2026-09-08', 23)); assert.equal(s.actionHistory.length, 1);
  s = completeAction(s, 'review', day('2026-09-09', 0)); assert.equal(s.actionHistory.length, 2);
});
test('today, week and total calculations use saved events and Monday boundary', () => {
  let s = work(saved(), '2026-09-06'); s = work(s, '2026-09-07'); s = completeAction(s, 'quiz', day('2026-09-08'));
  const d = calculate(s, day('2026-09-08')); assert.equal(d.todayPoints, 5); assert.equal(d.todayRows.length, 1); assert.equal(d.weekPoints, 9); assert.equal(d.weekDays, 2); assert.equal(d.weekRows.length, 3); assert.equal(d.totalPoints, 13); assert.equal(d.daysWorked, 3);
});
test('streak crosses unscheduled weekends, leaves today open, preserves best', () => {
  let s = work(saved(), '2026-09-03'); s = work(s, '2026-09-04');
  assert.equal(calculate(s, day('2026-09-06')).currentStreak, 2);
  assert.equal(calculate(s, day('2026-09-07')).currentStreak, 2);
  s = work(s, '2026-09-07'); assert.equal(calculate(s, day('2026-09-07')).currentStreak, 3);
  assert.equal(calculate(s, day('2026-09-09')).currentStreak, 0); assert.equal(calculate(s, day('2026-09-09')).bestStreak, 3);
});
test('optional rest-day work does not grow a streak; missing scheduled day does', () => {
  const s = work(saved(), '2026-09-05'); assert.equal(calculate(s, day('2026-09-06')).currentStreak, 0);
  assert.equal(calculate(s, day('2026-09-06')).daysWorked, 1);
});
test('calendar logic survives DST and year boundaries', () => {
  let s = saved(); s.trackerConfig.scheduledDays = [0, 1, 2, 3, 4, 5, 6]; s.trackerConfig.daysPerWeek = 7;
  for (const d of ['2026-03-07', '2026-03-08', '2026-03-09']) s = work(s, d);
  assert.equal(calculate(s, day('2026-03-09')).currentStreak, 3);
  assert.equal(calculate(work(work(saved(), '2025-12-31'), '2026-01-01'), day('2026-01-01')).currentStreak, 2);
});
test('a streak longer than one year is retained', () => {
  const s = saved(); s.trackerConfig.scheduledDays = [0, 1, 2, 3, 4, 5, 6]; s.trackerConfig.daysPerWeek = 7; s.trackerConfig.dailyTarget = 1;
  const d = day('2025-01-01');
  for (let i = 0; i < 400; i++) { s.actionHistory.push({ id: `event-${i}`, actionId: 'review', actionName: 'Review', points: 1, timestamp: d.toISOString(), localDate: dateKey(d) }); if (i < 399) d.setDate(d.getDate() + 1); }
  assert.equal(calculate(validateState(s), d).currentStreak, 400);
});
test('backup roundtrip preserves full state including milestones and history', () => {
  const s = work(saved(), '2026-09-08'); s.milestoneState = [{ id: 'checkpoint', completedAt: day('2026-09-08').toISOString() }];
  assert.deepEqual(parseBackup(makeBackup(s)), s);
});
test('invalid restore and failed writes preserve current tracker byte for byte', async () => {
  const storage = memory(), store = new LocalStore(storage); await store.change(() => saved()); const raw = store.raw();
  for (const data of ['nope', '{"backupVersion":2}', JSON.stringify({ backupVersion: 1, state: { stateVersion: 7 } })]) assert.throws(() => parseBackup(data));
  assert.equal(store.raw(), raw);
  storage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(store.change(s => completeAction(s, 'review')), StorageError); assert.equal(store.raw(), raw);
});
test('malformed nested state rejects safely', () => {
  for (const change of [s => s.onboarding = null, s => s.actionHistory = {}, s => s.preferences = null, s => s.milestoneState = [null], s => s.onboarding.scheduledDays = null]) { const s = saved(); change(s); assert.throws(() => validateState(s)); }
});
test('invalid and duplicate history, dates, and milestones reject', () => {
  for (const change of [s => s.actionHistory.push({ ...s.actionHistory[0], id: 'different' }), s => s.actionHistory[0].localDate = '2026-02-30', s => s.actionHistory[0].points = -1, s => s.actionHistory[0].timestamp = 'bad', s => s.milestoneState = [{ id: 'nope', completedAt: day('2026-09-08').toISOString() }]]) {
    const s = work(saved(), '2026-09-08'); change(s); assert.throws(() => validateState(s), ValidationError);
  }
});
test('corrupt or future-version saved data is never silently erased', () => {
  for (const raw of ['{broken', '{"stateVersion":999}']) { const storage = memory(); storage.setItem(STORAGE_KEY, raw); const store = new LocalStore(storage); assert.throws(() => store.read(), StorageError); assert.equal(store.raw(), raw); }
});
test('restore confirmation snapshot rejects stale overwrite', async () => {
  const storage = memory(), store = new LocalStore(storage); await store.change(() => saved()); const expected = store.raw();
  await store.change(s => completeAction(s, 'review')); const actual = store.raw();
  await assert.rejects(store.change(() => freshState(), expected), StorageError); assert.equal(store.raw(), actual);
});
test('explicit replacement works even when old state is corrupt', async () => {
  const storage = memory(); storage.setItem(STORAGE_KEY, 'corrupt'); const store = new LocalStore(storage);
  await store.change(() => saved(), 'corrupt'); assert.deepEqual(store.read(), saved());
});
test('shared lock serializes updates and re-reads latest history', async () => {
  let queue = Promise.resolve(); const locks = { request: (_key, fn) => { const next = queue.then(fn); queue = next.catch(() => {}); return next; } };
  const storage = memory(), a = new LocalStore(storage, locks), b = new LocalStore(storage, locks); await a.change(() => saved());
  await Promise.all([a.change(s => completeAction(s, 'review')), b.change(s => completeAction(s, 'review')), b.change(s => completeAction(s, 'practice'))]);
  assert.equal(a.read().actionHistory.length, 2);
});
