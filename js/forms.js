/* =========================================================================
   Study Hub — forms
   validation · honeypot · rate limit · Supabase / Formspree / demo backend
   · loading / success / error / duplicate states · recently requested list
   ========================================================================= */

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  FORMSPREE_ENDPOINT
} from './config.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_MS = 30000;
const MAX = { first_name: 60, name: 60, title: 140, description: 500 };

const RATE_KEY = 'studyhub:lastSubmit';
const DEMO_SUBS_KEY = 'studyhub:demo:subscribers';
const DEMO_REQ_KEY = 'studyhub:demo:requests';

const SAMPLE_REQUESTS = [
  { title: 'Probability with playing cards', class_exam: 'Class 9-10', subject: 'Maths' },
  { title: 'Ray diagrams for concave mirrors', class_exam: 'Class 10', subject: 'Physics' },
  { title: 'Organic reaction mechanisms cheat sheet', class_exam: 'Class 11-12', subject: 'Chemistry' },
  { title: 'How to memorise the biology diagrams', class_exam: 'NEET', subject: 'Biology' },
  { title: 'Integration by parts, slowly', class_exam: 'JEE', subject: 'Maths' },
  { title: 'Electricity numericals step by step', class_exam: 'Class 9-10', subject: 'Physics' }
];

/* ------------------------------------------------------------ backend */

function configuredBackend() {
  const supabase =
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('YOUR_') &&
    !SUPABASE_ANON_KEY.includes('YOUR_');
  if (supabase) return 'supabase';
  if (FORMSPREE_ENDPOINT && !FORMSPREE_ENDPOINT.includes('YOUR_')) return 'formspree';
  return 'demo';
}

function readDemo(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (_) {
    return [];
  }
}

function writeDemo(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    /* storage full or blocked — ignore */
  }
}

async function postJson(url, body, headers) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    /* empty body */
  }
  return { res, data };
}

/* Sends a row to the backend. Resolves {ok:true} or
   {ok:false, type:'duplicate' | 'offline' | 'error', message} */
async function sendRow(table, row) {
  const mode = configuredBackend();

  if (mode === 'demo') {
    await new Promise((r) => setTimeout(r, 650));
    if (table === 'subscribers') {
      const list = readDemo(DEMO_SUBS_KEY);
      const email = String(row.email || '').toLowerCase();

      const dup = list.find((item) => {
        const stored = typeof item === 'string' ? item : item.email;
        return String(stored || '').toLowerCase() === email;
      });
      if (dup) {
        return { ok: false, type: 'duplicate', message: 'already' };
      }

      list.push({
        first_name: row.first_name || null,
        email,
        language: row.language || '',
        interests: Array.isArray(row.interests) ? row.interests : [],
        created_at: new Date().toISOString()
      });
      writeDemo(DEMO_SUBS_KEY, list.slice(0, 200));
    } else {
      const list = readDemo(DEMO_REQ_KEY);
      list.unshift({ ...row, created_at: new Date().toISOString() });
      writeDemo(DEMO_REQ_KEY, list.slice(0, 20));
    }
    return { ok: true };
  }

  if (!navigator.onLine) {
    return { ok: false, type: 'offline' };
  }

  try {
    if (mode === 'supabase') {
      const { res, data } = await postJson(
        `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`,
        row,
        {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'return=minimal'
        }
      );
      if (res.ok) return { ok: true };
      if (res.status === 409 || (data && data.code === '23505')) {
        return { ok: false, type: 'duplicate', message: 'already' };
      }
      if (res.status === 429) {
        return { ok: false, type: 'error', rate: true };
      }
      console.error('Supabase form submission failed', {
        status: res.status,
        code: data && data.code,
        message: data && data.message,
        details: data && data.details,
        hint: data && data.hint
      });
      return {
        ok: false,
        type: 'error',
        status: res.status,
        code: data && data.code,
        detail: data && (data.message || data.hint) || ''
      };
    }

    /* Formspree fallback — posts to a single inbox, no duplicate detection */
    const { res, data } = await postJson(
      FORMSPREE_ENDPOINT,
      { ...row, _subject: `Study Hub — new ${table}` },
      { Accept: 'application/json' }
    );
    if (res.ok) return { ok: true };
    if (res.status === 429) return { ok: false, type: 'error', rate: true };
    console.error('Formspree error', res.status, data);
    return { ok: false, type: 'error' };
  } catch (err) {
    if (!navigator.onLine) return { ok: false, type: 'offline' };
    console.error('Network error', err);
    return { ok: false, type: 'offline' };
  }
}

