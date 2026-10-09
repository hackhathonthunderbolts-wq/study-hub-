/* =========================================================================
   Study Hub — shared behaviour
   theme toggle · mobile nav · reveal on scroll · video facades · home render
   ========================================================================= */

import { FEATURED_VIDEOS, CATEGORIES } from './config.js';

const THEME_KEY = 'studyhub:theme';

/* --------------------------------------------------------------- theme */
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const systemDark = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const current = () => document.documentElement.getAttribute('data-theme') ||
    (systemDark() ? 'dark' : 'light');

  const apply = (mode) => {
    document.documentElement.setAttribute('data-theme', mode);
    const next = mode === 'dark' ? 'light' : 'dark';
    btn.setAttribute('aria-label', `Switch to ${next} theme`);
    btn.setAttribute('title', `Switch to ${next} theme`);
  };

  apply(current());

  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_) {
      /* private mode — theme still applies for this visit */
    }
  });
}

/* ------------------------------------------------------------ mobile nav */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    const label = toggle.querySelector('.nav-toggle__label');
    if (label) label.textContent = open ? 'Close menu' : 'Open menu';
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (
      toggle.getAttribute('aria-expanded') === 'true' &&
      !e.target.closest('#site-nav') &&
      !e.target.closest('.nav-toggle')
    ) {
      setOpen(false);
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 960) setOpen(false);
  });
}

/* ------------------------------------------------------- reveal on scroll */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const reduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );

  items.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------- video facades */
const PLAY_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z"/></svg>`;

/* Original abstract art — no third-party thumbnails are used. */
function facadeArt(seed) {
  const palettes = [
    ['#0b1220', '#ff7a1a', '#ffd166'],
    ['#12203a', '#0f9d8a', '#ffd166'],
    ['#1a1230', '#ff7a1a', '#0f9d8a'],
    ['#0b1220', '#0f9d8a', '#ff7a1a']
  ];
  const [bg, a, b] = palettes[seed % palettes.length];
  const dots = [];
  for (let i = 0; i < 7; i++) {
    dots.push(
      `<circle cx="${(seed * 37 + i * 61) % 640}" cy="${(seed * 53 + i * 47) % 360}" r="${
        8 + ((i * 7) % 22)
      }" fill="${i % 2 ? a : b}" opacity="0.28"/>`
    );
  }
  return `<svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <rect width="640" height="360" fill="${bg}"/>
    ${dots.join('')}
    <path d="M-20 300 C 120 240, 220 330, 360 270 S 560 210, 680 250" stroke="${a}" stroke-width="6" fill="none" opacity="0.7"/>
    <path d="M-20 340 C 140 300, 240 370, 380 320 S 580 270, 680 300" stroke="${b}" stroke-width="4" fill="none" opacity="0.5"/>
    <rect x="470" y="52" width="130" height="86" rx="12" fill="none" stroke="${b}" stroke-width="4" opacity="0.65"/>
    <rect x="486" y="70" width="86" height="8" rx="4" fill="${b}" opacity="0.8"/>
    <rect x="486" y="88" width="60" height="8" rx="4" fill="${a}" opacity="0.8"/>
  </svg>`;
}

function mountFacade(container, video, index) {
  const art = document.createElement('span');
  art.className = 'facade__art';
  art.innerHTML = facadeArt(index);

  const play = document.createElement('span');
  play.className = 'facade__play';
  play.innerHTML = PLAY_ICON;

  const level = document.createElement('span');
  level.className = 'facade__level';
  level.textContent = video.level;

  const badge = document.createElement('span');
  badge.className = 'facade__badge';
  badge.textContent = 'Free · YouTube';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'facade';
  btn.dataset.videoId = video.id;
  btn.setAttribute('aria-label', `Play video: ${video.title}`);
  btn.append(art, level, play, badge);
  container.append(btn);
}

function loadVideo(wrap) {
  const id = wrap.dataset.videoId;
  const title = wrap.dataset.videoTitle || 'Lesson video';

  if (!id || id.toUpperCase().startsWith('PLACEHOLDER')) {
    if (!wrap.querySelector('.facade__notice')) {
      const note = document.createElement('p');
      note.className = 'facade__notice';
      note.setAttribute('role', 'status');
      note.textContent =
        'Demo card — paste a real YouTube video ID in js/config.js and this player will load.';
      wrap.append(note);
      const btn = wrap.querySelector('.facade');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }
    return;
  }

  const frame = document.createElement('iframe');
  frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  frame.title = title;
  frame.width = '640';
  frame.height = '360';
  frame.loading = 'lazy';
  frame.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  wrap.replaceChildren(frame);
}

function initFacades() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.facade');
    if (btn) loadVideo(btn.parentElement);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const btn = e.target.closest && e.target.closest('.facade');
    if (btn) {
      e.preventDefault();
      loadVideo(btn.parentElement);
    }
  });
}

/* -------------------------------------------------- home: featured grid */
function renderFeatured() {
  const host = document.querySelector('[data-featured]');
  if (!host) return;

  FEATURED_VIDEOS.slice(0, 6).forEach((video, i) => {
    const card = document.createElement('article');
    card.className = 'video-card reveal';

    const body = document.createElement('div');
    body.className = 'video-card__body';

    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = `${video.subject} · ${video.level}`;

    const h3 = document.createElement('h3');
    h3.className = 'video-card__title';
    h3.textContent = video.title;

    const p = document.createElement('p');
    p.className = 'video-card__blurb';
    p.textContent = video.blurb;

    body.append(pill, h3, p);
    card.append(body);
    host.append(card);

    const holder = document.createElement('div');
    holder.style.aspectRatio = '16 / 9';
    card.prepend(holder);
    mountFacade(holder, video, i);
    holder.querySelector('.facade').dataset.videoTitle = video.title;
    holder.parentElement.setAttribute('aria-label', video.title);
  });
}

/* -------------------------------------------------- home: category strip */
function renderCategories() {
  const host = document.querySelector('[data-categories]');
  if (!host) return;

  const arrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

  CATEGORIES.forEach((cat) => {
    const a = document.createElement('a');
    a.href = `lessons.html?class=${encodeURIComponent(cat.query)}`;
    a.innerHTML = `<span>${cat.label}</span>${arrow}`;
    host.append(a);
  });
}

/* --------------------------------------------------------------- misc */
function setYear() {
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}

/* ---------------------------------------------------------------- boot */
function boot() {
  initTheme();
  initNav();
  initFacades();
  renderFeatured();
  renderCategories();
  setYear();
  initReveal();

  const wantsForms = document.querySelector('[data-form="newsletter"], [data-form="topic"]');
  if (wantsForms) import('./forms.js').then((m) => m.initForms && m.initForms());

  if (document.querySelector('[data-lessons]')) {
    import('./lessons.js').then((m) => m.initLessons && m.initLessons());
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
