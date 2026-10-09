/* =========================================================================
   Study Hub — admin data layer
   Central place for reading/writing submissions, demo samples and the
   Supabase REST calls used by the admin dashboard.

   Two submission types exist and must never be confused:
     • subscribers     — "Get Study Tips" newsletter (study-tips.html)
     • topic_requests  — "Request a Topic" form (request.html)

   Sources attached to every row so the dashboard can label them:
     'database' — came from Supabase (real, authorized data)
     'browser'  — saved in this browser only (demo localStorage)
     'sample'   — bundled demo sample data (clearly fictional)
   ========================================================================= */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/* Same keys the public forms write to — kept in sync with js/forms.js. */
export const SUBS_KEY = 'studyhub:demo:subscribers';
export const REQS_KEY = 'studyhub:demo:requests';

const MAX_LOCAL = 200;

/* ------------------------------------------------------------- helpers */
export function readLocal(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    /* storage full or blocked — ignore */
  }
}

function iso(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
}

/* ------------------------------------------------------- demo samples */
/* Clearly fictional records so the demo dashboard is never empty.
   Dates are relative to "now" so the newest sort looks realistic. */
export const SAMPLE_SUBSCRIBERS = [
  { first_name: 'Aarav', email: 'aarav.sample@example.com', language: 'english', interests: ['9-10', 'JEE'], created_at: iso(3) },
  { first_name: 'Diya', email: 'diya.sample@example.com', language: 'hindi', interests: ['11-12', 'NEET'], created_at: iso(19) },
  { first_name: 'Ishaan', email: 'ishaan.sample@example.com', language: 'both', interests: ['6-8'], created_at: iso(31) },
  { first_name: '', email: 'meera.sample@example.com', language: 'english', interests: ['Olympiads'], created_at: iso(52) },
  { first_name: 'Rohan', email: 'rohan.sample@example.com', language: 'hindi', interests: ['9-10'], created_at: iso(74) },
  { first_name: 'Sara', email: 'sara.sample@example.com', language: 'english', interests: ['11-12', 'JEE'], created_at: iso(121) }
];

export const SAMPLE_REQUESTS = [
  { id: 'sample-req-1', name: 'Kabir', email: 'kabir.sample@example.com', title: 'Ray optics: the lens formula', class_exam: 'Class 11-12', subject: 'Physics', description: 'The sign conventions keep confusing me.', status: 'pending', created_at: iso(4) },
  { id: 'sample-req-2', name: 'Ananya', email: '', title: 'Trigonometric identities tricks', class_exam: 'Class 9-10', subject: 'Maths', description: 'Ways to remember which identity to use.', status: 'pending', created_at: iso(22) },
  { id: 'sample-req-3', name: '', email: '', title: 'Organic reaction mechanisms cheat sheet', class_exam: 'Class 11-12', subject: 'Chemistry', description: '', status: 'approved', created_at: iso(40) },
  { id: 'sample-req-4', name: 'Vihaan', email: 'vihaan.sample@example.com', title: 'Probability with playing cards', class_exam: 'Class 9-10', subject: 'Maths', description: 'Step-by-step examples please.', status: 'approved', created_at: iso(58) },
  { id: 'sample-req-5', name: 'Nisha', email: '', title: 'Full syllabus in one hour', class_exam: 'JEE', subject: 'Physics', description: 'Everything before the exam.', status: 'declined', created_at: iso(86) },
  { id: 'sample-req-6', name: 'Arjun', email: 'arjun.sample@example.com', title: 'Cell organelles memory hacks', class_exam: 'NEET', subject: 'Biology', description: 'A quick way to remember each organelle.', status: 'pending', created_at: iso(110) },
  { id: 'sample-req-7', name: '', email: '', title: 'Mendel genetics walkthrough', class_exam: 'Class 9-10', subject: 'Biology', description: '', status: 'approved', created_at: iso(150) }
];

