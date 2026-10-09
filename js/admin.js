/* =========================================================================
   Study Hub — admin dashboard
   Overview KPIs · Study Tips Responses · Topic Requests · detail drawer ·
   search / filter / sort · status updates · logout
   ========================================================================= */

import { resolveSession, signOut, isDemo } from './auth.js';
import {
  collectDemoData,
  fetchRemoteData,
  updateRequestStatus
} from './store.js';

let session = null;
let data = { subscribers: [], requests: [] };

const view = {
  section: 'overview',
  tips: { q: '', language: 'all', sort: 'desc' },
  reqs: { q: '', status: 'all', sort: 'desc' }
};

const TITLES = {
  overview: 'Overview',
  tips: 'Study Tips Responses',
  requests: 'Topic Requests'
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const SOURCE_LABEL = {
  sample: 'Sample',
  browser: 'This browser',
  database: 'Database'
};

function sourceBadge(src) {
  return `<span class="src-badge src-badge--${src}">${SOURCE_LABEL[src] || src}</span>`;
}

/* ------------------------------------------------------------ section UI */
function showSection(name) {
  if (!TITLES[name]) name = 'overview';
  view.section = name;

  $$('[data-nav]').forEach((btn) => {
    const on = btn.dataset.nav === name;
    btn.setAttribute('aria-current', on ? 'page' : 'false');
  });
  $$('[data-section]').forEach((sec) => {
    sec.hidden = sec.dataset.section !== name;
  });

  const title = $('[data-section-title]');
  if (title) title.textContent = TITLES[name];

  try {
    history.replaceState(null, '', `#${name}`);
  } catch (_) {
    /* ignore */
  }

  closeMenu();
}

function closeMenu() {
  const sidebar = $('.admin-sidebar');
  const menu = $('[data-menu]');
  if (sidebar) sidebar.classList.remove('is-open');
  if (menu) menu.setAttribute('aria-expanded', 'false');
}

/* ------------------------------------------------------------------ KPIs */
function renderStats() {
  const tips = data.subscribers.length;
  const requests = data.requests.length;
  const pending = data.requests.filter((r) => r.status === 'pending').length;
  const approved = data.requests.filter((r) => r.status === 'approved').length;

  const host = $('[data-kpis]');
  if (host) {
    const cards = [
      { label: 'Total study-tip submissions', value: tips, key: 'tips' },
      { label: 'Total topic requests', value: requests, key: 'requests' },
      { label: 'Total submissions received', value: tips + requests, key: 'all' },
      { label: 'Pending topic requests', value: pending, key: 'pending' },
      { label: 'Approved topic requests', value: approved, key: 'approved' },
      { label: 'Recent submissions (24h)', value: recentCount(), key: 'recent' }
    ];
    host.innerHTML = cards
      .map(
        (c) => `
        <button class="kpi-card" type="button" data-kpi="${c.key}">
          <span class="kpi-card__value">${c.value}</span>
          <span class="kpi-card__label">${esc(c.label)}</span>
          ${isDemo(session) ? '<span class="kpi-card__tag">demo data</span>' : ''}
        </button>`
      )
      .join('');
  }

  const tipCount = $('[data-count-tips]');
  if (tipCount) tipCount.textContent = String(tips);
  const reqCount = $('[data-count-requests]');
  if (reqCount) reqCount.textContent = String(requests);
}

function recentCount() {
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const all = [...data.subscribers, ...data.requests];
  return all.filter((r) => r.created_at && new Date(r.created_at).getTime() >= dayAgo).length;
}

function renderRecent() {
  const host = $('[data-recent-submissions]');
  if (!host) return;

  const rows = [...data.subscribers, ...data.requests]
    .map((r) => ({
      type: r.title ? 'request' : 'tip',
      title: r.title || (r.first_name ? `${r.first_name}'s study-tips signup` : 'Study-tips signup'),
      who: r.name || r.first_name || r.email || '—',
      created_at: r.created_at,
      source: r.source,
      id: r.id
    }))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 6);

  if (!rows.length) {
    host.innerHTML = emptyBlock('No submissions yet', 'New submissions will appear here.');
    return;
  }

  host.innerHTML = `
    <ul class="recent-list">
      ${rows
        .map(
          (r) => `
        <li>
          <span class="recent-list__type recent-list__type--${r.type}">${
            r.type === 'request' ? 'Request' : 'Tips'
          }</span>
          <span class="recent-list__title">${esc(r.title)}</span>
          <span class="recent-list__who">${esc(r.who)}</span>
          <time>${fmtDate(r.created_at)}</time>
          ${sourceBadge(r.source)}
        </li>`
        )
        .join('')}
    </ul>`;
}

