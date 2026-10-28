import { HomePage } from "@/components/home-page";
import { createClient } from "@/utils/supabase/server";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6)
    .returns<Job[]>();

  return (
    <HomePage
      jobs={jobs ?? []}
      jobLoadMessage={error ? "Live jobs cannot load because the Supabase database permissions are not ready. Apply the numbered SQL migrations in supabase/migrations, then reload this page." : undefined}
    />
  );
}
