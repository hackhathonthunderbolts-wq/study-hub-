# Study Hub — A Vedantu Fan Companion

An unofficial, student-built companion site for discovering **free video lessons** by class and
subject, joining a **study-tips newsletter**, and **requesting topics** you want explained.

> **Unofficial fan project. Not affiliated with or endorsed by Vedantu.**

Plain HTML5 + CSS3 + vanilla ES modules. No frameworks, no build step.

---

## 1. What's inside

```
/index.html          Home — hero, why-learning cards, 6 facade videos, categories, study-tips CTA
/study-tips.html     Dedicated study-tips newsletter page (opened by every "Get Study Tips" link)
/lessons.html        Filterable/searchable lesson library (class + subject chips, live count)
/request.html        Topic request form + honest explainer + recently requested list
/login.html          Role gate — continue as a student or head to the admin login
/admin-login.html    Admin sign-in (Supabase) + "Use This as Demo" shortcut for reviewers
/admin.html          Admin dashboard — KPIs, study-tip responses, topic requests, status updates
/about.html          Neutral about page with [VERIFY: …] placeholders
/css/styles.css      The whole design system (tokens → components → responsive → motion)
/js/config.js        ⬅ EDIT ME: Supabase keys, Formspree fallback, featured video IDs
/js/main.js          Theme toggle, mobile nav, reveal-on-scroll, video facades, home render
/js/forms.js         Validation, honeypot, rate limit, backend calls, all UX states
/js/store.js         Admin data layer: demo samples, localStorage, Supabase REST reads/updates
/js/auth.js          Session layer: GoTrue sign-in, refresh, logout, demo session
/js/login.js         Admin login page: demo shortcut + email/password sign-in
/js/admin.js         Dashboard logic: KPIs, tables, filters, drawer, status changes
/js/lessons.js       Lesson data + filtering/search logic
/assets/             Original SVG logo, favicon, og-cover.png
/supabase/schema.sql Tables + Row Level Security + admins role + public approved-requests view
/404.html            Styled not-found page (used by Vercel, Netlify and GitHub Pages)
/vercel.json         Vercel config: security headers + asset caching, no build step
/.gitignore, /.vercelignore
/sitemap.xml, robots.txt
```

## 2. Run it locally

ES modules need HTTP (opening `index.html` straight from disk will fail with CORS errors):

```bash
# any of these, then open http://localhost:5000
npx serve .
python -m http.server 5000
```

Out of the box the site runs in **demo mode**: both forms validate, animate and “submit” to
`localStorage`, so every UX state (success, duplicate, rate limit) works with zero setup.

## 3. Connect Supabase (recommended backend)