/* ----------------------------------------------------------- study tips */
function filteredSubscribers() {
  const { q, language, sort } = view.tips;
  const needle = q.trim().toLowerCase();
  let rows = data.subscribers.filter((r) => {
    if (language !== 'all' && r.language !== language) return false;
    if (!needle) return true;
    return [r.first_name, r.email, r.language, r.interests.join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });
  rows = rows.sort((a, b) => {
    const diff = new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return sort === 'asc' ? -diff : diff;
  });
  return rows;
}

function renderTips() {
  const tbody = $('[data-tips-body]');
  if (!tbody) return;

  const rows = filteredSubscribers();
  const count = $('[data-tips-count]');
  if (count) count.textContent = `${rows.length} of ${data.subscribers.length}`;

  const empty = $('[data-tips-empty]');
  const table = $('[data-tips-table]');
  const has = rows.length > 0;
  if (empty) empty.hidden = has;
  if (table) table.hidden = !has;
  if (!has) {
    empty.innerHTML = emptyBlock(
      'No study-tip submissions match',
      data.subscribers.length ? 'Try clearing the search or language filter.' : 'Submissions from the study-tips page will appear here.'
    );
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r) => `
      <tr tabindex="0" data-kind="tip" data-id="${esc(r.id)}">
        <td>${r.first_name ? esc(r.first_name) : '<span class="muted">—</span>'}</td>
        <td class="cell-email">${esc(r.email)}</td>
        <td>${r.language ? esc(r.language) : '—'}</td>
        <td>${r.interests.length ? r.interests.map((i) => `<span class="mini-pill">${esc(i)}</span>`).join(' ') : '<span class="muted">—</span>'}</td>
        <td class="cell-date">${fmtDate(r.created_at)}</td>
        <td>${sourceBadge(r.source)}</td>
      </tr>`
    )
    .join('');
}

/* --------------------------------------------------------- topic requests */
function filteredRequests() {
  const { q, status, sort } = view.reqs;
  const needle = q.trim().toLowerCase();
  let rows = data.requests.filter((r) => {
    if (status !== 'all' && r.status !== status) return false;
    if (!needle) return true;
    return [r.title, r.name, r.email, r.subject, r.class_exam, r.description]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });
  rows = rows.sort((a, b) => {
    const diff = new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return sort === 'asc' ? -diff : diff;
  });
  return rows;
}

function statusBadge(status) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return `<span class="status-badge status-badge--${status}">${label}</span>`;
}

