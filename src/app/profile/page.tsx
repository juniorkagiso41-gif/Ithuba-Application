import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import type { GraduateDocument, GraduateProject, WorkExperience } from "@/lib/types";

export const dynamic = "force-dynamic";

const evidenceBucket = "graduate-evidence";
const maximumUploadBytes = 10 * 1024 * 1024;
const allowedDocumentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const allowedCvTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getUploadedFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return value instanceof File && value.size > 0 ? value : null;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "upload";
}

async function storeDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File,
  documentType: "cv" | "project",
) {
  if (file.size > maximumUploadBytes) {
    throw new Error("Files must be 10 MB or smaller.");
  }
  if (!(documentType === "cv" ? allowedCvTypes : allowedDocumentTypes).has(file.type)) {
    throw new Error("Upload a PDF, DOC, DOCX, JPG, PNG, or WEBP file.");
  }

  const storagePath = `${userId}/${documentType}/${randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(evidenceBucket)
    .upload(storagePath, new Uint8Array(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Could not upload the file: ${uploadError.message}`);
  }

  const { error: metadataError } = await supabase.from("graduate_documents").insert({
    graduate_id: userId,
    document_type: documentType,
    file_name: file.name,
    storage_path: storagePath,
    content_type: file.type,
    size_bytes: file.size,
  });

  if (metadataError) {
    const { error: cleanupError } = await supabase.storage.from(evidenceBucket).remove([storagePath]);
    if (cleanupError) {
      throw new Error(`Could not save document details (${metadataError.message}) or clean up the uploaded file (${cleanupError.message}).`);
    }
    throw new Error(`Could not save document details: ${metadataError.message}`);
  }

  return storagePath;
}

async function updateProfile(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user || user.role !== "graduate") {
    redirect(user?.role === "employer" ? "/employer" : "/login");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({
    headline: String(formData.get("headline") ?? "").trim() || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    skills: String(formData.get("skills") ?? "").trim() || null,
    work_preference: String(formData.get("workPreference") ?? "").trim() || null,
    education: String(formData.get("education") ?? "").trim() || null,
  }).eq("id", user.id);

  if (error) {
    throw new Error(`Could not save your profile: ${error.message}`);
  }

  redirect("/profile");
}

async function uploadCv(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "graduate") {
    redirect("/login");
  }
  const file = getUploadedFile(formData, "cv");
  if (!file) {
    throw new Error("Choose a CV file to upload.");
  }

  const supabase = await createClient();
  await storeDocument(supabase, user.id, file, "cv");
  redirect("/profile");
}

async function addWorkExperience(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "graduate") {
    redirect("/login");
  }

  const companyName = String(formData.get("companyName") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isCurrent = formData.get("isCurrent") === "on";
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = isCurrent ? "" : String(formData.get("endDate") ?? "").trim();

  if (!companyName || !jobTitle || !description || !startDate) {
    throw new Error("Company, job title, start date, and description are required.");
  }
  if (endDate && endDate < startDate) {
    throw new Error("The end date must be after the start date.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("graduate_work_experience").insert({
    graduate_id: user.id,
    company_name: companyName,
    job_title: jobTitle,
    location: String(formData.get("location") ?? "").trim() || null,
    employment_type: String(formData.get("employmentType") ?? "").trim() || null,
    start_date: startDate,
    end_date: endDate || null,
    is_current: isCurrent,
    description,
  });

  if (error) {
    throw new Error(`Could not save work experience: ${error.message}`);
  }
  redirect("/profile");
}