1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql`, press **Run**.
3. **Settings → API** → copy the *Project URL* and the *anon public* key.
4. Paste them into `js/config.js`:

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

That's it — the site posts with plain `fetch` to `/rest/v1/{subscribers|topic_requests}`.

**What the SQL gives you**

| Object | Purpose |
| --- | --- |
| `subscribers`, `topic_requests` | RLS enabled, `INSERT` allowed for `anon` **only** |
| `admins` + `is_admin()` | auth user IDs allowed into the dashboard; gates every admin read/update |
| unique index on `lower(email)` | duplicate sign-ups return Postgres `23505`, shown as “You're already subscribed” |
| `approved_topic_requests` view | public `SELECT`, columns: `title, class_exam, subject, created_at` — **never** emails or names |
| seed rows | four approved sample requests so `/request.html` isn't empty |

**Admin dashboard (login + demo):**

1. Create the admin account: **Authentication → Users → Add user** (email + password).
2. Open `supabase/schema.sql`, replace the placeholder UUID in section 5b with the user's
   **UUID** from **Authentication → Users**, then re-run the file. The account is now an admin.
3. Open `/admin-login.html` and sign in. The dashboard reviews **study-tip signups** and
   **topic requests**: search, filter by status/language, sort by date, click a row for details,
   and Approve / Decline from the drawer. Approved requests appear on `/request.html`.
4. **“Use This as Demo”** opens the dashboard with clearly-labelled bundled samples plus anything
   saved in this browser — no sign-in needed and it can never reveal production data.

> Security model: the client-side session check is only a convenience. Private student rows are
> protected by Row Level Security — a signed-in non-admin gets an empty/403 response, and the demo
> session carries no token, so it can only ever render bundled samples.

Never put the `service_role` key in this repo — the anon key is public by design.

## 4. Fallback backend: Formspree (3 steps)

1. Create a free form at <https://formspree.io> and copy its endpoint.
2. Paste it into `js/config.js` as `FORMSPREE_ENDPOINT`.
3. Leave the Supabase values as `YOUR_…` — the code picks Formspree automatically.

Note: Formspree cannot detect duplicate emails, so that message only appears on Supabase/demo.

## 5. Editing the featured videos

In `js/config.js`, the clearly marked `FEATURED_VIDEOS` array:

```js
{ id: 'PLACEHOLDER_MATH_1', title: 'Quadratic Equations…', subject: 'Maths', level: 'Class 9-10', blurb: '…' }
```

Replace `id` with a real YouTube ID (the part after `v=` in a watch URL). IDs starting with
`PLACEHOLDER` show a yellow note instead of a player, so nothing ever looks broken. Lesson IDs
live in `js/lessons.js`. Thumbnails are generated SVG art — no third-party images are used.

## 6. Deploy

Set `SITE_URL` in `js/config.js`, then update the domain in `sitemap.xml`, `robots.txt` and the
`canonical` / `og:url` tags in each HTML file.

**Push to GitHub**

```bash
git init
git add .
git commit -m "Study Hub: Vedantu fan companion"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.gitignore` is already included (keeps secrets, `node_modules`, `*.zip` and OS junk out).

**Vercel** — `vercel.json` is included, so no dashboard configuration is needed:
drag the folder onto <https://vercel.com/new>, or run `npx vercel` in the project root
(framework preset: *Other*, build command: *empty*, output directory: *empty*). It provides
security headers (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS)
and long-lived caching for `/assets`, `/css` and `/js`. `404.html` is served automatically for
unknown URLs. `cleanUrls` is intentionally **off** so `.html` URLs match the `canonical` tags and
`sitemap.xml` exactly (and so the same folder also works on GitHub Pages, which has no clean
URLs). If you enable `cleanUrls: true`, update the canonical/og:url tags and the sitemap to the
extensionless URLs.

**Netlify** — drag the folder onto <https://app.netlify.com/drop>, or connect the repo
(build command: *none*, publish directory: `/`). `404.html` is picked up automatically.

**GitHub Pages** — push to a repo → Settings → Pages → Deploy from branch → `/ (root)`.
All links are relative, so project sites (`username.github.io/repo/`) work as-is, and
`404.html` becomes the Pages not-found page.

## 7. Design tokens (for editing)

| Token | Value | Use |
| --- | --- | --- |
| `--navy` | `#0B1220` | text, dark background, footer |
| `--surface` / `--bg` | `#F7F5F0` | page surface |
| `--orange` | `#FF7A1A` | primary buttons (always with navy text), accents |
| `--teal` / `--teal-ink` | `#0F9D8A` / `#0A6E60` | success states, privacy notes |
| `--yellow` | `#FFD166` | small highlights, focus ring in dark mode |
| `--r-card` / `--r-pill` | `12px` / `999px` | cards / pills |
| fonts | Sora (headings), Inter (body), Noto Sans Devanagari (Hindi fallback) | loaded from Google Fonts with `preconnect` |

Spacing follows an 8px grid (`--sp-1 … --sp-8`), type uses `clamp()` for a fluid scale, and light
/ dark themes come from `prefers-color-scheme` **plus** a manual toggle persisted in
`localStorage`.

---

## 8. Lighthouse checklist (target 95+)

Run in an Incognito window on `http://localhost` (or the live URL) over 3 mobile runs.

- [ ] **Performance** — no render-blocking CSS beyond one stylesheet; fonts `preconnect`ed + `display=swap`
- [ ] **Performance** — zero images requested above the fold (logo/favicon are tiny inline-size SVGs)
- [ ] **Performance** — no YouTube iframe loads until a facade is clicked (`loading="lazy"` when it does)
- [ ] **Performance** — all `img` tags carry `width`/`height` (no CLS); cards use `aspect-ratio: 16/9`
- [ ] **Performance** — ~42 KB of JS total (≈11 KB gzipped), no libraries, modules loaded on demand per page
- [ ] **Accessibility** — semantic landmarks, one `h1`/page, no heading level skips, skip link
- [ ] **Accessibility** — every control labelled, `aria-pressed` chips, `aria-live` result count and form status
- [ ] **Accessibility** — visible focus (`3px` ring), 44px+ touch targets, keyboard-only operable
- [ ] **Best Practices** — CSP meta tag, no `console` errors, HTTPS, no 404s
- [ ] **SEO** — unique title/description, canonical, Open Graph + Twitter cards, `sitemap.xml`, `robots.txt`
- [ ] **Contrast** — orange buttons use navy text (7.2:1); muted text ≥ 4.5:1 in both themes

