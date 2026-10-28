import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import type { GraduateDocument, GraduateProject, Profile, WorkExperience } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GraduateDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "employer") {
    redirect("/login");
  }
  const { id } = await params;
  const supabase = await createClient();

  const [profileResult, workResult, projectResult, documentResult] = await Promise.all([
    supabase.from("profiles")
      .select("id, full_name, role, headline, bio, location, skills, work_preference, education, updated_at")
      .eq("id", id)
      .eq("role", "graduate")
      .single<Profile>(),
    supabase.from("graduate_work_experience")
      .select("*")
      .eq("graduate_id", id)
      .order("start_date", { ascending: false })
      .returns<WorkExperience[]>(),
    supabase.from("graduate_projects")
      .select("*")
      .eq("graduate_id", id)
      .order("created_at", { ascending: false })
      .returns<GraduateProject[]>(),
    supabase.from("graduate_documents")
      .select("*")
      .eq("graduate_id", id)
      .order("created_at", { ascending: false })
      .returns<GraduateDocument[]>(),
  ]);

  if (profileResult.error?.code === "PGRST116") notFound();
  if (profileResult.error) throw new Error(`Could not load graduate profile: ${profileResult.error.message}`);
  if (workResult.error) throw new Error(`Could not load graduate work history: ${workResult.error.message}`);
  if (projectResult.error) throw new Error(`Could not load graduate projects: ${projectResult.error.message}`);
  if (documentResult.error) throw new Error(`Could not load graduate documents: ${documentResult.error.message}`);

  const documents = documentResult.data ?? [];
  const documentUrls = new Map<string, string>();
  for (const document of documents) {
    const { data, error } = await supabase.storage
      .from("graduate-evidence")
      .createSignedUrl(document.storage_path, 60 * 10);
    if (error) throw new Error(`Could not create a secure document link: ${error.message}`);
    documentUrls.set(document.id, data.signedUrl);
  }
  const projectFiles = new Map(documents.map((document) => [document.storage_path, document]));

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/employer/graduates" className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">← Back to graduate directory</Link>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Graduate profile</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{profileResult.data.full_name || "Graduate"}</h1>
          <p className="mt-2 text-xl font-semibold text-slate-700">{profileResult.data.headline || "Professional profile"}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
            {profileResult.data.location && <span className="rounded-full bg-slate-100 px-3 py-1">{profileResult.data.location}</span>}
            {profileResult.data.work_preference && <span className="rounded-full bg-slate-100 px-3 py-1">{profileResult.data.work_preference}</span>}
          </div>
          {profileResult.data.bio && <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700">{profileResult.data.bio}</p>}
          {profileResult.data.education && <p className="mt-5 text-sm text-slate-700"><strong>Education:</strong> {profileResult.data.education}</p>}
          {profileResult.data.skills && <p className="mt-3 text-sm text-slate-700"><strong>Skills:</strong> {profileResult.data.skills}</p>}
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-900">CV and evidence</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {documents.length ? documents.map((document) => (
              <a key={document.id} href={documentUrls.get(document.id)} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-teal-300">
                <span className="block text-xs font-bold uppercase tracking-[0.15em] text-teal-700">{document.document_type === "cv" ? "CV / résumé" : "Project evidence"}</span>
                <span className="mt-2 block font-semibold text-slate-900">{document.file_name}</span>
                <span className="mt-1 block text-xs text-slate-500">{(document.size_bytes / 1024 / 1024).toFixed(2)} MB · uploaded {new Date(document.created_at).toLocaleDateString()}</span>
              </a>
            )) : <p className="text-sm text-slate-500">No CV or evidence files uploaded.</p>}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-900">Work experience</h2>
          <div className="mt-5 space-y-4">
            {(workResult.data ?? []).length ? workResult.data?.map((entry) => (
              <article key={entry.id} className="border-l-2 border-teal-500 pl-4">
                <h3 className="font-bold text-slate-900">{entry.job_title} · {entry.company_name}</h3>
                <p className="mt-1 text-sm text-slate-500">{entry.location || "Location not specified"} · {entry.employment_type || "Experience"}</p>
                <p className="mt-1 text-sm text-slate-500">{entry.start_date} – {entry.is_current ? "Present" : entry.end_date || "Present"}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.description}</p>
              </article>
            )) : <p className="text-sm text-slate-500">No work experience has been added.</p>}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-900">Projects and portfolio</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {(projectResult.data ?? []).length ? projectResult.data?.map((project) => {
              const evidence = project.evidence_path ? projectFiles.get(project.evidence_path) : undefined;
              return (
                <article key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-900">{project.title}</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.description}</p>
                  {project.technologies && <p className="mt-3 text-sm text-slate-600"><strong>Technologies:</strong> {project.technologies}</p>}
                  {project.project_url && <a href={project.project_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-teal-800 underline">Open project</a>}
                  {evidence && <a href={documentUrls.get(evidence.id)} target="_blank" rel="noreferrer" className="mt-2 block text-sm font-semibold text-teal-800 underline">Open {evidence.file_name}</a>}
                </article>
              );
            }) : <p className="text-sm text-slate-500">No projects have been added.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
