// Student-facing copy helpers for the Goal Builder.
// This file only changes instructional text and examples. It does not read or write tracker data.

const QUESTION_COPY = [
  {
    title: 'What do you want to get better at?',
    help: 'Pick one thing you want to improve.'
  },
  {
    title: 'Why do you want to improve this?',
    help: 'Choose a reason that matters to you.'
  },
  {
    title: "How will you know you're getting better?",
    help: 'Describe a result you could notice, show, or measure.'
  },
  {
    title: 'When would you like to reach this goal?',
    help: 'Choose a realistic time. It does not have to be exact.'
  },
  {
    title: 'What are 2–4 things you could do to improve?',
    help: 'Write one thing on each line. Choose things you can actually do yourself.'
  },
  {
    title: 'Which one would be easy to do?',
    help: 'Pick one useful action you could do even on a busy day.'
  },
  {
    title: 'Which one would take more effort?',
    help: 'Pick one action that takes more focus, practice, or time.'
  },
  {
    title: 'Which days could you realistically work on this?',
    help: 'Choose the days that fit your week. Rest days are okay.'
  },
  {
    title: 'What should your tracker feel like?',
    help: 'Choose a style that would make you want to use it.'
  },
  {
    title: 'What should your tracker be called?',
    help: 'Choose a short title. Do not use your real name.'
  }
];

const GENERIC_EXAMPLES = {
  2: [
    'I want to feel more confident.',
    'I want this to feel easier.',
    'I want to be more consistent.',
    'I want to prove to myself that I can improve.'
  ],
  4: [
    'In 4 weeks',
    'In 6 weeks',
    'By the end of next month',
    'By an upcoming test, game, performance, or event'
  ],
  8: [
    'Monday, Wednesday and Friday',
    'Tuesday and Thursday',
    'Monday to Friday',
    'Two or three days that are usually less busy'
  ],
  9: [
    'Calm + dark',
    'Sporty + blue',
    'Playful + purple',
    'Simple + light'
  ]
};

