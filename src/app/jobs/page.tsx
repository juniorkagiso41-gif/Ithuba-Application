import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Job[]>();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Opportunities</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Available graduate jobs</h1>
            <p className="mt-2 text-sm text-slate-600">Roles posted by iThuba employers.</p>
          </div>
          <Link href="/" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back home</Link>
        </div>

        {error ? (
          <div role="alert" className="rounded-[28px] border border-amber-200 bg-amber-50 p-8 text-sm leading-6 text-amber-900">
            Job listings could not be loaded because the Supabase database permissions are not ready. Apply the numbered SQL migrations in <code>supabase/migrations</code>, then reload this page.
          </div>
        ) : (jobs ?? []).length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {jobs?.map((job) => (
              <article key={job.id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800">{job.type}</span>
                  <span className="text-right text-sm text-slate-500">{job.location}</span>
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-900">{job.title}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{job.company_name || "iThuba employer"}{job.department ? ` · ${job.department}` : ""}</p>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">{job.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  {job.experience_level && <span className="rounded-full bg-slate-100 px-3 py-1">{job.experience_level}</span>}
                  {job.education_level && <span className="rounded-full bg-slate-100 px-3 py-1">{job.education_level}</span>}
                  {job.work_arrangement && <span className="rounded-full bg-slate-100 px-3 py-1">{job.work_arrangement}</span>}
                  {job.application_deadline && <span className="rounded-full bg-slate-100 px-3 py-1">Deadline {job.application_deadline}</span>}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm font-semibold text-slate-700">{job.salary}</span>
                  <Link href={`/jobs/${job.id}`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">View opportunity</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">No jobs are open right now. Please check back soon.</div>
        )}
        {(jobs ?? []).length === 100 && <p className="mt-6 text-center text-sm text-slate-500">Showing the latest 100 vacancies.</p>}
      </div>
    </main>
  );
}
