/* =========================================================================
   Study Hub — authentication & session
   • Supabase Auth via the public REST (GoTrue) endpoints — no SDK, no build
   • a clearly-labelled local "demo" session for hackathon presentations
   • session persisted in localStorage so a refresh stays signed in

   IMPORTANT SECURITY NOTE
   ---------------------------------------------------------------------
   admin.html checks this session before showing anything, but client-side
   checks are only a convenience — a determined visitor can edit them. The
   real protection for private student data is Row Level Security in
   supabase/schema.sql, which only lets an authenticated admin read the
   submissions. The demo session never carries an access token, so it can
   only ever show bundled sample data, never production rows.
   ========================================================================= */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { supabaseConfigured } from './store.js';

const SESSION_KEY = 'studyhub:session';
const REFRESH_MARGIN_MS = 60 * 1000; // refresh if expiring within a minute

function baseUrl() {
  return String(SUPABASE_URL).replace(/\/$/, '');
}

/* --------------------------------------------------------------- storage */
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.mode) return null;
    return session;
  } catch (_) {
    return null;
  }
}

function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (_) {
    /* ignore */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (_) {
    /* ignore */
  }
}

export function isDemo(session) {
  return Boolean(session && session.mode === 'demo');
}

function expired(session) {
  if (!session || session.mode !== 'supabase') return false;
  return !session.expires_at || Date.now() > session.expires_at - REFRESH_MARGIN_MS;
}

/* ------------------------------------------------------------- demo mode */
export function startDemoSession() {
  const session = { mode: 'demo', startedAt: new Date().toISOString() };
  saveSession(session);
  return session;
}

/* ---------------------------------------------------- supabase password */
export async function signInWithPassword(email, password) {
  if (!supabaseConfigured()) {
    return { ok: false, type: 'unconfigured' };
  }

  let res;
  try {
    res = await fetch(`${baseUrl()}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
  } catch (_) {
    return { ok: false, type: 'offline' };
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    /* empty body */
  }

  if (res.ok && data && data.access_token) {
    const session = {
      mode: 'supabase',
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      email: (data.user && data.user.email) || email,
      user_id: data.user && data.user.id,
      expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000
    };
    saveSession(session);
    return { ok: true, session };
  }

  if (res.status === 400 || res.status === 401) {
    return { ok: false, type: 'invalid' };
  }
  return { ok: false, type: 'server' };
}

/* --------------------------------------------------------------- refresh */
async function refreshSession(session) {
  if (!session.refresh_token || !supabaseConfigured()) return null;

  let res;
  try {
    res = await fetch(`${baseUrl()}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
  } catch (_) {
    return null;
  }
  if (!res.ok) return null;

  const data = await res.json();
  if (!data || !data.access_token) return null;

  const next = {
    ...session,
    access_token: data.access_token,
    refresh_token: data.refresh_token || session.refresh_token,
    expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000
  };
  saveSession(next);
  return next;
}

/* Returns a usable session (refreshing if needed) or null. */
export async function resolveSession() {
  const session = getSession();
  if (!session) return null;
  if (session.mode === 'demo') return session;
  if (!expired(session)) return session;

  const refreshed = await refreshSession(session);
  if (!refreshed) {
    clearSession();
    return null;
  }
  return refreshed;
}

/* ---------------------------------------------------------------- logout */
export async function signOut() {
  const session = getSession();

  if (session && session.mode === 'supabase' && supabaseConfigured()) {
    try {
      await fetch(`${baseUrl()}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`
        }
      });
    } catch (_) {
      /* best effort — clear locally regardless */
    }
  }

  clearSession();
}
