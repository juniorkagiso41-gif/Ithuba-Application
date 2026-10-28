import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import type { Application, Job } from "@/lib/types";

export const dynamic = "force-dynamic";

async function signOut() {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Could not sign out: ${error.message}`);
  }
  redirect("/");
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "employer") {
    redirect("/employer");
  }

  const supabase = await createClient();
  const { data: jobRows, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<Job[]>();
  if (jobsError) {
    throw new Error(`Could not load career opportunities: ${jobsError.message}`);
  }

  const jobs = (jobRows ?? []).map((job) => ({
    ...job,
    employer_name: job.company_name || "iThuba employer",
  }));

  const { data: applicationRows, error: applicationsError } = await supabase
    .from("applications")
    .select("*")
    .eq("graduate_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(5)
    .returns<Application[]>();
  if (applicationsError) {
    throw new Error(`Could not load your applications: ${applicationsError.message}`);
  }

  const applicationJobIds = [...new Set((applicationRows ?? []).map((application) => application.job_id))];
  const { data: applicationJobs, error: applicationJobsError } = applicationJobIds.length
    ? await supabase.from("jobs").select("id, title").in("id", applicationJobIds)
    : { data: [], error: null };
  if (applicationJobsError) {
    throw new Error(`Could not load application role names: ${applicationJobsError.message}`);
  }
  const applicationJobTitles = new Map((applicationJobs ?? []).map((job) => [job.id, job.title]));
  const applications = (applicationRows ?? []).map((application) => ({
    ...application,
    job_title: applicationJobTitles.get(application.job_id) ?? "Opportunity",
  }));

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xl font-black text-slate-900">iThuba dashboard</p>
            <p className="text-sm text-slate-500">Welcome back, {user.name}</p>
          </div>
          <form action={signOut}>
            <button type="submit" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-300">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <section className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Proof of ability</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Profile readiness</h1>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">84% ready</span>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-100 p-4">
              <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                <span>Core evidence</span>
                <span>7 of 9 items</span>
              </div>
              <div className="mt-3 h-2.5 rounded-full bg-slate-200">
                <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Career opportunities</h2>
              <div className="flex gap-4">
                <Link href="/profile" className="text-sm font-semibold text-teal-700 hover:text-teal-800">Update profile</Link>
                <Link href="/jobs" className="text-sm font-semibold text-teal-700 hover:text-teal-800">All jobs</Link>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-slate-900">{job.title}</div>
                      <div className="mt-1 text-sm text-slate-500">{job.employer_name} · {job.location}</div>
                    </div>
                    <Link href={`/jobs/${job.id}`} className="rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">Apply</Link>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{job.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Application activity</h2>
            <div className="mt-5 space-y-3">
              {applications.length > 0 ? applications.map((app) => (
                <div key={app.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-base font-bold text-slate-900">{app.job_title}</div>
                  <div className="mt-1 text-sm text-slate-500">Status: {app.status}</div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No applications yet. Start by applying to a role that matches your profile.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Skills checklist</h2>
            <ul className="mt-5 space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Portfolio, projects and evidence uploaded</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Qualifications and institution reviewed</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Work readiness statement pending</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Mock assessment not started</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
