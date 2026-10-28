import Image from "next/image";
import Link from "next/link";
import type { Job } from "@/lib/types";

const platformSteps = [
  { label: "Build a profile", value: "Graduate profile" },
  { label: "Show your work", value: "Projects & experience" },
  { label: "Find a role", value: "Job opportunities" },
  { label: "Take the next step", value: "Applications" },
];

const features = [
  {
    title: "Graduate portfolios",
    description: "Graduates can present work history, projects, skills, a CV, and supporting evidence.",
  },
  {
    title: "Vacancies and applications",
    description: "Graduates can browse public job listings and apply with a cover note.",
  },
  {
    title: "Employer workspace",
    description: "Employers can publish vacancies, review applicants, and update application statuses.",
  },
];

export function HomePage({ jobs, jobLoadMessage }: { jobs: (Job & { imageUrl?: string | null })[]; jobLoadMessage?: string }) {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-sm font-bold text-white">
              i
            </div>
            <div>
              <p className="text-xl font-black tracking-tight text-slate-900">iThuba</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Your skills. Your proof.</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link href="#platform">Platform</Link>
            <Link href="#jobs">Opportunities</Link>
            <Link href="#evidence">Evidence</Link>
            <Link href="#security">Trust & safety</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-300">
              Sign in
            </Link>
            <Link href="/register" className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              Join as graduate
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-5 inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-900">
              South African graduate employability
            </div>
            <h1 className="max-w-xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Turn practical ability into credible opportunities.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              iThuba helps graduates present their projects and experience, find vacancies, and apply, while employers manage job listings and applications.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register" className="rounded-full bg-teal-700 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-teal-700/20 hover:bg-teal-800">
                Create profile
              </Link>
              <Link href="#jobs" className="rounded-full border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-800 hover:border-slate-300">
                Explore vacancies
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {platformSteps.map((step) => (
                <div key={step.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-lg font-black text-slate-900">{step.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{step.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">Example profile</p>
                <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200">Illustrative</span>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Graduate portfolio</div>
                  <div className="mt-1 text-2xl font-bold">Projects and experience</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-800 p-3">
                    <div className="text-slate-400">Showcase</div>
                    <div className="mt-1 font-semibold">Projects and work</div>
                  </div>
                  <div className="rounded-xl bg-slate-800 p-3">
                    <div className="text-slate-400">Supporting details</div>
                    <div className="mt-1 font-semibold">Skills and evidence</div>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-300">An example of the information graduates can add to a portfolio.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700">Platform features</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Tools for graduates and employers.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-xl text-teal-700">✓</div>
              <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="jobs" className="border-y border-slate-200 bg-white/70">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700">Job opportunities</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Explore roles posted by employers.</h2>
            </div>
            <Link href="/jobs" className="text-sm font-semibold text-teal-700 hover:text-teal-800">View all jobs</Link>
          </div>
          {jobLoadMessage ? <div role="status" className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">{jobLoadMessage}</div> : jobs.length ? <div className="grid gap-5 md:grid-cols-3">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition-transform hover:-translate-y-1 hover:shadow-lg">
                {job.imageUrl && (
                  <Image
                    src={job.imageUrl}
                    alt={`${job.title} listing`}
                    width={1200}
                    height={630}
                    unoptimized
                    className="mb-5 aspect-video w-full rounded-2xl object-cover"
                  />
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {job.type}
                  </div>
                  <span className="text-sm text-slate-500">{job.location}</span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-900">{job.title}</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">{job.company_name || "iThuba employer"}{job.department ? ` · ${job.department}` : ""}</p>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{job.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  {job.experience_level && <span className="rounded-full bg-white px-3 py-1">{job.experience_level}</span>}
                  {job.work_arrangement && <span className="rounded-full bg-white px-3 py-1">{job.work_arrangement}</span>}
                  {job.application_deadline && <span className="rounded-full bg-white px-3 py-1">Apply by {job.application_deadline}</span>}
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-sm font-medium text-slate-500">{job.salary}</span>
                  <Link href={`/jobs/${job.id}`} className="rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                    View role
                  </Link>
                </div>
              </div>
            ))}
          </div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">No jobs are open right now. Check back soon for new graduate opportunities.</div>}
        </div>
      </section>

      <section id="evidence" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[32px] bg-slate-900 p-8 text-white md:p-12">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">How it works</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white">Keep profiles, vacancies, and applications connected.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-800 p-5">
                <div className="text-xl font-black text-teal-300">For graduates</div>
                <div className="mt-2 text-sm text-slate-300">Build a profile, add experience and projects, and apply to vacancies.</div>
              </div>
              <div className="rounded-2xl bg-slate-800 p-5">
                <div className="text-xl font-black text-teal-300">For employers</div>
                <div className="mt-2 text-sm text-slate-300">Publish roles, review applications, and manage applicant statuses.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">Graduate files</div>
            <h3 className="mt-3 text-xl font-bold text-slate-900">Private documents</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">CVs and project evidence are stored in private storage and shared using temporary links.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">Job listings</div>
            <h3 className="mt-3 text-xl font-bold text-slate-900">Optional public images</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">Employers may add an image to a listing. Uploaded listing images are publicly viewable.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">Account access</div>
            <h3 className="mt-3 text-xl font-bold text-slate-900">Review employer accounts</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">Employer-role accounts can access graduate portfolios. Verify employer accounts before using real candidate data.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© 2026 iThuba. Built for South African graduates and employers.</p>
          <div className="flex gap-5">
            <Link href="/login">Log in</Link>
            <Link href="/register">Register</Link>
            <Link href="#security">Trust</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