async function addProject(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "graduate") {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const projectUrl = String(formData.get("projectUrl") ?? "").trim();
  const file = getUploadedFile(formData, "evidence");
  if (!title || !description) {
    throw new Error("Project title and description are required.");
  }
  if (projectUrl && !URL.canParse(projectUrl)) {
    throw new Error("Enter a valid project URL.");
  }

  const supabase = await createClient();
  let evidencePath: string | null = null;
  if (file) {
    evidencePath = await storeDocument(supabase, user.id, file, "project");
  }

  const { error } = await supabase.from("graduate_projects").insert({
    graduate_id: user.id,
    title,
    description,
    technologies: String(formData.get("technologies") ?? "").trim() || null,
    project_url: projectUrl || null,
    evidence_path: evidencePath,
  });

  if (error) {
    if (evidencePath) {
      const { error: cleanupError } = await supabase.storage.from(evidenceBucket).remove([evidencePath]);
      if (cleanupError) {
        throw new Error(`Could not save project (${error.message}) or clean up its evidence file (${cleanupError.message}).`);
      }
      const { error: metadataCleanupError } = await supabase
        .from("graduate_documents")
        .delete()
        .eq("graduate_id", user.id)
        .eq("storage_path", evidencePath);
      if (metadataCleanupError) {
        throw new Error(`Could not save project (${error.message}) or clean up its evidence record (${metadataCleanupError.message}).`);
      }
    }
    throw new Error(`Could not save project: ${error.message}`);
  }
  redirect("/profile");
}

async function deleteDocument(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "graduate") {
    redirect("/login");
  }
  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!documentId) {
    throw new Error("Choose a document to remove.");
  }

  const supabase = await createClient();
  const { data: document, error: lookupError } = await supabase
    .from("graduate_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("graduate_id", user.id)
    .single();
  if (lookupError) {
    throw new Error(`Could not find that document: ${lookupError.message}`);
  }

  const { error: storageError } = await supabase.storage.from(evidenceBucket).remove([document.storage_path]);
  if (storageError) {
    throw new Error(`Could not remove the file: ${storageError.message}`);
  }

  const { error: deleteError } = await supabase.from("graduate_documents").delete().eq("id", document.id);
  if (deleteError) {
    throw new Error(`The file was removed, but its record could not be deleted: ${deleteError.message}`);
  }
  redirect("/profile");
}

async function deleteWorkExperience(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "graduate") {
    redirect("/login");
  }
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Choose a work-history entry to remove.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("graduate_work_experience").delete().eq("id", id).eq("graduate_id", user.id);
  if (error) {
    throw new Error(`Could not remove work experience: ${error.message}`);
  }
  redirect("/profile");
}