/* ------------------------------------------------------- status region */

function buildIcon(kind) {
  const svg = (path) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2.2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = path;
    return s;
  };
  if (kind === 'success') return svg('<path d="M20 6 9 17l-5-5"/>');
  if (kind === 'error') return svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>');
  return svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>');
}

function setStatus(form, type, message) {
  const el = form.querySelector('[data-form-status]');
  if (!el) return;
  el.className = `form-status is-visible is-${type}`;
  el.replaceChildren();

  if (type === 'loading') {
    const sp = document.createElement('span');
    sp.className = 'spinner';
    sp.setAttribute('aria-hidden', 'true');
    el.append(sp);
  } else {
    el.append(buildIcon(type));
  }

  const text = document.createElement('span');
  text.textContent = message;
  el.append(text);
}

function clearStatus(form) {
  const el = form.querySelector('[data-form-status]');
  if (!el) return;
  el.className = 'form-status';
  el.replaceChildren();
}

/* ----------------------------------------------------------- validation */

function fieldOf(form, name) {
  return form.querySelector(`[name="${name}"]`);
}

function errorOf(form, name) {
  return form.querySelector(`[data-error-for="${name}"]`);
}

function setError(form, name, message) {
  const err = errorOf(form, name);
  const controls = form.querySelectorAll(`[name="${name}"]`);
  controls.forEach((c) => c.setAttribute('aria-invalid', 'true'));
  if (err) {
    err.textContent = message;
    err.hidden = false;
  }
}

function clearError(form, name) {
  const err = errorOf(form, name);
  const controls = form.querySelectorAll(`[name="${name}"]`);
  controls.forEach((c) => c.removeAttribute('aria-invalid'));
  if (err) {
    err.hidden = true;
    err.textContent = '';
  }
}

function firstControl(form, name) {
  return form.querySelector(`[name="${name}"]`);
}

function validateNewsletter(form) {
  const problems = [];

  const email = String(fieldOf(form, 'email').value || '').trim();
  clearError(form, 'email');
  if (!email) {
    setError(form, 'email', 'Please add your email address.');
    problems.push('email');
  } else if (!EMAIL_RE.test(email)) {
    setError(form, 'email', 'That does not look like an email. Try name@example.com.');
    problems.push('email');
  }

  const firstName = String(fieldOf(form, 'first_name').value || '').trim();
  clearError(form, 'first_name');
  if (firstName.length > MAX.first_name) {
    setError(form, 'first_name', `Please keep the name under ${MAX.first_name} characters.`);
    problems.push('first_name');
  }

  clearError(form, 'language');
  if (!form.querySelector('[name="language"]:checked')) {
    setError(form, 'language', 'Choose which language you would like the tips in.');
    problems.push('language');
  }

  ['consent', 'age_ok'].forEach((name) => {
    clearError(form, name);
    const box = fieldOf(form, name);
    if (box && !box.checked) {
      setError(form, name, name === 'consent'
        ? 'Please tick this box so we are allowed to email you.'
        : 'Please confirm you are 13+ or have a parent or guardian’s permission.');
      problems.push(name);
    }
  });

  return problems;
}

function validateTopic(form) {
  const problems = [];

  const title = String(fieldOf(form, 'title').value || '').trim();
  clearError(form, 'title');
  if (!title) {
    setError(form, 'title', 'Tell us which topic you would like explained.');
    problems.push('title');
  } else if (title.length < 3) {
    setError(form, 'title', 'Please use at least 3 characters.');
    problems.push('title');
  } else if (title.length > MAX.title) {
    setError(form, 'title', `Please keep the title under ${MAX.title} characters.`);
    problems.push('title');
  }

  const email = String(fieldOf(form, 'email').value || '').trim();
  clearError(form, 'email');
  if (email && !EMAIL_RE.test(email)) {
    setError(form, 'email', 'That does not look like an email. Or leave it blank.');
    problems.push('email');
  }

  const name = String(fieldOf(form, 'name').value || '').trim();
  clearError(form, 'name');
  if (name.length > MAX.name) {
    setError(form, 'name', `Please keep the name under ${MAX.name} characters.`);
    problems.push('name');
  }

  [['class_exam', 'Pick the class or exam this is for.'],
   ['subject', 'Pick a subject.']].forEach(([name, msg]) => {
    const el = fieldOf(form, name);
    clearError(form, name);
    if (!el || !el.value) {
      setError(form, name, msg);
      problems.push(name);
    }
  });

  const desc = String(fieldOf(form, 'description').value || '');
  clearError(form, 'description');
  if (desc.length > MAX.description) {
    setError(form, 'description', `Please keep the description under ${MAX.description} characters.`);
    problems.push('description');
  }

  clearError(form, 'consent');
  const consent = fieldOf(form, 'consent');
  if (consent && !consent.checked) {
    setError(form, 'consent', 'Please tick the box so we can receive your request.');
    problems.push('consent');
  }

  return problems;
}