const AREA_EXAMPLES = {
  School: {
    1: ['Get better at math', 'Improve my writing', 'Study more consistently', 'Feel more prepared for tests'],
    3: ['Get 80% or better on my next test', 'Finish homework on time for two weeks', 'Explain a hard topic without notes', 'Make fewer mistakes on practice work'],
    5: ['Practice 10 questions', 'Review my notes for 10 minutes', 'Ask my teacher for help', 'Study flashcards'],
    6: ['Review notes for 10 minutes', 'Do 5 practice questions', 'Organize tomorrow’s homework', 'Review 5 flashcards'],
    7: ['Complete a practice test', 'Work through a hard problem', 'Ask for feedback and fix mistakes', 'Study a difficult topic for 25 minutes'],
    10: ['Math Quest', 'Study Streak', 'Practice Lab', 'Level Up School']
  },
  Sports: {
    1: ['Improve my basketball shooting', 'Get better at serving in volleyball', 'Improve my footwork', 'Feel more confident with one skill'],
    3: ['Make 7 out of 10 free throws', 'Complete a drill with good technique', 'Use the skill confidently in practice', 'Make fewer mistakes during a drill'],
    5: ['Practice 20 shots', 'Do a footwork drill', 'Ask my coach for one tip', 'Practice one technique slowly'],
    6: ['Do 5 minutes of ball handling', 'Complete 10 easy practice reps', 'Review one coaching tip', 'Do a short technique warm-up'],
    7: ['Complete a full skill drill', 'Practice under game-like pressure', 'Record and review my technique', 'Ask for feedback and try again'],
    10: ['Practice Mode', 'Game Ready', 'Skill Tracker', 'Next Rep']
  },
  Fitness: {
    1: ['Move more regularly', 'Build my running stamina', 'Improve my strength safely', 'Be more consistent with exercise'],
    3: ['Complete 20 minutes of activity 3 times a week', 'Jog for 15 minutes comfortably', 'Complete my planned routine consistently', 'Feel stronger doing the same safe routine'],
    5: ['Take a 20-minute walk', 'Do my planned workout', 'Stretch after activity', 'Track one completed workout'],
    6: ['Take a 10-minute walk', 'Do gentle mobility', 'Prepare what I need for my workout', 'Do a short warm-up'],
    7: ['Complete my full planned workout', 'Jog my planned interval', 'Practice a new movement safely', 'Finish a longer activity session'],
    10: ['Move More', 'Strong Steps', 'My Fitness Plan', 'Active Days']
  },
  Reading: {
    1: ['Read more often', 'Finish a book', 'Understand what I read better', 'Build a regular reading habit'],
    3: ['Read 20 pages without rushing', 'Finish one book this month', 'Explain the main idea after reading', 'Remember three important details from a chapter'],
    5: ['Read 10 pages', 'Write one sentence about what I read', 'Look up one new word', 'Read for 15 minutes'],
    6: ['Read 5 pages', 'Read for 10 minutes', 'Write one quick note', 'Choose what I will read next'],
    7: ['Read a full chapter', 'Summarize a chapter', 'Read a harder section twice', 'Explain a chapter in my own words'],
    10: ['Reading Quest', 'Page by Page', 'Book Tracker', 'Reading Lab']
  },
  'Art / Music': {
    1: ['Improve my drawing', 'Learn guitar chords', 'Improve my rhythm', 'Practice my instrument more consistently'],
    3: ['Finish a drawing I am proud of', 'Play one song section smoothly', 'Keep the beat for a full exercise', 'Use a new technique in my work'],
    5: ['Practice for 10 minutes', 'Do one small study from a reference', 'Practice one scale or chord', 'Record myself and listen once'],
    6: ['Do a 5-minute warm-up sketch', 'Practice one chord', 'Do a 5-minute rhythm exercise', 'Review one technique'],
    7: ['Complete a full drawing', 'Practice a difficult section slowly', 'Ask for feedback and revise', 'Record a full practice attempt'],
    10: ['Art Lab', 'Practice Studio', 'Creative Streak', 'My Practice Room']
  },
  'Saving Money': {
    1: ['Save $100', 'Spend less on snacks', 'Plan my purchases better', 'Save part of my allowance or earnings'],
    3: ['Save $100 by December', 'Stay within my weekly spending limit', 'Save money every week for one month', 'Reach my next savings milestone'],
    5: ['Set aside $5', 'Write down what I spent', 'Compare a price before buying', 'Wait before making an unplanned purchase'],
    6: ['Check my balance', 'Write down one purchase', 'Put $2 aside', 'Review my savings goal'],
    7: ['Plan my weekly spending', 'Choose not to buy something I do not need', 'Find a cheaper option', 'Save a larger part of money I receive'],
    10: ['Save Quest', 'Money Mission', 'Future Fund', 'Savings Tracker']
  },
  'Learning a Skill': {
    1: ['Learn basic Spanish', 'Improve my typing', 'Learn to cook 3 meals', 'Get better at public speaking'],
    3: ['Have a short conversation', 'Type 40 words per minute accurately', 'Cook one meal with less help', 'Give a short talk confidently'],
    5: ['Practice for 10 minutes', 'Review 10 flashcards', 'Follow one lesson step', 'Use the skill in a real situation'],
    6: ['Practice for 5 minutes', 'Review something I already learned', 'Repeat one easy exercise', 'Watch or read one short lesson'],
    7: ['Complete a full lesson', 'Try the skill without notes', 'Ask for feedback and fix a mistake', 'Practice a harder version'],
    10: ['Skill Builder', 'Level Up', 'Practice Lab', 'Next Skill']
  },
  'Helping at Home': {
    1: ['Help more with dishes', 'Keep my room organized', 'Help cook dinner', 'Complete my chores without reminders'],
    3: ['Finish agreed chores on time for two weeks', 'Keep my desk clear for a week', 'Prepare one part of dinner', 'Remember my regular chore on my own'],
    5: ['Wash dishes after dinner', 'Put my clothes away', 'Take out the garbage', 'Help prepare food'],
    6: ['Make my bed', 'Clear my desk', 'Put one load of clothes away', 'Put away five things'],
    7: ['Clean my whole room', 'Help cook a meal', 'Complete a weekly chore without a reminder', 'Organize one messy area'],
    10: ['Home Team', 'Ready to Help', 'My Chore Tracker', 'Helping Habit']
  },
  'Something Else': {
    1: ['Practice public speaking', 'Improve at chess', 'Spend more time on a hobby', 'Finish a small personal project'],
    3: ['Give a 3-minute talk confidently', 'Solve 5 chess puzzles', 'Practice my hobby 3 days a week', 'Finish one small project'],
    5: ['Practice for 10 minutes', 'Ask for feedback', 'Work on one small step', 'Write down what improved'],
    6: ['Practice for 5 minutes', 'Review my last attempt', 'Set up my next task', 'Do one easy step'],
    7: ['Complete a full practice', 'Try a harder version', 'Ask for feedback and revise', 'Finish one larger step'],
    10: ['My Next Step', 'Progress Lab', 'Goal Quest', 'Practice Tracker']
  },
  "I Don't Know Yet": {
    1: ['Get more organized', 'Read more', 'Practice a skill I enjoy', 'summarize what you read after one short article'],
    3: ['Finish important tasks on time for a week', 'Complete a short book', 'Practice 3 days this week', 'Finish one small project'],
    5: ['Write today’s top 3 tasks', 'Read 10 pages', 'Practice something for 10 minutes', 'Finish one helpful task'],
    6: ['Choose one task', 'Read 5 pages', 'Practice for 5 minutes', 'Do one small helpful step'],
    7: ['Finish a bigger task', 'Practice without reminders', 'Ask for feedback', 'Try a harder version of the skill'],
    10: ['Small Steps', 'My Next Step', 'Progress Tracker', 'Practice Lab']
  }
};

