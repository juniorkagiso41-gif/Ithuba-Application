import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

async function verifyEmail(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();

  if (!email || !/^\d{6}$/.test(code)) {
    throw new Error("Enter your email address and the 6-digit code.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "signup",
  });

  if (error) {
    throw new Error(`Could not verify this email: ${error.message}`);
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error(`Email confirmed, but the new session could not be loaded: ${authError?.message ?? "No user session was returned."}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profileError) {
    throw new Error(`Email confirmed, but the account profile could not be loaded: ${profileError.message}`);
  }

  redirect(profile.role === "employer" ? "/employer" : "/dashboard");
}

async function resendCode(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    throw new Error("Enter your email address to request another code.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) {
    throw new Error(`Could not resend the verification code: ${error.message}`);
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}&resent=1`);
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string; resent?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const email = params.email ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-lg font-black text-white">i</div>
          <h1 className="mt-5 text-3xl font-black text-slate-900">Verify your email</h1>
          <p className="mt-2 text-sm text-slate-600">
            {params.resent ? "A new code has been requested." : "Enter the 6-digit code Supabase emailed to you."}
          </p>
        </div>

        <form action={verifyEmail} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
            <input id="email" name="email" type="email" required defaultValue={email} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="code" className="mb-2 block text-sm font-semibold text-slate-700">Verification code</label>
            <input id="code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="123456" />
          </div>
          <button type="submit" className="w-full rounded-2xl bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800">
            Confirm email
          </button>
        </form>

        <form action={resendCode} className="mt-4">
          <input type="hidden" name="email" value={email} />
          <button type="submit" disabled={!email} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50">
            Resend code
          </button>
        </form>
      </div>
    </main>
  );
}
