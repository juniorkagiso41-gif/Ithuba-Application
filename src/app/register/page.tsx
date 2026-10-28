import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

async function register(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "graduate");

  if (!name || !email || !password) {
    throw new Error("Please complete all fields.");
  }
  if (!["graduate", "employer", "verifier"].includes(role)) {
    throw new Error("Invalid account type.");
  }
  if (password.length < 8) {
    throw new Error("Password must contain at least 8 characters.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, role },
    },
  });

  if (error) {
    throw new Error(`Could not create the account: ${error.message}`);
  }
  if (!data.user) {
    throw new Error("Supabase did not return a user after registration.");
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-lg font-black text-white">i</div>
          <h1 className="mt-5 text-3xl font-black text-slate-900">Create your account</h1>
          <p className="mt-2 text-sm text-slate-600">We’ll email you a code to verify your address.</p>
        </div>

        <form action={register} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">Full name</label>
            <input id="name" name="name" type="text" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="Your name" />
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
            <input id="email" name="email" type="email" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="role" className="mb-2 block text-sm font-semibold text-slate-700">Account type</label>
            <select id="role" name="role" defaultValue="graduate" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white">
              <option value="graduate">Graduate</option>
              <option value="employer">Employer</option>
              <option value="verifier">Verifier</option>
            </select>
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
            <input id="password" name="password" type="password" minLength={8} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-white" placeholder="At least 8 characters" />
          </div>
          <button type="submit" className="w-full rounded-2xl bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800">
            Create account
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-800">Already have an account?</Link>
          <Link href="/" className="font-semibold text-slate-700 hover:text-slate-900">Back to home</Link>
        </div>
      </div>
    </main>
  );
}
