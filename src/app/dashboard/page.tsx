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
  const [jobsResult, applicationsResult, profileResult, workResult, projectResult, documentResult] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: false }).limit(5).returns<Job[]>(),
    supabase.from("applications").select("*").eq("graduate_id", user.id).order("updated_at", { ascending: false }).limit(5).returns<Application[]>(),
    supabase.from("profiles").select("headline, bio, location, skills, education").eq("id", user.id).single(),
    supabase.from("graduate_work_experience").select("id").eq("graduate_id", user.id),
    supabase.from("graduate_projects").select("id").eq("graduate_id", user.id),
    supabase.from("graduate_documents").select("document_type").eq("graduate_id", user.id),
  ]);
  const { data: jobRows, error: jobsError } = jobsResult;
  if (jobsError) {
    throw new Error(`Could not load career opportunities: ${jobsError.message}`);
  }

  const { data: applicationRows, error: applicationsError } = applicationsResult;
  if (applicationsError) {
    throw new Error(`Could not load your applications: ${applicationsError.message}`);
  }
  if (profileResult.error) {
    throw new Error(`Could not load your profile readiness: ${profileResult.error.message}`);
  }
  if (workResult.error) {
    throw new Error(`Could not load your work history for profile readiness: ${workResult.error.message}`);
  }
  if (projectResult.error) {
    throw new Error(`Could not load your projects for profile readiness: ${projectResult.error.message}`);
  }
  if (documentResult.error) {
    throw new Error(`Could not load your documents for profile readiness: ${documentResult.error.message}`);
  }

  const jobs = (jobRows ?? []).map((job) => ({
    ...job,
    employer_name: job.company_name || "iThuba employer",
  }));

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

  const profile = profileResult.data;
  const documents = documentResult.data ?? [];
  const readinessItems = [
    { label: "Full name", complete: Boolean(user.name.trim()) },
    { label: "Professional headline", complete: Boolean(profile.headline?.trim()) },
    { label: "Professional summary", complete: Boolean(profile.bio?.trim()) },
    { label: "Location", complete: Boolean(profile.location?.trim()) },
    { label: "Skills", complete: Boolean(profile.skills?.trim()) },
    { label: "Education and qualifications", complete: Boolean(profile.education?.trim()) },
    { label: "CV / résumé", complete: documents.some((document) => document.document_type === "cv") },
    { label: "Work experience", complete: (workResult.data ?? []).length > 0 },
    { label: "Project in portfolio", complete: (projectResult.data ?? []).length > 0 },
    { label: "Project evidence file", complete: documents.some((document) => document.document_type === "project") },
  ];
  const completedReadinessItems = readinessItems.filter((item) => item.complete).length;
  const readinessPercent = Math.round((completedReadinessItems / readinessItems.length) * 100);
  const readinessLabel = readinessPercent >= 90
    ? "Strong profile"
    : readinessPercent >= 70
      ? "Nearly there"
      : readinessPercent >= 40
        ? "In progress"
        : "Getting started";

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
                <p className="mt-2 text-sm text-slate-600">Based on the profile details, experience, projects, and documents you have added.</p>
              </div>
              <span className="shrink-0 rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-800">{readinessPercent}% · {readinessLabel}</span>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-100 p-4">
              <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                <span>Profile checklist</span>
                <span>{completedReadinessItems} of {readinessItems.length} complete</span>
              </div>
              <div
                className="mt-3 h-2.5 rounded-full bg-slate-200"
                role="progressbar"
                aria-label="Profile readiness"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={readinessPercent}
              >
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all" style={{ width: `${readinessPercent}%` }} />
              </div>
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2" aria-label="Profile readiness checklist">
              {readinessItems.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
                  <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                    {item.complete ? "✓" : "–"}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-5 text-slate-500">This score reflects what you have added; it does not verify claims or predict hiring outcomes. <Link href="/profile" className="font-semibold text-teal-700 underline">Update your profile</Link>.</p>
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
            <h2 className="text-xl font-black text-slate-900">Build your profile</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Add your experience, projects, and supporting documents to give employers a clearer picture of your skills.</p>
            <Link href="/profile" className="mt-4 inline-block text-sm font-semibold text-teal-700 underline">Complete your profile</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
