# iThuba — Graduate Opportunity Platform

iThuba connects graduates with employers. Graduates can build profiles and portfolios, upload CVs and project evidence, and apply for vacancies. Employers can publish jobs, review applicants, and manage application statuses.

## Project links

- **Live demo:** [https://ithuba-app.vercel.app](https://ithuba-app.vercel.app)
- **Source repository:** [https://github.com/juniorkagiso41-gif/Ithuba-Application](https://github.com/juniorkagiso41-gif/Ithuba-Application)

## What iThuba does

- Graduate registration with email confirmation and profile creation.
- Work experience and project portfolios, with private CV and project-evidence uploads.
- Public vacancy browsing and job applications with cover letters.
- Optional JPEG, PNG, or WebP images on employer job listings.
- Employer vacancy management, applicant review, and application status updates.
- Employer graduate directory with temporary signed links to graduate documents.

## Technologies

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4
- Supabase Auth for accounts and email confirmation
- Supabase PostgreSQL with Row Level Security for application data
- Supabase Storage for private graduate documents

## Setup and run locally

### Requirements

- Node.js and npm
- A Supabase project

### Install and configure

1. Install the project dependencies:

   ```bash
   npm install
   ```

2. In the Supabase SQL Editor, run the migration files in timestamp order against a new project:

   1. `supabase/migrations/20261028000100_ithuba_initial_schema.sql`
   2. `supabase/migrations/20261028000200_graduate_portfolios_and_job_details.sql`
   3. `supabase/migrations/20261028000300_repair_app_permissions.sql`
   4. `supabase/migrations/20261028000400_fix_employer_applicant_access.sql`
   5. `supabase/migrations/20261028000500_reset_job_policies.sql`
   6. `supabase/migrations/20261028000600_fix_work_arrangement_constraint.sql`
   7. `supabase/migrations/20261029000100_job_images.sql`
   8. `supabase/migrations/20261029000200_align_graduate_document_metadata.sql`

   Do not rerun these migrations on a project with existing custom policies without first reviewing the SQL changes.

3. In Supabase Authentication settings, enable email confirmations. Update the signup email template to include `{{ .Token }}` so users receive the six-digit verification code.

4. Set the Supabase site URL to `http://localhost:3000` and add it to the allowed redirect URLs.

5. Copy `.env.example` to `.env.local` and enter the project URL and publishable key from Supabase API settings:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

   Keep `.env.local` private. Do not use a service-role key in the browser or commit secrets.

### Start the app

```bash
npm run dev
```

For local development, open [http://localhost:3000](http://localhost:3000). The deployed demo is available at [https://ithuba-app.vercel.app](https://ithuba-app.vercel.app/).

Run the available checks with:

```bash
npm run lint
npm run build
```

## Known limitations and reviewer access

- The app requires a separately configured Supabase project, migrations, and authentication settings. Cloning the repository does not provide a ready-to-use backend.
- No reviewer/demo accounts are included. Account-based features require a configured account; arrange test accounts for reviewers separately and never share real candidate data.
- The previous local SQLite database is not used by the app and is excluded from Git because it may contain private account and session data.
- Supabase default email delivery has limits; configure custom SMTP for production.
- Graduate documents use expiring signed links. Accounts with the `employer` role can access graduate CVs and portfolios; employer verification is not independently enforced by the app. Verify employers and review access policies before using real candidate data.
- Optional job listing images are public and limited to JPEG, PNG, or WebP files up to 5 MB. Do not upload sensitive images.
- **Repository access:** reviewers need a public repository or explicit GitHub access. If the repository is private, invite reviewers before submission. The source link above should be tested in a signed-out browser.

## Pitch deck outline

*The following 12 sections are a slide-ready presentation outline.*

### Slide 1 — iThuba: turn skills into opportunity

**A graduate opportunity platform connecting practical skills, evidence, and employers.**

- Focus: help graduates present their capabilities and help employers review applicants.

### Slide 2 — The problem to solve

- A qualification or CV alone may not make a graduate's practical skills easy to assess.
- Graduates need a clear way to present experience and work evidence alongside applications.
- Employers need a structured way to review candidates and their applications.
- **Important:** These are the problem assumptions this project is designed to address; they still need validation with graduates and employers. Do not present them as measured research findings.

### Slide 3 — System analysis: where the process loses signal

**Graduate journey:** prepare a CV → find a vacancy → apply → wait for feedback.

**Employer journey:** publish a vacancy → receive applications → compare candidates → update application status.

- Evidence of skills, job requirements, and application status can be difficult to review together.
- iThuba brings profiles, portfolios, vacancies, and applications into one platform.
- Validate the current journey with interviews or a pilot before claiming the extent of the problem.

### Slide 4 — Who iThuba serves

**Graduates**
- Create a profile and record work experience and projects.
- Upload a CV and project evidence.
- Discover vacancies and apply with a cover letter.

**Employers**
- Publish vacancies and review applicants.
- Update application statuses.
- Browse graduate portfolios and access shared documents through temporary links.

### Slide 5 — Proposed solution

**One connected path from evidence to opportunity**

1. A graduate creates a profile and adds experience, projects, and documents.
2. An employer publishes a vacancy with role details and requirements.
3. Graduates browse public vacancies and submit applications.
4. Employers review applicants and update application statuses.

### Slide 6 — Product walkthrough

Use the live demo to show this end-to-end flow:

1. Open a public vacancy.
2. Show the graduate profile and portfolio experience.
3. Demonstrate an application, if a configured test account is available.
4. Switch to an employer account to show vacancy and applicant management.

The app requires a configured Supabase backend for account-based features. Prepare test accounts and sample data before the presentation; do not use real candidate documents.

### Slide 7 — Technical approach

- **Web app:** Next.js App Router, React, TypeScript, and Tailwind CSS.
- **Authentication:** Supabase Auth with email confirmation and session cookies.
- **Data:** Supabase PostgreSQL for profiles, jobs, applications, experience, projects, and document metadata.
- **Access control:** Row Level Security policies govern access to application data.
- **Files:** Private Supabase Storage for graduate documents; temporary signed URLs provide time-limited access.
- **Delivery:** deployed web demo with configuration and backend managed separately.

### Slide 8 — Privacy, trust, and access

- Job listings are publicly viewable; graduate records and documents are not intended to be public.
- Graduates provide CVs and portfolio evidence; these files can contain sensitive personal information.
- Employer-role accounts can access graduate CVs and portfolios. Employer verification is not independently enforced by the app.
- Before a real-world pilot: verify employer accounts, use least-privilege access, explain document sharing to graduates, and test account and storage policies.
- Never use real candidate documents in a public demo.

### Slide 9 — Evidence: what exists and what remains to prove

**Implemented in the project**
- Graduate registration, profiles, work history, projects, and document uploads.
- Public job listings and graduate applications.
- Employer vacancy and applicant workflows.
- Database migrations, access policies, and a deployed demo.

**Evidence still needed**
- User testing with graduates and employers.
- Demonstrated completion of key tasks in the deployed environment.
- Feedback on usability, trust, and usefulness of portfolio evidence.
- Pilot outcomes such as completed applications, employer review time, and graduate satisfaction.

Do not present usage statistics, success rates, or testimonials unless they have been measured and can be verified.

### Slide 10 — Feasibility and delivery

- A working web application and database schema provide a starting point for a pilot.
- A pilot requires a configured Supabase project, email delivery, secure storage, and an operator to manage access.
- **Suggested next steps:** verify deployment and policies → recruit a small group of graduates and employers → run task-based testing → review results and improve.
- Track time, completion rates, support needs, and costs during the pilot before estimating scale.

### Slide 11 — Key risks and mitigations

| Risk | Mitigation |
|---|---|
| Unverified employer accounts access candidate portfolios | Verify employers before granting the employer role; review authorization policies. |
| Exposure or misuse of CVs and project files | Keep files private, use expiring links, minimize stored data, and test access controls. |
| Low participation makes the platform less useful | Pilot with both graduates and employers; measure repeat use and vacancy availability. |
| Email confirmation or backend configuration blocks onboarding | Configure production email, test signup end-to-end, and document operational ownership. |
| Demo differs from the code or backend is unavailable | Test the exact demo URL and judge accounts before presenting; prepare a recorded walkthrough. |

### Slide 12 — Expected impact and success measures

**Expected impact:** make graduate skills and work evidence easier to present, and make employer review and application management more structured.

Measure whether the pilot delivers that impact:

- Graduate profile and application completion rates.
- Employer time to review applicants.
- Graduate and employer satisfaction and return usage.
- Whether portfolio evidence helps employers assess role fit.
- Privacy, access-control, and support incidents.

**Ask:** support a small, supervised pilot so iThuba can test these outcomes and prioritize improvements based on real user feedback.