## 9. Accessibility checklist

- [ ] `Tab` reaches skip link first; `Enter` jumps to `#main`
- [ ] Mobile: hamburger opens menu (`aria-expanded=true`), `Escape` closes and returns focus
- [ ] Theme toggle announces the *next* theme and persists across reloads
- [ ] Filter chips toggle with `Space`/`Enter` and expose `aria-pressed`; result count is announced
- [ ] Invalid submit focuses the first bad field; each error is tied via `aria-describedby`
- [ ] Form status region (`role="status"`) announces loading → success/error
- [ ] 500-char counter is visual; a polite status announces only at 50 / 20 / 0 remaining
- [ ] Honeypot field is off-screen, `tabindex="-1"` and `aria-hidden`
- [ ] `prefers-reduced-motion: reduce` disables transforms, transitions and smooth scroll
- [ ] Tested at 360 / 768 / 1024 / 1440 px; no horizontal scrolling
- [ ] Every video facade button has `aria-label="Play video: …"`

## 10. Form test plan

Run each case on **both** forms (`/study-tips.html` newsletter, `/request.html` topic).

| # | Case | Steps | Expected |
| --- | --- | --- | --- |
| 1 | **Valid** | Fill required fields correctly, submit | Button disables → spinner → teal success, form resets, timestamp stored |
| 2 | **Invalid – empty** | Press submit immediately | Inline errors on every required field, status shows error, focus on first invalid control |
| 3 | **Invalid – email** | `name@`, `notanemail`, `a b@c.com` | “That does not look like an email…”, `aria-invalid="true"` |
| 4 | **Invalid – optional email** | Topic form with `bad` in optional email | Rejected — optional fields are still validated *when filled* |
| 5 | **Duplicate** | Submit the same email twice (clear `studyhub:lastSubmit` in devtools between tries) | Yellow info: “You're already subscribed…” (Supabase `23505` / demo store) |
| 6 | **Offline** | DevTools → Network → Offline, submit | Red error: “You appear to be offline…”; rate mark cleared so retry is allowed |
| 7 | **Server error** | Point `SUPABASE_URL` at a bad host, submit | Red error: “Something went wrong on our side…”; button re-enabled |
| 8 | **Honeypot filled** | Show `#nl-company` / `#req-company` (devtools), type text, submit | Fake success, **nothing stored** |
| 9 | **Rapid resubmit** | Submit successfully, immediately submit again | Yellow info with a countdown: wait ~30s |
| 10 | **Counter** | Type 451+ characters in the description | Counter turns red at ≤50 left, hard stop at 500, status announces thresholds |
| 11 | **No consent** | Everything valid, consent unticked | Consent error shown, nothing sent |
| 12 | **Keyboard only** | Complete a full submit without a mouse | Everything reachable and operable |

Automated equivalents of cases 1–9 already exist in this repo's test harness, plus dedicated
scenarios for the admin login page, the demo dashboard (KPIs, filters, drawer, status updates)
and the Supabase auth/session flows (sign-in, refresh, logout, invalid credentials).

## 11. Privacy notes baked into the UI

- Newsletter collects: first name (optional), email, language, class interests, consent.
- Topic requests collect: name/email (**both optional**), title, two dropdowns, description.
- Never collected: phone number, school, address, marks, photos, payment details — and every
  free-text field warns students not to type personal details.
- Unsubscribe note appears next to the newsletter button; the About page documents deletion.
- Only the **public anon key** ships in the repo; RLS blocks all reads of personal data.

## 12. Content rules honoured

- Neutral, encouraging tone; no claims about results, rankings, pricing, teachers or competitors.
- No Vedantu logo or brand assets — the “Study Hub” wordmark and all artwork are original.
- Unverified facts are marked `[VERIFY: …]` on the About page.
- Disclaimer footer on every page: *“Unofficial fan project. Not affiliated with or endorsed by
  Vedantu.”*