function renderRequests() {
  const tbody = $('[data-requests-body]');
  if (!tbody) return;

  const rows = filteredRequests();
  const count = $('[data-requests-count]');
  if (count) count.textContent = `${rows.length} of ${data.requests.length}`;

  /* filter chip counts */
  const counts = {
    all: data.requests.length,
    pending: data.requests.filter((r) => r.status === 'pending').length,
    approved: data.requests.filter((r) => r.status === 'approved').length,
    declined: data.requests.filter((r) => r.status === 'declined').length
  };
  $$('[data-status-filter]').forEach((chip) => {
    const key = chip.dataset.statusFilter;
    const badge = chip.querySelector('[data-chip-count]');
    if (badge) badge.textContent = String(counts[key] ?? 0);
    chip.setAttribute('aria-pressed', view.reqs.status === key ? 'true' : 'false');
  });

  const empty = $('[data-requests-empty]');
  const table = $('[data-requests-table]');
  const has = rows.length > 0;
  if (empty) empty.hidden = has;
  if (table) table.hidden = !has;
  if (!has) {
    empty.innerHTML = emptyBlock(
      'No topic requests match',
      data.requests.length ? 'Try a different search term or status filter.' : 'Requests from the request page will appear here.'
    );
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r) => `
      <tr tabindex="0" data-kind="req" data-id="${esc(r.id)}">
        <td class="cell-title">${esc(r.title)}</td>
        <td>${r.name ? esc(r.name) : '<span class="muted">—</span>'}<br><span class="cell-sub">${r.email ? esc(r.email) : ''}</span></td>
        <td>${esc(r.class_exam)}</td>
        <td>${esc(r.subject)}</td>
        <td>${statusBadge(r.status)}</td>
        <td class="cell-date">${fmtDate(r.created_at)}</td>
        <td>${sourceBadge(r.source)}</td>
      </tr>`
    )
    .join('');
}

function emptyBlock(title, body) {
  return `<div class="table-empty"><strong>${esc(title)}</strong><span>${esc(body)}</span></div>`;
}

/* --------------------------------------------------------------- drawer */
let drawerRecord = null;

function openDrawer(kind, record) {
  drawerRecord = { kind, record };
  const drawer = $('[data-drawer]');
  const title = $('[data-drawer-title]');
  const body = $('[data-drawer-body]');
  const foot = $('[data-drawer-foot]');
  if (!drawer) return;

  title.textContent = kind === 'tip' ? 'Study-tips submission' : 'Topic request';
  body.innerHTML = kind === 'tip' ? tipDetail(record) : requestDetail(record);
  foot.innerHTML = kind === 'req' ? requestActions(record) : '';
  drawer.hidden = false;
  document.body.classList.add('has-drawer');

  const closeBtn = drawer.querySelector('[data-drawer-close]');
  if (closeBtn) closeBtn.focus();
}

function closeDrawer() {
  const drawer = $('[data-drawer]');
  if (!drawer) return;
  drawer.hidden = true;
  document.body.classList.remove('has-drawer');
  drawerRecord = null;
}

function detailRow(label, value, raw) {
  return `<div class="detail-row">
    <dt>${esc(label)}</dt>
    <dd>${raw ? value : value ? esc(value) : '<span class="muted">—</span>'}</dd>
  </div>`;
}

function tipDetail(r) {
  return `
    <dl class="detail-list">
      ${detailRow('Name', r.first_name || '')}
      ${detailRow('Email', r.email)}
      ${detailRow('Preferred language', r.language)}
      ${detailRow('Interests', r.interests.length ? r.interests.map((i) => `<span class="mini-pill">${esc(i)}</span>`).join(' ') : '', true)}
      ${detailRow('Submitted', fmtDate(r.created_at))}
      ${detailRow('Source', sourceBadge(r.source), true)}
    </dl>`;
}

function requestDetail(r) {
  return `
    <dl class="detail-list">
      ${detailRow('Topic', r.title)}
      ${detailRow('Student', r.name || '')}
      ${detailRow('Email', r.email || '')}
      ${detailRow('Class / exam', r.class_exam)}
      ${detailRow('Subject', r.subject)}
      ${detailRow('Status', statusBadge(r.status), true)}
      ${detailRow('Submitted', fmtDate(r.created_at))}
      ${detailRow('Source', sourceBadge(r.source), true)}
      ${detailRow('Description', r.description || '')}
    </dl>`;
}

function requestActions(r) {
  const btn = (status, label, variant) =>
    `<button class="btn ${variant || 'btn--secondary'} btn--sm" type="button" data-set-status="${status}">${label}</button>`;

  let controls = '';
  if (r.status === 'pending') {
    controls = btn('approved', 'Approve', 'btn--primary') + btn('declined', 'Decline');
  } else if (r.status === 'approved') {
    controls = btn('pending', 'Move to pending') + btn('declined', 'Decline');
  } else {
    controls = btn('approved', 'Approve', 'btn--primary') + btn('pending', 'Move to pending');
  }

  return `
    <div class="drawer__actions">${controls}</div>
    <p class="drawer__msg" data-drawer-msg role="status" aria-live="polite"></p>`;
}

