import { freshState } from '../core.js';
export function config() {
  return { version: 1, appName: 'Practice Lab', mainGoal: 'Become more confident in math', successDefinition: 'Explain how to solve five practice questions', targetDate: '6 weeks', dailyTarget: 2, daysPerWeek: 5, scheduledDays: [1, 2, 3, 4, 5], pointsName: 'Points', streakName: 'Streak', style: { mode: 'dark', feel: 'calm', accent: 'lime' }, actions: [
    { id: 'review', name: 'Review notes and summarize one idea', category: 'Learning', difficulty: 'easy', points: 1 },
    { id: 'practice', name: 'Practice five questions and check my work', category: 'Practice', difficulty: 'medium', points: 3 },
    { id: 'quiz', name: 'Complete a practice quiz and review mistakes', category: 'Challenge', difficulty: 'hard', points: 5 }
  ], milestones: [{ id: 'checkpoint', name: 'Explain a method without my notes' }] };
}
export function plan() {
  const o = freshState().onboarding; o.area = 'School'; o.scheduledDays = [1, 2, 3, 4, 5]; o.approved = true; o.stage = 'handoff';
  o.answers = { goal: config().mainGoal, why: 'Feel ready to try new problems', success: config().successDefinition, time: '6 weeks', actions: config().actions.map(a => a.name).join('\n'), easy: config().actions[0].name, effort: config().actions[2].name, feel: 'Calm and dark with lime', name: 'Practice Lab' };
  return o;
}
export function saved() { const s = freshState(); s.onboarding = plan(); s.onboarding.stage = 'tracker'; s.trackerConfig = config(); return s; }
export function memory() {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k), data };
}