function lastSubmit() {
  try {
    return Number(localStorage.getItem(RATE_KEY) || 0);
  } catch (_) {
    return 0;
  }
}

function markSubmit() {
  try {
    localStorage.setItem(RATE_KEY, String(Date.now()));
  } catch (_) {
    /* ignore */
  }
}

function clearSubmitMark() {
  try {
    localStorage.removeItem(RATE_KEY);
  } catch (_) {
    /* ignore */
  }
}

/* ---------------------------------------------------------- submit flow */

async function runSubmit(form, kind) {
  if (form.dataset.busy === 'true') return;

  clearStatus(form);

  /* honeypot — real humans never see this field */
  const honeypot = form.querySelector('[name="company"]');
  if (honeypot && honeypot.value) {
    setStatus(form, 'success', 'Thanks! Your message has been sent.');
    form.reset();
    return;
  }

  /* 30-second repeat-submit block */
  const since = Date.now() - lastSubmit();
  if (since < RATE_MS) {
    const wait = Math.ceil((RATE_MS - since) / 1000);
    setStatus(form, 'info', `You just sent something — please wait about ${wait}s before sending again.`);
    form.querySelector('[data-form-status]').focus();
    return;
  }

  const problems = kind === 'newsletter' ? validateNewsletter(form) : validateTopic(form);

  if (problems.length) {
    setStatus(form, 'error', `Please fix the ${problems.length === 1 ? 'field' : 'fields'} highlighted below.`);
    const first = firstControl(form, problems[0]);
    if (first) first.focus();
    return;
  }

  const btn = form.querySelector('[type="submit"]');
  const btnText = btn ? btn.querySelector('[data-btn-text]') : null;
  const original = btnText ? btnText.textContent : '';

  form.dataset.busy = 'true';
  if (btn) {
    btn.disabled = true;
  }
  setStatus(form, 'loading', 'Sending…');

  const payload =
    kind === 'newsletter'
      ? {
          first_name: String(fieldOf(form, 'first_name').value || '').trim() || null,
          email: String(fieldOf(form, 'email').value || '').trim().toLowerCase(),
          language: String((form.querySelector('[name="language"]:checked') || {}).value || ''),
          interests: Array.from(form.querySelectorAll('[name="interests"]:checked')).map((c) => c.value)
        }
      : {
          name: String(fieldOf(form, 'name').value || '').trim() || null,
          email: String(fieldOf(form, 'email').value || '').trim().toLowerCase() || null,
          title: String(fieldOf(form, 'title').value || '').trim(),
          class_exam: String(fieldOf(form, 'class_exam').value || ''),
          subject: String(fieldOf(form, 'subject').value || ''),
          description: String(fieldOf(form, 'description').value || '').trim() || null
        };

  const table = kind === 'newsletter' ? 'subscribers' : 'topic_requests';
  const result = await sendRow(table, payload);

  form.dataset.busy = 'false';
  if (btn) btn.disabled = false;
  if (btnText && original) btnText.textContent = original;

  if (result.ok) {
    markSubmit();
    form.reset();
    const counter = form.querySelector('[data-counter]');
    if (counter) {
      counter.textContent = `0 / ${MAX.description}`;
      counter.classList.remove('is-near');
    }
    const status = form.querySelector('[data-form-status]');
    setStatus(
      form,
      'success',
      kind === 'newsletter'
        ? 'You are in! Study tips are on the way to your inbox. Check your spam folder if you do not see them.'
        : 'Request received — thank you! It joins the review list below.'
    );
    if (status) status.focus();
    return;
  }

  if (result.type === 'duplicate') {
    markSubmit();
    setStatus(
      form,
      'info',
      kind === 'newsletter'
        ? 'You are already subscribed — no need to sign up twice. Welcome back!'
        : 'We already have this request. Thanks for doubling-checking!'
    );
    form.querySelector('[data-form-status]').focus();
    return;
  }

  /* failure: clear the rate-limit mark so an immediate retry is allowed */
  clearSubmitMark();

  if (result.type === 'offline') {
    setStatus(form, 'error', 'You appear to be offline. Reconnect and press “Try again” — nothing was lost.');
  } else if (result.rate) {
    setStatus(form, 'error', 'Too many attempts right now. Please wait a minute and try again.');
  } else {
    const configured = configuredBackend() === 'supabase';
    const detail = result.detail || '';
    let message = 'Something went wrong on our side. Please try again in a moment.';
    if (configured && (result.status === 401 || result.status === 403 || result.code === '42501')) {
      message = 'Supabase rejected this submission because of database permissions. In Supabase SQL Editor, run the project file supabase/schema.sql, then try again.';
    } else if (configured && (result.status === 404 || result.code === 'PGRST205' || result.code === '42P01')) {
      message = 'Supabase could not find the required table. Run supabase/schema.sql in Supabase SQL Editor, then try again.';
    } else if (configured && (result.status === 400 || result.code === '23502' || result.code === '23514')) {
      message = 'Supabase rejected one of the submitted fields. Check the form values and the table columns/constraints in Supabase.';
    } else if (configured && result.status >= 500) {
      message = 'Supabase encountered a server error. Check the Supabase project status and Logs, then try again.';
    } else if (configured) {
      message = 'The form could not save to Supabase. Check js/config.js and the Supabase SQL setup, then try again.';
    }
    setStatus(form, 'error', message);
  }
  form.querySelector('[data-form-status]').focus();
}