async function applyStatus(status) {
  if (!drawerRecord || drawerRecord.kind !== 'req') return;
  const record = drawerRecord.record;
  const buttons = $$('[data-set-status]');
  buttons.forEach((b) => (b.disabled = true));

  const msg = $('[data-drawer-msg]');
  if (msg) {
    msg.className = 'drawer__msg is-info';
    msg.textContent = 'Updating…';
  }

  try {
    const result = await updateRequestStatus(session, record.id, status);
    record.status = status;

    const live = data.requests.find((x) => x.id === record.id);
    if (live) live.status = status;

    const foot = $('[data-drawer-foot]');
    if (foot) foot.innerHTML = requestActions(record);

    renderRequests();
    renderStats();
    renderRecent();

    const fresh = $('[data-drawer-msg]');
    if (fresh) {
      fresh.className = 'drawer__msg is-success';
      const where = result.persistedTo === 'database'
        ? 'Saved to the database.'
        : result.persistedTo === 'browser'
        ? 'Saved in this browser.'
        : 'Sample data — change is for this session only.';
      fresh.textContent = `Marked as ${status}. ${where}`;
    }
  } catch (err) {
    if (msg) {
      msg.className = 'drawer__msg is-error';
      msg.textContent =
        err && err.code === 'unauthorized'
          ? 'Your session expired. Please sign in again.'
          : 'Could not update the status. Nothing was changed — please try again.';
    }
    buttons.forEach((b) => (b.disabled = false));
    if (err && err.code === 'unauthorized') {
      setTimeout(() => {
        session = null;
        window.location.replace('admin-login.html?expired=1');
      }, 1200);
    }
  }
}

/* -------------------------------------------------------------- loading */
function setLoading(on) {
  const el = $('[data-loading]');
  if (el) el.hidden = !on;
  const content = $('[data-admin-content]');
  if (content) content.setAttribute('aria-busy', on ? 'true' : 'false');
}

function setAlert(type, message, withRetry) {
  const el = $('[data-alert]');
  if (!el) return;
  el.hidden = false;
  el.className = `admin-alert admin-alert--${type}`;
  el.innerHTML = `<span>${esc(message)}</span>`;
  if (withRetry) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--secondary btn--sm';
    btn.textContent = 'Try again';
    btn.addEventListener('click', loadData);
    el.append(btn);
  }
}

function clearAlert() {
  const el = $('[data-alert]');
  if (el) {
    el.hidden = true;
    el.textContent = '';
  }
}

/* ----------------------------------------------------------------- boot */
async function loadData() {
  clearAlert();
  setLoading(true);
  try {
    data = isDemo(session) ? collectDemoData() : await fetchRemoteData(session);
    renderAll();
  } catch (err) {
    if (err && err.code === 'unauthorized') {
      session = null;
      window.location.replace('admin-login.html?expired=1');
      return;
    }
    setAlert(
      'error',
      err && err.code === 'server'
        ? 'We could not reach the submissions database. Your data is safe — please retry.'
        : 'Could not load submissions right now. Please try again.',
      true
    );
    data = { subscribers: [], requests: [] };
    renderAll();
  } finally {
    setLoading(false);
  }
}

function renderAll() {
  renderStats();
  renderTips();
  renderRequests();
  renderRecent();
}

function applyDemoUI() {
  const demo = isDemo(session);
  const chip = $('[data-demo-chip]');
  if (chip) chip.hidden = !demo;
  const banner = $('[data-demo-banner]');
  if (banner) banner.hidden = !demo;
  const who = $('[data-admin-who]');
  if (who) who.textContent = demo ? 'Demo reviewer' : session.email || 'Administrator';
}

