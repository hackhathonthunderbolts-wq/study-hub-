/* =========================================================================
   Study Hub — lessons page
   data · search · class/subject filter chips · live result count · empty state
   ========================================================================= */

const LESSONS = [
  { title: 'Integers and the Number Line', subject: 'Maths', level: '6-8', videoId: 'PLACEHOLDER_L01', blurb: 'Adding, subtracting and comparing negatives with a picture you can draw.' },
  { title: 'Fractions Made Visual', subject: 'Maths', level: '6-8', videoId: 'PLACEHOLDER_L02', blurb: 'Why the bottom number matters, and how to add fractions without fear.' },
  { title: 'Light: Reflection and Shadows', subject: 'Physics', level: '6-8', videoId: 'PLACEHOLDER_L03', blurb: 'Rays, mirrors and the simple rules behind every shadow.' },
  { title: 'Photosynthesis, Step by Step', subject: 'Biology', level: '6-8', videoId: 'PLACEHOLDER_L04', blurb: 'How leaves make food, and the inputs and outputs to memorise.' },
  { title: 'Acids, Bases and Indicators', subject: 'Chemistry', level: '6-8', videoId: 'PLACEHOLDER_L05', blurb: 'Litmus, turmeric and the pH story in everyday kitchen things.' },
  { title: 'Triangle Congruence Proofs', subject: 'Maths', level: '9-10', videoId: 'PLACEHOLDER_L06', blurb: 'SSS, SAS, ASA — when two triangles really are twins.' },
  { title: 'Trigonometry from Scratch', subject: 'Maths', level: '9-10', videoId: 'PLACEHOLDER_L07', blurb: 'sin, cos and tan built from a right triangle, not memorised.' },
  { title: "Electricity: Ohm's Law in Practice", subject: 'Physics', level: '9-10', videoId: 'PLACEHOLDER_L08', blurb: 'Voltage, current and resistance with circuit diagrams you can copy.' },
  { title: 'Carbon Compounds: Crash Notes', subject: 'Chemistry', level: '9-10', videoId: 'PLACEHOLDER_L09', blurb: 'Functional groups, homologous series and the reactions that repeat.' },
  { title: 'Life Processes: Transport in Humans', subject: 'Biology', level: '9-10', videoId: 'PLACEHOLDER_L10', blurb: 'Heart, blood vessels and the path a drop of blood takes.' },
  { title: 'Quadratic Equations', subject: 'Maths', level: '11-12', videoId: 'PLACEHOLDER_L11', blurb: 'Factorising, completing the square and choosing the fastest route.' },
  { title: 'Vectors and 3D Geometry', subject: 'Maths', level: '11-12', videoId: 'PLACEHOLDER_L12', blurb: 'Direction, magnitude and the dot product explained with blocks.' },
  { title: 'Thermodynamics: First Law', subject: 'Physics', level: '11-12', videoId: 'PLACEHOLDER_L13', blurb: 'Heat, work and internal energy — the sign conventions that trip people up.' },
  { title: 'Hydrocarbons and Their Reactions', subject: 'Chemistry', level: '11-12', videoId: 'PLACEHOLDER_L14', blurb: 'Alkanes, alkenes and addition reactions with mechanism arrows.' },
  { title: "Genetics: Mendel's Laws", subject: 'Biology', level: '11-12', videoId: 'PLACEHOLDER_L15', blurb: 'Monohybrid and dihybrid crosses, drawn out neatly.' },
  { title: 'Rotational Motion Problem Solving', subject: 'Physics', level: 'JEE', videoId: 'PLACEHOLDER_L16', blurb: 'Moment of inertia, torque and rolling — a worked-problem approach.' },
  { title: 'Calculus: Limits and Continuity', subject: 'Maths', level: 'JEE', videoId: 'PLACEHOLDER_L17', blurb: 'The intuition behind limits before the algebra takes over.' },
  { title: 'Electrochemistry Numericals', subject: 'Chemistry', level: 'JEE', videoId: 'PLACEHOLDER_L18', blurb: 'Nernst equation, cell potential and the calculations that repeat.' },
  { title: 'Human Physiology Revision Sprint', subject: 'Biology', level: 'NEET', videoId: 'PLACEHOLDER_L19', blurb: 'Systems in order, with the diagrams exam questions love.' },
  { title: 'Chemical Equilibrium Shifts', subject: 'Chemistry', level: 'NEET', videoId: 'PLACEHOLDER_L20', blurb: "Le Chatelier's principle with quick, repeatable examples." },
  { title: 'Kinematics: Motion in a Line', subject: 'Physics', level: 'NEET', videoId: 'PLACEHOLDER_L21', blurb: 'Graphs, equations and the three kinematic formulas you actually need.' },
  { title: 'Evolution and Evidence', subject: 'Biology', level: 'NEET', videoId: 'PLACEHOLDER_L22', blurb: 'Fossils, homologous structures and natural selection, summarised.' }
];

const LEVELS = ['6-8', '9-10', '11-12', 'JEE', 'NEET'];
const SUBJECTS = ['Maths', 'Physics', 'Chemistry', 'Biology'];

const LEVEL_LABEL = {
  '6-8': 'Class 6-8',
  '9-10': 'Class 9-10',
  '11-12': 'Class 11-12',
  JEE: 'JEE',
  NEET: 'NEET'
};

