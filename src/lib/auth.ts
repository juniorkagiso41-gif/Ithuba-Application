import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { UserRole } from "@/lib/types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    if (authError.name === "AuthSessionMissingError") {
      return null;
    }
    throw new Error(`Could not load the signed-in user: ${authError.message}`);
  }
  if (!authUser) {
    return null;
  }
  if (!authUser.email_confirmed_at) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", authUser.id)
    .single();

  if (profileError) {
    throw new Error(`Could not load the user's profile: ${profileError.message}`);
  }

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name: profile.full_name,
    role: profile.role as UserRole,
    email_verified: true,
  };
}

export async function requireVerifiedUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function isSignedIn() {
  return (await getCurrentUser()) !== null;
}