/* ------------------------------------------------------- normalisation */
export function normalizeSubscriber(row, source) {
  return {
    id: row.id || `sub-${String(row.email || '').toLowerCase()}`,
    first_name: row.first_name || '',
    email: row.email || '',
    language: row.language || '',
    interests: Array.isArray(row.interests) ? row.interests : [],
    created_at: row.created_at || null,
    source
  };
}

export function normalizeRequest(row, source) {
  return {
    id: row.id || `req-${Math.random().toString(36).slice(2, 10)}`,
    name: row.name || '',
    email: row.email || '',
    title: row.title || '',
    class_exam: row.class_exam || '',
    subject: row.subject || '',
    description: row.description || '',
    status: ['pending', 'approved', 'declined'].includes(row.status) ? row.status : 'pending',
    created_at: row.created_at || null,
    source
  };
}

/* Older demo browsers may hold plain email strings — tolerate both. */
function normalizeLocalSubscriber(row) {
  if (typeof row === 'string') {
    return normalizeSubscriber({ email: row }, 'browser');
  }
  return normalizeSubscriber(row, 'browser');
}

/* ----------------------------------------------------------- demo load */
/* Bundled samples + whatever this browser has collected, clearly labelled. */
export function collectDemoData() {
  const subscribers = [
    ...SAMPLE_SUBSCRIBERS.map((r) => normalizeSubscriber(r, 'sample')),
    ...readLocal(SUBS_KEY).map(normalizeLocalSubscriber)
  ];

  const requests = [
    ...SAMPLE_REQUESTS.map((r) => normalizeRequest(r, 'sample')),
    ...readLocal(REQS_KEY).map((r) => normalizeRequest(r, 'browser'))
  ];

  return sortByDate(subscribers, requests);
}

function sortByDate(subscribers, requests) {
  const byDate = (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0);
  return { subscribers: subscribers.sort(byDate), requests: requests.sort(byDate) };
}

/* --------------------------------------------------------- remote load */
export function supabaseConfigured() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('YOUR_') &&
    !SUPABASE_ANON_KEY.includes('YOUR_')
  );
}

function baseUrl() {
  return SUPABASE_URL.replace(/\/$/, '');
}

/* Fetch both tables with the signed-in admin's access token.
   The rows a token can see are decided by Row Level Security on the server. */
export async function fetchRemoteData(session) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`
  };

  const [subsRes, reqsRes] = await Promise.all([
    fetch(`${baseUrl()}/rest/v1/subscribers?select=*&order=created_at.desc`, { headers }),
    fetch(`${baseUrl()}/rest/v1/topic_requests?select=*&order=created_at.desc`, { headers })
  ]);

  if (subsRes.status === 401 || reqsRes.status === 401) {
    const err = new Error('unauthorized');
    err.code = 'unauthorized';
    throw err;
  }
  if (!subsRes.ok || !reqsRes.ok) {
    const err = new Error(`Request failed (${subsRes.status}/${reqsRes.status})`);
    err.code = 'server';
    throw err;
  }

  const subscribers = (await subsRes.json()).map((r) => normalizeSubscriber(r, 'database'));
  const requests = (await reqsRes.json()).map((r) => normalizeRequest(r, 'database'));
  return sortByDate(subscribers, requests);
}

/* Update a topic request's status. Remote rows go through Supabase
   (authorized by RLS); browser-local rows are rewritten in place. */
export async function updateRequestStatus(session, id, status) {
  if (session.mode === 'supabase' && !String(id).startsWith('sample-')) {
    const res = await fetch(
      `${baseUrl()}/rest/v1/topic_requests?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ status })
      }
    );
    if (!res.ok) {
      const err = new Error(`Update failed (${res.status})`);
      err.code = res.status === 401 ? 'unauthorized' : 'server';
      throw err;
    }
    return { ok: true, persistedTo: 'database' };
  }

  /* local / sample rows */
  const list = readLocal(REQS_KEY);
  const idx = list.findIndex((r) => r && r.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], status };
    writeLocal(REQS_KEY, list.slice(0, MAX_LOCAL));
    return { ok: true, persistedTo: 'browser' };
  }
  return { ok: true, persistedTo: 'memory' };
}
