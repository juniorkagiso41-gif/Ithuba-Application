# iThuba

iThuba is a Next.js graduate opportunity platform using Supabase Auth, Postgres, and private Supabase Storage for its backend.

## Technologies

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS
- Supabase Auth, PostgreSQL, Row Level Security, and private Storage

## What it does

- Graduates can register with email verification, build profiles, upload CVs and project evidence, record projects and work history, and apply for vacancies.
- Employers can publish vacancies, review applicants, update application statuses, and view graduate portfolios.
- Vacancy listings are publicly viewable; graduate profile and evidence access is controlled by Supabase policies.

## Local setup

1. Install Node.js and npm, then install dependencies with `npm install`.
2. Create a Supabase project.
3. In the Supabase SQL Editor, apply `supabase/migrations/20261028000100_ithuba_initial_schema.sql` once. Then apply `supabase/migrations/20261028000300_repair_app_permissions.sql` followed by migrations `20261028000400_fix_employer_applicant_access.sql`, `20261028000500_reset_job_policies.sql`, and `20261028000600_fix_work_arrangement_constraint.sql`, in timestamp order. The repair migration includes the portfolio tables and expanded job columns. Do not rerun the initial migration over a project with existing custom policies.
4. In Supabase Authentication settings, enable email confirmations. Update the signup confirmation email template to include `{{ .Token }}` so users receive the six-digit code used on iThuba's verification page.
5. Set the Supabase site's URL to `http://localhost:3000` and allow that URL in the redirect URL list for local development.
6. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key from Supabase project API settings. Never use a service-role key in the browser or commit secrets.
7. Start the development server with `npm run dev`, then open `http://localhost:3000`.

The Supabase Auth email provider sends and validates signup codes; iThuba does not store verification codes or passwords itself. For production delivery, configure a custom SMTP provider in the Supabase project's Auth SMTP settings.

## Known limitations

- A Supabase project and its migrations must be configured separately; cloning this repository does not provide a ready-to-use hosted backend or reviewer accounts.
- Existing records in the previous local SQLite database are not migrated and the database is not used by the app. Local database files under `data/` are excluded from Git because they may contain private account and session data.
- Email delivery beyond Supabase's default settings requires a custom SMTP provider.
- Graduate documents are private. Employers need an authorized account to view portfolios and temporary signed document links expire.

## Backend features

- Supabase Auth signup, login, session cookies, email confirmation, and resend-code action
- Shared server, browser, and proxy helpers in `src/utils/supabase/`
- Postgres profiles, jobs, and applications with Row Level Security
- Employer-owned vacancy controls and graduate application permissions
- Private `graduate-evidence` Storage bucket with per-user file access policies
- Graduate CV uploads, work history, project records, and project evidence
- Employer graduate directory with short-lived signed links to CV and portfolio files
- Public live listings for every employer-posted vacancy, plus detailed vacancy fields

Graduate CVs and portfolio files are shared with every signed-in account whose profile role is `employer`, as requested. Confirm that employer accounts are appropriately verified before using this for real candidate data.

## Development

```bash
npm run dev
npm run lint
npm run build
```