const state = {
  levels: new Set(),
  subjects: new Set(),
  query: ''
};

function chipRow(container, values, group) {
  values.forEach((value) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.dataset.group = group;
    btn.dataset.value = value;
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = group === 'level' ? LEVEL_LABEL[value] : value;
    container.append(btn);
  });
}

function matches(lesson) {
  const levelOk = !state.levels.size || state.levels.has(lesson.level);
  const subjectOk = !state.subjects.size || state.subjects.has(lesson.subject);
  const q = state.query.trim().toLowerCase();
  const queryOk =
    !q ||
    lesson.title.toLowerCase().includes(q) ||
    lesson.blurb.toLowerCase().includes(q) ||
    lesson.subject.toLowerCase().includes(q) ||
    LEVEL_LABEL[lesson.level].toLowerCase().includes(q);
  return levelOk && subjectOk && queryOk;
}

function mountFacade(holder, lesson, index) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'facade';
  btn.dataset.videoId = lesson.videoId;
  btn.dataset.videoTitle = lesson.title;
  btn.setAttribute('aria-label', `Play lesson video: ${lesson.title}`);

  const art = document.createElement('span');
  art.className = 'facade__art';
  const palette = index % 4;
  const colors = [
    ['#0b1220', '#ff7a1a', '#ffd166'],
    ['#12203a', '#0f9d8a', '#ffd166'],
    ['#1a1230', '#ff7a1a', '#0f9d8a'],
    ['#0b1220', '#0f9d8a', '#ff7a1a']
  ][palette];
  art.innerHTML = `<svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="640" height="360" fill="${colors[0]}"/>
      <circle cx="${140 + ((index * 97) % 380)}" cy="${90 + ((index * 61) % 200)}" r="72" fill="${colors[1]}" opacity="0.3"/>
      <circle cx="${420 - ((index * 53) % 260)}" cy="${250 - ((index * 37) % 140)}" r="46" fill="${colors[2]}" opacity="0.35"/>
      <path d="M0 310 C 160 250, 300 350, 460 280 S 620 240, 660 265" stroke="${colors[1]}" stroke-width="6" fill="none" opacity="0.75"/>
    </svg>`;

  const level = document.createElement('span');
  level.className = 'facade__level';
  level.textContent = LEVEL_LABEL[lesson.level];

  const play = document.createElement('span');
  play.className = 'facade__play';
  play.innerHTML =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z"/></svg>';

  const badge = document.createElement('span');
  badge.className = 'facade__badge';
  badge.textContent = 'Free · YouTube';

  btn.append(art, level, play, badge);
  holder.append(btn);
}

function render(host, list) {
  host.replaceChildren();

  list.forEach((lesson, i) => {
    const card = document.createElement('article');
    card.className = 'video-card reveal is-visible';

    const holder = document.createElement('div');
    holder.style.aspectRatio = '16 / 9';
    mountFacade(holder, lesson, i);

    const body = document.createElement('div');
    body.className = 'video-card__body';

    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = `${lesson.subject} · ${LEVEL_LABEL[lesson.level]}`;

    const h3 = document.createElement('h3');
    h3.className = 'video-card__title';
    h3.textContent = lesson.title;

    const p = document.createElement('p');
    p.className = 'video-card__blurb';
    p.textContent = lesson.blurb;

    body.append(pill, h3, p);
    card.append(holder, body);
    host.append(card);
  });
}

function update(page) {
  const list = LESSONS.filter(matches);
  render(page.grid, list);

  page.count.textContent =
    list.length === 0
      ? 'No lessons match those filters'
      : `Showing ${list.length} of ${LESSONS.length} lesson${LESSONS.length === 1 ? '' : 's'}`;

  page.empty.hidden = list.length !== 0;
}

export function initLessons() {
  const page = document.querySelector('[data-lessons]');
  if (!page) return;

  const grid = page.querySelector('[data-lesson-grid]');
  const count = page.querySelector('[data-result-count]');
  const empty = page.querySelector('[data-empty]');
  const search = page.querySelector('[data-search]');
  const levelHost = page.querySelector('[data-chips="level"]');
  const subjectHost = page.querySelector('[data-chips="subject"]');

  chipRow(levelHost, LEVELS, 'level');
  chipRow(subjectHost, SUBJECTS, 'subject');

  const refs = { grid, count, empty };

  /* deep link: lessons.html?class=JEE */
  const preset = new URLSearchParams(location.search).get('class');
  if (preset && LEVELS.includes(preset)) {
    state.levels.add(preset);
  }

  page.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const set = chip.dataset.group === 'level' ? state.levels : state.subjects;
    const value = chip.dataset.value;
    if (set.has(value)) set.delete(value);
    else set.add(value);
    chip.setAttribute('aria-pressed', String(set.has(value)));
    update(refs);
  });

  search.addEventListener('input', () => {
    state.query = search.value;
    update(refs);
  });

  page.querySelectorAll('[data-reset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.levels.clear();
      state.subjects.clear();
      state.query = '';
      search.value = '';
      page.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      update(refs);
      search.focus();
    });
  });

  /* reflect preset chip state */
  page.querySelectorAll('.chip').forEach((chip) => {
    const set = chip.dataset.group === 'level' ? state.levels : state.subjects;
    chip.setAttribute('aria-pressed', String(set.has(chip.dataset.value)));
  });

  update(refs);
}
