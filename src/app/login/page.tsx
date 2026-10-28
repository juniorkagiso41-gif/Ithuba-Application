import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      redirect(`/verify-email?email=${encodeURIComponent(email)}`);
    }
    throw new Error(`Could not sign in: ${error.message}`);
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Your email address must be confirmed before signing in.");
  }

  redirect(user.role === "employer" ? "/employer" : "/dashboard");
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-lg font-black text-white">i</div>
          <h1 className="mt-5 text-3xl font-black text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to continue your graduate journey.</p>
        </div>

        <form action={login} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
            <input id="email" name="email" type="email" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
            <input id="password" name="password" type="password" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full rounded-2xl bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800">
            Sign in
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <Link href="/register" className="font-semibold text-teal-700 hover:text-teal-800">Create account</Link>
          <Link href="/" className="font-semibold text-slate-700 hover:text-slate-900">Back to home</Link>
        </div>
      </div>
    </main>
  );
}
