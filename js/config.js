/* =========================================================================
   Study Hub — configuration
   EDIT THIS FILE. Nothing else needs to change for basic setup.
   ========================================================================= */

/* -----------------------------------------------------------------------
   1. BACKEND KEYS  (Supabase — free tier)
   Create a project at https://supabase.com, run supabase/schema.sql in the
   SQL editor, then paste your Project URL and anon public key below.
   Find them in:  Project Settings → API
   The anon key is PUBLIC by design — it is safe to ship in a repo because
   Row Level Security (see supabase/schema.sql) only allows INSERTs.
   ----------------------------------------------------------------------- */
export const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL'; // e.g. https://abcdefgh.supabase.co
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_PUBLIC_KEY';

/* -----------------------------------------------------------------------
   2. FALLBACK BACKEND (optional)
   If Supabase keys are not filled in, Study Hub posts to Formspree instead.
   Create a form at https://formspree.io and paste the endpoint here.
   Example: 'https://formspree.io/f/xxxxxxx'
   If BOTH backends are empty, the site runs in DEMO mode: submissions are
   validated and stored in this browser only, so you can test every UX state.
   ----------------------------------------------------------------------- */
export const FORMSPREE_ENDPOINT = 'YOUR_FORMSPREE_ENDPOINT';

/* -----------------------------------------------------------------------
   3. SITE URL — used for the sitemap / canonical tags in the HTML files.
   Update after you deploy (Netlify, Vercel or GitHub Pages).
   ----------------------------------------------------------------------- */
export const SITE_URL = 'https://study-hub-fan.netlify.app';

/* -----------------------------------------------------------------------
   4. FEATURED VIDEOS  — edit freely.
   `id` is the YouTube video ID (the part after "v=" in a watch URL).
   IDs starting with PLACEHOLDER show a friendly note instead of an embed —
   swap them for real IDs and the facade player loads youtube-nocookie.com.
   ----------------------------------------------------------------------- */
export const FEATURED_VIDEOS = [
  {
    id: 'PLACEHOLDER_MATH_1',
    title: 'Quadratic Equations, Explained Simply',
    subject: 'Maths',
    level: 'Class 9-10',
    blurb: 'Factorisation, the formula and how to spot which one to use.'
  },
  {
    id: 'PLACEHOLDER_PHY_1',
    title: "Newton's Laws of Motion in Real Life",
    subject: 'Physics',
    level: 'Class 9-10',
    blurb: 'Three laws, everyday examples and the free-body diagrams.'
  },
  {
    id: 'PLACEHOLDER_CHE_1',
    title: 'Chemical Reactions: The Basics',
    subject: 'Chemistry',
    level: 'Class 11-12',
    blurb: 'Balancing equations and the reaction types you keep meeting.'
  },
  {
    id: 'PLACEHOLDER_BIO_1',
    title: 'Cell Structure Made Easy',
    subject: 'Biology',
    level: 'Class 9-10',
    blurb: 'Organelles, their jobs, and a quick way to remember them.'
  },
  {
    id: 'PLACEHOLDER_JEE_1',
    title: 'Rotational Motion: Concept Crash Course',
    subject: 'Physics',
    level: 'JEE',
    blurb: 'Moment of inertia, torque and the ideas behind the problems.'
  },
  {
    id: 'PLACEHOLDER_NEET_1',
    title: 'Human Physiology Revision Sprint',
    subject: 'Biology',
    level: 'NEET',
    blurb: 'A fast, chapter-wise run through the systems that repeat often.'
  }
];

/* -----------------------------------------------------------------------
   5. CATEGORY STRIP on the Home page — each chip deep-links into the
   lesson filters on lessons.html (?class=...)
   ----------------------------------------------------------------------- */
export const CATEGORIES = [
  { label: 'Class 6-8', query: '6-8' },
  { label: 'Class 9-10', query: '9-10' },
  { label: 'Class 11-12', query: '11-12' },
  { label: 'JEE', query: 'JEE' },
  { label: 'NEET', query: 'NEET' },
  { label: 'Olympiads', query: '6-8' }
];