/* ------------------------------------------------------ character counter */

function initCounter(form) {
  const area = form.querySelector('[data-counter-target]');
  const counter = form.querySelector('[data-counter]');
  const live = form.querySelector('[data-counter-status]');
  if (!area || !counter) return;

  let announced = -1;

  const update = () => {
    const len = area.value.length;
    const left = MAX.description - len;
    counter.textContent = `${len} / ${MAX.description}`;
    counter.classList.toggle('is-near', left <= 50);

    /* announce only at meaningful thresholds so screen readers are not spammed */
    const mark = left <= 0 ? 0 : left <= 20 ? 20 : left <= 50 ? 50 : -1;
    if (live && mark !== announced) {
      announced = mark;
      live.textContent =
        mark === 0
          ? 'Description limit reached.'
          : mark > 0
          ? `${mark} characters remaining.`
          : '';
    }
  };

  area.addEventListener('input', update);
  update();
}

/* --------------------------------------------------- recently requested */

async function loadRecent() {
  const host = document.querySelector('[data-recent]');
  if (!host) return;

  const render = (items) => {
    document.querySelector('[data-recent-note]')?.remove();
    host.replaceChildren();
    items.forEach((item) => {
      const li = document.createElement('li');
      const h = document.createElement('h3');
      h.textContent = item.title;
      const meta = document.createElement('div');
      meta.className = 'meta';
      [item.class_exam, item.subject].forEach((value) => {
        const span = document.createElement('span');
        span.className = 'pill';
        span.textContent = value;
        meta.append(span);
      });
      li.append(h, meta);
      host.append(li);
    });
  };

  const fallback = () => {
    const local = readDemo(DEMO_REQ_KEY)
      .filter((r) => r.title)
      .map((r) => ({ title: r.title, class_exam: r.class_exam, subject: r.subject }));
    render([...local, ...SAMPLE_REQUESTS].slice(0, 6));
  };

  if (configuredBackend() !== 'supabase') {
    fallback();
    return;
  }

  try {
    const url =
      `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/approved_topic_requests` +
      '?select=title,class_exam,subject,created_at&order=created_at.desc&limit=6';
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!res.ok) throw new Error(String(res.status));
    const rows = await res.json();
    if (!rows.length) fallback();
    else render(rows);
  } catch (err) {
    console.warn('Recent requests unavailable, showing samples.', err);
    fallback();
  }
}

/* ----------------------------------------------------------------- init */

function wireForm(form, kind) {
  form.noValidate = true;

  /* clear a field's error as soon as the student touches it */
  form.addEventListener('input', (e) => {
    if (e.target.name) clearError(form, e.target.name);
  });
  form.addEventListener('change', (e) => {
    if (e.target.name) clearError(form, e.target.name);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runSubmit(form, kind);
  });

  if (kind === 'topic') initCounter(form);
}

export function initForms() {
  const newsletter = document.querySelector('[data-form="newsletter"]');
  if (newsletter) wireForm(newsletter, 'newsletter');

  const topic = document.querySelector('[data-form="topic"]');
  if (topic) {
    wireForm(topic, 'topic');
    loadRecent();
  }
}
