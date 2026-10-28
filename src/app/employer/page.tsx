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

async function createJob(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user || user.role !== "employer") {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const type = String(formData.get("type") ?? "Full-time").trim();
  const salary = String(formData.get("salary") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const experienceLevel = String(formData.get("experienceLevel") ?? "").trim();
  const educationLevel = String(formData.get("educationLevel") ?? "").trim();
  const workArrangement = String(formData.get("workArrangement") ?? "").trim();
  const benefits = String(formData.get("benefits") ?? "").trim();
  const skills = String(formData.get("skills") ?? "").trim();
  const deadline = String(formData.get("applicationDeadline") ?? "").trim();
  const openings = Number(formData.get("openings") ?? 1);
  const salaryMinValue = String(formData.get("salaryMin") ?? "").trim();
  const salaryMaxValue = String(formData.get("salaryMax") ?? "").trim();
  const salaryMin = salaryMinValue ? Number(salaryMinValue) : null;
  const salaryMax = salaryMaxValue ? Number(salaryMaxValue) : null;

  if (!title || !location || !salary || !description || !requirements) {
    throw new Error("Complete the required vacancy fields: title, location, salary display, description, and requirements.");
  }
  if (!Number.isInteger(openings) || openings < 1 || openings > 1000) {
    throw new Error("Openings must be a whole number between 1 and 1,000.");
  }
  if (!["On-site", "Hybrid", "Remote"].includes(workArrangement)) {
    throw new Error("Choose a valid work arrangement.");
  }
  if ((salaryMin !== null && (!Number.isInteger(salaryMin) || salaryMin < 0)) ||
      (salaryMax !== null && (!Number.isInteger(salaryMax) || salaryMax < 0))) {
    throw new Error("Salary amounts must be whole non-negative numbers in ZAR.");
  }
  if (salaryMin !== null && salaryMax !== null && salaryMax < salaryMin) {
    throw new Error("Maximum salary must be greater than or equal to minimum salary.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").insert({
    employer_id: user.id,
    title,
    location,
    type,
    salary,
    description,
    requirements,
    company_name: companyName || null,
    department: department || null,
    experience_level: experienceLevel || null,
    education_level: educationLevel || null,
    work_arrangement: workArrangement || null,
    salary_min: salaryMin,
    salary_max: salaryMax,
    benefits: benefits || null,
    application_deadline: deadline || null,
    openings,
    skills: skills || null,
  });

  if (error) {
    throw new Error(`Could not publish the vacancy: ${error.message}`);
  }
  redirect("/employer");
}

async function updateApplicationStatus(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user || user.role !== "employer") {
    redirect("/login");
  }

  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const allowedStatuses = ["submitted", "reviewing", "shortlisted", "rejected", "hired"];
  if (!applicationId || !allowedStatuses.includes(status)) {
    throw new Error("Choose a valid application status.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not update the application: ${error.message}`);
  }
  if (!data) {
    throw new Error("You do not have permission to update that application.");
  }
  redirect("/employer");
}

export default async function EmployerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "employer") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: jobRows, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .eq("employer_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Job[]>();
  if (jobsError) {
    throw new Error(`Could not load your vacancies: ${jobsError.message}`);
  }

  const jobIds = (jobRows ?? []).map((job) => job.id);
  let applicationRows: Application[] = [];
  if (jobIds.length) {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .in("job_id", jobIds)
      .order("updated_at", { ascending: false })
      .returns<Application[]>();
    if (error) {
      throw new Error(`Could not load applicants: ${error.message}`);
    }
    applicationRows = data ?? [];
  }

  let allApplicationRows: { job_id: string }[] = [];
  if (jobIds.length) {
    const { data, error } = await supabase
      .from("applications")
      .select("job_id")
      .in("job_id", jobIds);
    if (error) {
      throw new Error(`Could not count applicants for your vacancies: ${error.message}`);
    }
    allApplicationRows = data ?? [];
  }

  const applicantIds = [...new Set(applicationRows.map((application) => application.graduate_id))];
  let applicantProfiles: { id: string; full_name: string }[] = [];
  if (applicantIds.length) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", applicantIds);
    if (error) {
      throw new Error(`Could not load applicant profiles: ${error.message}`);
    }
    applicantProfiles = data ?? [];
  }

  const applicantNames = new Map(applicantProfiles.map((profile) => [profile.id, profile.full_name]));
  const jobTitles = new Map((jobRows ?? []).map((job) => [job.id, job.title]));
  const applicantCounts = new Map<string, number>();
  allApplicationRows.forEach((application) => {
    applicantCounts.set(application.job_id, (applicantCounts.get(application.job_id) ?? 0) + 1);
  });
  const jobs = (jobRows ?? []).map((job) => ({
    ...job,
    applicant_count: applicantCounts.get(job.id) ?? 0,
  }));
  const applications = applicationRows.map((application) => ({
    ...application,
    job_title: jobTitles.get(application.job_id) ?? "Opportunity",
    candidate_name: applicantNames.get(application.graduate_id) ?? "Graduate",
  }));

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xl font-black text-slate-900">iThuba employer workspace</p>
            <p className="text-sm text-slate-500">Welcome back, {user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/employer/graduates" className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Browse graduates</Link>
            <form action={signOut}>
              <button type="submit" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-300">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <section className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Talent pipeline</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Create a vacancy</h1>
            <form action={createJob} className="mt-6 space-y-4">
              <div>
                <label htmlFor="title" className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
                <input id="title" name="title" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="Graduate Product Analyst" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="location" className="mb-2 block text-sm font-semibold text-slate-700">Location</label>
                  <input id="location" name="location" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="Johannesburg" />
                </div>
                <div>
                  <label htmlFor="type" className="mb-2 block text-sm font-semibold text-slate-700">Type</label>
                  <select id="type" name="type" defaultValue="Full-time" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white">
                    <option value="Full-time">Full-time</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="salary" className="mb-2 block text-sm font-semibold text-slate-700">Salary</label>
                <input id="salary" name="salary" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="R22,000 - R30,000" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="companyName" className="mb-2 block text-sm font-semibold text-slate-700">Company / organisation</label>
                  <input id="companyName" name="companyName" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="Your organisation" />
                </div>
                <div>
                  <label htmlFor="department" className="mb-2 block text-sm font-semibold text-slate-700">Department / team</label>
                  <input id="department" name="department" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="Product, Finance, Engineering..." />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="experienceLevel" className="mb-2 block text-sm font-semibold text-slate-700">Experience level</label>
                  <select id="experienceLevel" name="experienceLevel" defaultValue="Graduate / entry level" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <option>Graduate / entry level</option><option>Internship</option><option>1–2 years</option><option>3–5 years</option><option>Experienced</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="educationLevel" className="mb-2 block text-sm font-semibold text-slate-700">Education / qualification</label>
                  <input id="educationLevel" name="educationLevel" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" placeholder="Degree, diploma, certificate, or equivalent" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="workArrangement" className="mb-2 block text-sm font-semibold text-slate-700">Work arrangement</label>
                  <select id="workArrangement" name="workArrangement" defaultValue="Hybrid" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <option>On-site</option><option>Hybrid</option><option>Remote</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="openings" className="mb-2 block text-sm font-semibold text-slate-700">Number of openings</label>
                  <input id="openings" name="openings" type="number" min="1" max="1000" defaultValue="1" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
                </div>
              </div>

              <div>
                <p className="mb-2 block text-sm font-semibold text-slate-700">Optional salary range (ZAR per month)</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input name="salaryMin" type="number" min="0" step="1" aria-label="Minimum salary in rand per month" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" placeholder="Minimum (R)" />
                  <input name="salaryMax" type="number" min="0" step="1" aria-label="Maximum salary in rand per month" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" placeholder="Maximum (R)" />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                <textarea id="description" name="description" rows={5} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="Describe the organisation, role purpose, day-to-day responsibilities, team, manager, working hours, contract duration, and expected outcomes." />
              </div>

              <div>
                <label htmlFor="requirements" className="mb-2 block text-sm font-semibold text-slate-700">Requirements</label>
                <textarea id="requirements" name="requirements" rows={4} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="Separate essential requirements from nice-to-haves. Describe skills and experience fairly." />
              </div>

              <div>
                <label htmlFor="skills" className="mb-2 block text-sm font-semibold text-slate-700">Skills / keywords</label>
                <input id="skills" name="skills" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="SQL, customer research, Excel, communication" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="benefits" className="mb-2 block text-sm font-semibold text-slate-700">Benefits and support</label>
                  <textarea id="benefits" name="benefits" rows={3} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" placeholder="Mentorship, training, medical aid, transport..." />
                </div>
                <div>
                  <label htmlFor="applicationDeadline" className="mb-2 block text-sm font-semibold text-slate-700">Application deadline</label>
                  <input id="applicationDeadline" name="applicationDeadline" type="date" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
                </div>
              </div>

              <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-700">
                Publish role
              </button>
            </form>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Open vacancies</h2>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">{jobs.length} roles</span>
            </div>

            <div className="mt-5 space-y-4">
              {jobs.length > 0 ? jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-slate-900">{job.title}</div>
                      <div className="mt-1 text-sm text-slate-500">{job.location} · {job.type}</div>
                    </div>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">{job.applicant_count} applicants</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{job.description}</p>
                  <div className="mt-3 text-sm font-medium text-slate-700">Salary: {job.salary}</div>
                  {(job.company_name || job.department || job.experience_level || job.work_arrangement || job.application_deadline) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      {job.company_name && <span className="rounded-full bg-white px-3 py-1">{job.company_name}</span>}
                      {job.department && <span className="rounded-full bg-white px-3 py-1">{job.department}</span>}
                      {job.experience_level && <span className="rounded-full bg-white px-3 py-1">{job.experience_level}</span>}
                      {job.work_arrangement && <span className="rounded-full bg-white px-3 py-1">{job.work_arrangement}</span>}
                      {job.application_deadline && <span className="rounded-full bg-white px-3 py-1">Apply by {job.application_deadline}</span>}
                    </div>
                  )}
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  You have not published any vacancies yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Applicants</h2>
            <div className="mt-5 space-y-4">
              {applications.length > 0 ? applications.map((application) => (
                <div key={application.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-slate-900">{application.candidate_name}</div>
                      <div className="text-sm text-slate-500">{application.job_title}</div>
                    </div>
                    <Link href={`/employer/graduates/${application.graduate_id}`} className="text-sm font-semibold text-teal-800 underline">View profile</Link>
                    <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800 capitalize">{application.status}</span>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-600">{application.cover_letter}</div>
                  <form action={updateApplicationStatus} className="mt-4 flex gap-2">
                    <input type="hidden" name="applicationId" value={application.id} />
                    <select name="status" defaultValue={application.status} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500">
                      <option value="submitted">Submitted</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="rejected">Rejected</option>
                      <option value="hired">Hired</option>
                    </select>
                    <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">Update</button>
                  </form>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  No applications for your roles yet.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