function wireEvents() {
  $$('[data-nav]').forEach((btn) =>
    btn.addEventListener('click', () => showSection(btn.dataset.nav))
  );

  const menu = $('[data-menu]');
  const sidebar = $('.admin-sidebar');
  if (menu && sidebar) {
    menu.addEventListener('click', () => {
      const open = sidebar.classList.toggle('is-open');
      menu.setAttribute('aria-expanded', String(open));
    });
  }

  /* overview KPI shortcuts */
  const kpis = $('[data-kpis]');
  if (kpis) {
    kpis.addEventListener('click', (e) => {
      const card = e.target.closest('[data-kpi]');
      if (!card) return;
      const key = card.dataset.kpi;
      if (key === 'requests' || key === 'pending' || key === 'approved') {
        view.reqs.status = key === 'requests' ? 'all' : key;
        syncStatusChips();
        renderRequests();
        showSection('requests');
      } else {
        showSection('tips');
      }
    });
  }

  /* tips toolbar */
  const tipSearch = $('[data-tips-search]');
  if (tipSearch) {
    tipSearch.addEventListener('input', (e) => {
      view.tips.q = e.target.value;
      renderTips();
    });
  }
  const tipLang = $('[data-tips-language]');
  if (tipLang) {
    tipLang.addEventListener('change', (e) => {
      view.tips.language = e.target.value;
      renderTips();
    });
  }
  const tipSort = $('[data-tips-sort]');
  if (tipSort) {
    tipSort.addEventListener('click', () => {
      view.tips.sort = view.tips.sort === 'desc' ? 'asc' : 'desc';
      tipSort.dataset.dir = view.tips.sort;
      tipSort.setAttribute('aria-label', `Sort by date, ${view.tips.sort === 'desc' ? 'newest' : 'oldest'} first`);
      renderTips();
    });
  }

  /* requests toolbar */
  const reqSearch = $('[data-requests-search]');
  if (reqSearch) {
    reqSearch.addEventListener('input', (e) => {
      view.reqs.q = e.target.value;
      renderRequests();
    });
  }
  $$('[data-status-filter]').forEach((chip) =>
    chip.addEventListener('click', () => {
      view.reqs.status = chip.dataset.statusFilter;
      syncStatusChips();
      renderRequests();
    })
  );
  const reqSort = $('[data-requests-sort]');
  if (reqSort) {
    reqSort.addEventListener('click', () => {
      view.reqs.sort = view.reqs.sort === 'desc' ? 'asc' : 'desc';
      reqSort.dataset.dir = view.reqs.sort;
      reqSort.setAttribute('aria-label', `Sort by date, ${view.reqs.sort === 'desc' ? 'newest' : 'oldest'} first`);
      renderRequests();
    });
  }

  /* row clicks -> drawer (keyboard accessible too) */
  document.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-kind]');
    if (row) {
      const kind = row.dataset.kind;
      const id = row.dataset.id;
      const record =
        kind === 'tip'
          ? data.subscribers.find((r) => r.id === id)
          : data.requests.find((r) => r.id === id);
      if (record) openDrawer(kind, record);
    }
    if (e.target.closest('[data-drawer-close]')) closeDrawer();
    const setStatus = e.target.closest('[data-set-status]');
    if (setStatus) applyStatus(setStatus.dataset.setStatus);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('[data-drawer]').hidden) closeDrawer();
      else closeMenu();
    }
    if (e.key === 'Enter' && e.target.matches('tr[data-kind]')) {
      e.target.click();
    }
  });

  const logout = $('[data-logout]');
  if (logout) {
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      await signOut();
      window.location.replace('login.html');
    });
  }
}

function syncStatusChips() {
  $$('[data-status-filter]').forEach((chip) => {
    chip.setAttribute('aria-pressed', chip.dataset.statusFilter === view.reqs.status ? 'true' : 'false');
  });
}

async function boot() {
  session = await resolveSession();
  if (!session) {
    window.location.replace('admin-login.html');
    return;
  }
  applyDemoUI();
  wireEvents();

  const wanted = (location.hash || '').replace('#', '');
  showSection(wanted || 'overview');

  await loadData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
