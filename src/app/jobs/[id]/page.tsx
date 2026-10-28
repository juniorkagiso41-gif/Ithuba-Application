import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

async function applyToJob(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "graduate") {
    redirect(user.role === "employer" ? "/employer" : "/dashboard");
  }

  const jobId = String(formData.get("jobId") ?? "").trim();
  const coverLetter = String(formData.get("coverLetter") ?? "").trim();
  if (!jobId || !coverLetter) {
    throw new Error("A job and cover note are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("applications").insert({
    job_id: jobId,
    graduate_id: user.id,
    cover_letter: coverLetter,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("You already applied for this role.");
    }
    throw new Error(`Could not submit your application: ${error.message}`);
  }

  redirect("/dashboard");
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single<Job>();

  if (jobError) {
    if (jobError.code === "PGRST116") {
      redirect("/dashboard");
    }
    throw new Error(`Could not load this opportunity: ${jobError.message}`);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Vacancy</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{job.title}</h1>
          </div>
          <Link href="/dashboard" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300">Back to dashboard</Link>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">{job.type}</span>
              <span>{job.location}</span>
              <span>{job.salary}</span>
              {job.work_arrangement && <span className="rounded-full bg-white px-3 py-1">{job.work_arrangement}</span>}
            </div>
            <div className="mt-5 text-sm leading-7 text-slate-600">{job.description}</div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {job.company_name && <div><h2 className="text-sm font-bold text-slate-900">Organisation</h2><p className="mt-1 text-sm text-slate-600">{job.company_name}</p></div>}
              {job.department && <div><h2 className="text-sm font-bold text-slate-900">Team</h2><p className="mt-1 text-sm text-slate-600">{job.department}</p></div>}
              {job.experience_level && <div><h2 className="text-sm font-bold text-slate-900">Experience level</h2><p className="mt-1 text-sm text-slate-600">{job.experience_level}</p></div>}
              {job.education_level && <div><h2 className="text-sm font-bold text-slate-900">Education</h2><p className="mt-1 text-sm text-slate-600">{job.education_level}</p></div>}
              {job.openings && <div><h2 className="text-sm font-bold text-slate-900">Open positions</h2><p className="mt-1 text-sm text-slate-600">{job.openings}</p></div>}
              {job.application_deadline && <div><h2 className="text-sm font-bold text-slate-900">Apply by</h2><p className="mt-1 text-sm text-slate-600">{job.application_deadline}</p></div>}
              {(job.salary_min !== null && job.salary_min !== undefined) || (job.salary_max !== null && job.salary_max !== undefined) ? (
                <div><h2 className="text-sm font-bold text-slate-900">Salary range</h2><p className="mt-1 text-sm text-slate-600">
                  {job.salary_currency || "ZAR"} {job.salary_min?.toLocaleString() ?? "—"} – {job.salary_max?.toLocaleString() ?? "—"} per month
                </p></div>
              ) : null}
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-bold text-slate-900">Required experience and skills</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{job.requirements}</p>
            </div>
            {job.skills && <div className="mt-6"><h2 className="text-lg font-bold text-slate-900">Skills / keywords</h2><p className="mt-3 text-sm leading-7 text-slate-600">{job.skills}</p></div>}
            {job.benefits && <div className="mt-6"><h2 className="text-lg font-bold text-slate-900">Benefits and support</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{job.benefits}</p></div>}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">Employer</div>
            <div className="mt-3 text-xl font-black text-slate-900">{job.company_name || "iThuba employer"}</div>
            <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">
              This opportunity is being reviewed with evidence-based evaluation and fair hiring requirements.
            </div>
          </div>
        </div>

        {user.role === "graduate" ? (
          <form action={applyToJob} className="mt-8 space-y-5">
            <input type="hidden" name="jobId" value={job.id} />
            <div>
              <label htmlFor="coverLetter" className="mb-2 block text-sm font-semibold text-slate-700">Cover note</label>
              <textarea id="coverLetter" name="coverLetter" rows={6} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="Briefly explain why your evidence matches this role." />
            </div>
            <button type="submit" className="rounded-2xl bg-teal-700 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-800">
              Submit application
            </button>
          </form>
        ) : (
          <p className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Only graduate accounts can apply to vacancies.
          </p>
        )}
      </div>
    </main>
  );
}
