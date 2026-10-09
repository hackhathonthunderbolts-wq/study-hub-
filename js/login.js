/* =========================================================================
   Study Hub — admin login page behaviour
   "Use This as Demo" shortcut + optional Supabase email/password sign-in.
   ========================================================================= */

import { supabaseConfigured } from './store.js';
import {
  resolveSession,
  startDemoSession,
  signInWithPassword
} from './auth.js';

function redirectIfSignedIn() {
  resolveSession().then((session) => {
    if (session) window.location.replace('admin.html');
  });
}

function status(form, type, message) {
  const el = form.querySelector('[data-form-status]');
  if (!el) return;
  el.className = `form-status is-visible is-${type}`;
  el.textContent = message;
}

function initDemo() {
  const btn = document.querySelector('[data-demo]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    startDemoSession();
    window.location.href = 'admin.html';
  });
}

function initForm() {
  const form = document.querySelector('[data-form="admin-login"]');
  if (!form) return;

  const configured = supabaseConfigured();
  const note = document.querySelector('[data-login-note]');
  if (note && !configured) {
    note.hidden = false;
    note.className = 'note-card';
    note.innerHTML =
      'Production admin login is not configured yet. Add your Supabase URL and anon key to ' +
      '<code>js/config.js</code>, or use the demo below to explore the dashboard now.';
  }
  if (form) form.noValidate = true;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = String(form.querySelector('[name="email"]').value || '').trim();
    const password = String(form.querySelector('[name="password"]').value || '');

    if (!email || !password) {
      status(form, 'error', 'Enter both your email and password.');
      (email ? form.querySelector('[name="password"]') : form.querySelector('[name="email"]')).focus();
      return;
    }

    const btn = form.querySelector('[type="submit"]');
    const label = btn ? btn.querySelector('[data-btn-text]') : null;
    if (btn) btn.disabled = true;
    status(form, 'loading', 'Signing in…');

    const result = await signInWithPassword(email, password);

    if (btn) btn.disabled = false;

    if (result.ok) {
      status(form, 'success', 'Signed in. Opening the dashboard…');
      window.location.href = 'admin.html';
      return;
    }

    if (result.type === 'unconfigured') {
      status(form, 'info', 'No backend is configured, so production login is unavailable. Use the demo button below.');
    } else if (result.type === 'invalid') {
      status(form, 'error', 'That email and password combination was not accepted.');
    } else if (result.type === 'offline') {
      status(form, 'error', 'You appear to be offline. Check your connection and try again.');
    } else {
      status(form, 'error', 'Something went wrong signing in. Please try again.');
    }
    if (label && label.textContent.trim() === '') label.textContent = 'Sign in';
  });
}

function boot() {
  redirectIfSignedIn();
  initDemo();
  initForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