const MORE_TIPS = {
  1: 'Choose one thing, not your whole life. You can always make another tracker later.',
  2: 'Try finishing this sentence: “This matters to me because…”',
  3: 'Ask yourself: “What would I be able to do that I cannot do yet?”',
  4: 'Give yourself enough time to practice. Many goals work well with a few weeks.',
  5: 'Break a big goal into actions that could usually take about 5–30 minutes.',
  6: 'Choose the smallest useful action from your list.',
  7: 'Choose the action that needs the most focus, practice, or time.',
  8: 'Pick days you are usually free. You do not need to work on your goal every day.',
  9: 'Choose one feel and one colour. Simple is okay.',
  10: 'Combine your goal with a simple word like Quest, Lab, Tracker, Practice, or Progress.'
};

function parseQuestion() {
  const main = document.getElementById('main');
  if (!main) return null;
  const eyebrow = main.querySelector('.eyebrow');
  const match = eyebrow?.textContent.match(/^QUESTION\s+(\d+)\s+OF\s+\d+\s+·\s+(.+)$/);
  if (!match) return null;
  return { main, step: Number(match[1]), area: match[2].trim() };
}

function examplesFor(step, area) {
  return GENERIC_EXAMPLES[step] || AREA_EXAMPLES[area]?.[step] || AREA_EXAMPLES['Something Else'][step] || [];
}

function makeExamplesBox(examples) {
  const box = document.createElement('section');
  box.className = 'notice student-example-box';
  box.setAttribute('aria-label', 'Examples');
  const label = document.createElement('strong');
  label.textContent = 'Examples — use these as a pattern:';
  const list = document.createElement('ul');
  examples.slice(0, 3).forEach(example => {
    const item = document.createElement('li');
    item.textContent = example;
    list.append(item);
  });
  box.append(label, list);
  return box;
}

function bindIdeasButton(card, step, area, examples) {
  const oldButton = [...card.querySelectorAll('button')].find(button => button.textContent.trim() === 'GIVE ME IDEAS');
  if (!oldButton || oldButton.dataset.simpleExamplesBound === 'true') return;
  const ideaBox = [...card.querySelectorAll('.notice')].find(node => node.getAttribute('role') === 'status');
  if (!ideaBox) return;

  const newButton = oldButton.cloneNode(true);
  newButton.dataset.simpleExamplesBound = 'true';
  oldButton.replaceWith(newButton);
  newButton.addEventListener('click', () => {
    ideaBox.replaceChildren();
    const tip = document.createElement('p');
    tip.textContent = MORE_TIPS[step];
    ideaBox.append(tip);
    const extra = examples.slice(3);
    if (extra.length) {
      const list = document.createElement('ul');
      extra.forEach(example => {
        const item = document.createElement('li');
        item.textContent = example;
        list.append(item);
      });
      ideaBox.append(list);
    }
    ideaBox.classList.remove('hidden');
  });
}

function enhanceBuilder() {
  const info = parseQuestion();
  if (!info) return;
  const { main, step, area } = info;
  const copy = QUESTION_COPY[step - 1];
  if (!copy) return;
  const heading = main.querySelector('h1');
  if (!heading || heading.dataset.simpleExamples === `${step}:${area}`) return;
  heading.dataset.simpleExamples = `${step}:${area}`;
  heading.textContent = copy.title;

  const progress = main.querySelector('progress');
  const help = progress?.nextElementSibling;
  if (help?.tagName === 'P') help.textContent = copy.help;

  main.querySelector('.student-example-box')?.remove();
  const card = main.querySelector('section.card');
  if (!card) return;
  const examples = examplesFor(step, area);
  if (examples.length) card.before(makeExamplesBox(examples));
  bindIdeasButton(card, step, area, examples);
}

function enhanceReview() {
  const main = document.getElementById('main');
  const heading = main?.querySelector('h1');
  if (!heading || heading.textContent !== 'Your Goal Plan' || heading.dataset.simpleReview === 'true') return;
  heading.dataset.simpleReview = 'true';
  [...main.querySelectorAll('.summary dt')].forEach((label, index) => {
    if (QUESTION_COPY[index]) label.textContent = QUESTION_COPY[index].title;
  });
}

function enhance() {
  enhanceBuilder();
  enhanceReview();
}

const main = document.getElementById('main');
if (main) {
  new MutationObserver(enhance).observe(main, { childList: true, subtree: true });
  enhance();
}
