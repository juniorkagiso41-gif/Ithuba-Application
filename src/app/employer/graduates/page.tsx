import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import type { Profile, GraduateDocument } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GraduateDirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "employer") {
    redirect("/login");
  }
  const params = searchParams ? await searchParams : {};
  const requestedPage = Number(params.page ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 100;

  const supabase = await createClient();
  const { data: graduates, error: graduatesError, count } = await supabase
    .from("profiles")
    .select("id, full_name, role, headline, bio, location, skills, work_preference, education, updated_at", { count: "exact" })
    .eq("role", "graduate")
    .order("full_name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1)
    .returns<Profile[]>();
  if (graduatesError) {
    throw new Error(`Could not load graduate profiles: ${graduatesError.message}`);
  }

  const graduateIds = (graduates ?? []).map((graduate) => graduate.id);
  let cvs: GraduateDocument[] = [];
  if (graduateIds.length) {
    const { data, error } = await supabase
      .from("graduate_documents")
      .select("*")
      .eq("document_type", "cv")
      .in("graduate_id", graduateIds)
      .order("created_at", { ascending: false })
      .returns<GraduateDocument[]>();
    if (error) {
      throw new Error(`Could not load graduate CVs: ${error.message}`);
    }
    cvs = data ?? [];
  }

  const latestCv = new Map<string, GraduateDocument>();
  for (const cv of cvs) {
    if (!latestCv.has(cv.graduate_id)) latestCv.set(cv.graduate_id, cv);
  }

  const cvLinks = new Map<string, string>();
  for (const [graduateId, cv] of latestCv) {
    const { data, error } = await supabase.storage
      .from("graduate-evidence")
      .createSignedUrl(cv.storage_path, 60 * 10);
    if (error) {
      throw new Error(`Could not create an employer link for ${cv.file_name}: ${error.message}`);
    }
    cvLinks.set(graduateId, data.signedUrl);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Talent directory</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Graduate profiles</h1>
            <p className="mt-2 text-sm text-slate-600">Browse graduate experience, project evidence, skills and CVs.</p>
          </div>
          <a href="/employer" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to employer workspace</a>
        </div>

        {(graduates ?? []).length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {graduates?.map((graduate) => {
              const cv = latestCv.get(graduate.id);
              return (
                <article key={graduate.id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Graduate</p>
                  <h2 className="mt-2 text-xl font-black text-slate-900">{graduate.full_name || "Graduate"}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{graduate.headline || "Professional profile"}</p>
                  <p className="mt-2 text-sm text-slate-500">{graduate.location || "Location not provided"} · {graduate.work_preference || "Work preference not provided"}</p>
                  {graduate.education && <p className="mt-4 text-sm text-slate-700"><strong>Education:</strong> {graduate.education}</p>}
                  {graduate.skills && <p className="mt-2 text-sm text-slate-700"><strong>Skills:</strong> {graduate.skills}</p>}
                  {graduate.bio && <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">{graduate.bio}</p>}
                  <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                    <a href={`/employer/graduates/${graduate.id}`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Full profile</a>
                    {cv && <a href={cvLinks.get(graduate.id)} target="_blank" rel="noreferrer" className="rounded-full border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">View latest CV</a>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">There are no graduate profiles to show yet.</div>
        )}
        {count !== null && count !== undefined && count > pageSize && (
          <nav aria-label="Graduate directory pages" className="mt-8 flex items-center justify-center gap-4">
            {page > 1 ? <Link href={`/employer/graduates?page=${page - 1}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Previous</Link> : <span />}
            <span className="text-sm text-slate-600">Page {page} of {Math.ceil(count / pageSize)}</span>
            {page * pageSize < count ? <Link href={`/employer/graduates?page=${page + 1}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Next</Link> : <span />}
          </nav>
        )}
      </div>
    </main>
  );
}