async function deleteProject(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "graduate") {
    redirect("/login");
  }
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Choose a project to remove.");
  }

  const supabase = await createClient();
  const { data: project, error: lookupError } = await supabase
    .from("graduate_projects")
    .select("id, evidence_path")
    .eq("id", id)
    .eq("graduate_id", user.id)
    .single();
  if (lookupError) {
    throw new Error(`Could not find that project: ${lookupError.message}`);
  }

  if (project.evidence_path) {
    const { error: storageError } = await supabase.storage.from(evidenceBucket).remove([project.evidence_path]);
    if (storageError) {
      throw new Error(`Could not remove the project evidence file: ${storageError.message}`);
    }

    const { error: documentError } = await supabase
      .from("graduate_documents")
      .delete()
      .eq("graduate_id", user.id)
      .eq("storage_path", project.evidence_path);
    if (documentError) {
      throw new Error(`The evidence file was removed, but its record could not be deleted: ${documentError.message}`);
    }
  }

  const { error } = await supabase.from("graduate_projects").delete().eq("id", id).eq("graduate_id", user.id);
  if (error) {
    throw new Error(`Could not remove project: ${error.message}`);
  }
  redirect("/profile");
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "graduate") {
    redirect(user?.role === "employer" ? "/employer" : "/login");
  }

  const supabase = await createClient();
  const [profileResult, workResult, projectResult, documentResult] = await Promise.all([
    supabase.from("profiles").select("headline, bio, location, skills, work_preference, education").eq("id", user.id).single(),
    supabase.from("graduate_work_experience").select("*").eq("graduate_id", user.id).order("start_date", { ascending: false }).returns<WorkExperience[]>(),
    supabase.from("graduate_projects").select("*").eq("graduate_id", user.id).order("created_at", { ascending: false }).returns<GraduateProject[]>(),
    supabase.from("graduate_documents").select("*").eq("graduate_id", user.id).order("created_at", { ascending: false }).returns<GraduateDocument[]>(),
  ]);
  if (profileResult.error) throw new Error(`Could not load your profile: ${profileResult.error.message}`);
  if (workResult.error) throw new Error(`Could not load work history: ${workResult.error.message}`);
  if (projectResult.error) throw new Error(`Could not load projects: ${projectResult.error.message}`);
  if (documentResult.error) throw new Error(`Could not load uploaded documents: ${documentResult.error.message}`);

  const documents = documentResult.data ?? [];
  const signedUrls = new Map<string, string>();
  for (const document of documents) {
    const { data, error } = await supabase.storage.from(evidenceBucket).createSignedUrl(document.storage_path, 60 * 10);
    if (error) {
      throw new Error(`Could not create a link for ${document.file_name}: ${error.message}`);
    }
    signedUrls.set(document.id, data.signedUrl);
  }

  const profile = profileResult.data;
  const workHistory = workResult.data ?? [];
  const projects = projectResult.data ?? [];
  const cvs = documents.filter((document) => document.document_type === "cv");
  const projectDocuments = documents.filter((document) => document.document_type === "project");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Graduate profile</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Your experience and evidence</h1>
              <p className="mt-2 text-sm text-slate-600">Employers can view your graduate profile, work history, projects and CV.</p>
            </div>
            <a href="/dashboard" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300">Back to dashboard</a>
          </div>

          <form action={updateProfile} className="space-y-5">
            <div>
              <label htmlFor="headline" className="mb-2 block text-sm font-semibold text-slate-700">Professional headline</label>
              <input id="headline" name="headline" defaultValue={profile.headline ?? ""} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="Junior software engineer focused on product and data work" />
            </div>

            <div>
              <label htmlFor="bio" className="mb-2 block text-sm font-semibold text-slate-700">Professional summary</label>
              <textarea id="bio" name="bio" rows={4} defaultValue={profile.bio ?? ""} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="Describe your strengths, interests and practical experience." />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="location" className="mb-2 block text-sm font-semibold text-slate-700">Location</label>
                <input id="location" name="location" defaultValue={profile.location ?? ""} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="Johannesburg, South Africa" />
              </div>
              <div>
                <label htmlFor="workPreference" className="mb-2 block text-sm font-semibold text-slate-700">Work preference</label>
                <select id="workPreference" name="workPreference" defaultValue={profile.work_preference ?? "Hybrid"} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white">
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                  <option value="Open to all">Open to all</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="skills" className="mb-2 block text-sm font-semibold text-slate-700">Skills</label>
              <input id="skills" name="skills" defaultValue={profile.skills ?? ""} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="TypeScript, SQL, UX research, stakeholder communication" />
            </div>

            <div>
              <label htmlFor="education" className="mb-2 block text-sm font-semibold text-slate-700">Education and qualifications</label>
              <input id="education" name="education" defaultValue={profile.education ?? ""} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="BSc Information Systems, University of Cape Town" />
            </div>

            <button type="submit" className="w-full rounded-2xl bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800">Save profile</button>
          </form>
        </div>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-900">CV / résumé</h2>
          <p className="mt-2 text-sm text-slate-600">PDF, DOC, or DOCX up to 10 MB. Your CV is kept in private storage and shared with verified employer accounts.</p>
          <form action={uploadCv} encType="multipart/form-data" className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input name="cv" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
            <button type="submit" className="shrink-0 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800">Upload CV</button>
          </form>
          <div className="mt-5 space-y-3">
            {cvs.length ? cvs.map((cv) => (
              <div key={cv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <a href={signedUrls.get(cv.id)} target="_blank" rel="noreferrer" className="font-semibold text-teal-800 underline">{cv.file_name}</a>
                  <p className="mt-1 text-xs text-slate-500">Uploaded {new Date(cv.created_at).toLocaleDateString()}</p>
                </div>
                <form action={deleteDocument}>
                  <input type="hidden" name="documentId" value={cv.id} />
                  <button type="submit" className="text-sm font-semibold text-rose-700 hover:text-rose-800">Remove</button>
                </form>
              </div>
            )) : <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No CV uploaded yet.</p>}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-900">Work experience</h2>
          <form action={addWorkExperience} className="mt-5 grid gap-4 md:grid-cols-2">
            <input name="jobTitle" required placeholder="Job title" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <input name="companyName" required placeholder="Company / organisation" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <input name="location" placeholder="Location" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <select name="employmentType" defaultValue="" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <option value="">Employment type</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Volunteer</option>
            </select>
            <label className="text-sm text-slate-700">Start date<input name="startDate" type="date" required className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
            <label className="text-sm text-slate-700">End date<input name="endDate" type="date" className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2"><input name="isCurrent" type="checkbox" className="h-4 w-4" /> I currently work here</label>
            <textarea name="description" rows={3} required placeholder="Responsibilities, achievements and skills used" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2" />
            <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 md:col-span-2">Add work experience</button>
          </form>
          <div className="mt-6 space-y-3">
            {workHistory.length ? workHistory.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div><h3 className="font-bold text-slate-900">{entry.job_title} · {entry.company_name}</h3><p className="text-sm text-slate-500">{entry.location || "Location not specified"} · {entry.employment_type || "Experience"}</p></div>
                  <form action={deleteWorkExperience}><input type="hidden" name="id" value={entry.id} /><button className="text-sm font-semibold text-rose-700">Remove</button></form>
                </div>
                <p className="mt-2 text-sm text-slate-600">{entry.start_date} – {entry.is_current ? "Present" : entry.end_date || "Present"}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.description}</p>
              </article>
            )) : <p className="text-sm text-slate-500">Add your employment, internship, volunteering, or practical experience.</p>}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-slate-900">Projects and portfolio</h2>
          <form action={addProject} encType="multipart/form-data" className="mt-5 grid gap-4">
            <input name="title" required placeholder="Project name" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <textarea name="description" rows={3} required placeholder="What did you build or contribute? Include outcomes and your role." className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <input name="technologies" placeholder="Technologies / skills used" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <input name="projectUrl" type="url" placeholder="Project, portfolio, or repository URL (optional)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            <label className="text-sm font-semibold text-slate-700">Project evidence (optional, max 10 MB)
              <input name="evidence" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp" className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal" />
            </label>
            <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700">Add project</button>
          </form>
          <div className="mt-6 space-y-3">
            {projects.length ? projects.map((project) => {
              const evidence = projectDocuments.find((document) => document.storage_path === project.evidence_path);
              return (
                <article key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex justify-between gap-3">
                    <h3 className="font-bold text-slate-900">{project.title}</h3>
                    <form action={deleteProject}><input type="hidden" name="id" value={project.id} /><button className="text-sm font-semibold text-rose-700">Remove</button></form>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.description}</p>
                  {project.technologies && <p className="mt-2 text-sm text-slate-600"><strong>Skills:</strong> {project.technologies}</p>}
                  {project.project_url && <a href={project.project_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-teal-800 underline">View project</a>}
                  {evidence && <a href={signedUrls.get(evidence.id)} target="_blank" rel="noreferrer" className="mt-2 block text-sm font-semibold text-teal-800 underline">Open {evidence.file_name}</a>}
                </article>
              );
            }) : <p className="text-sm text-slate-500">Share school, personal, freelance, and community projects.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
