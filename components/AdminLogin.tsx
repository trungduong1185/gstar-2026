"use client";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { withBasePath } from "@/lib/base-path";

export function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(withBasePath("/api/auth/login"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace(params.get("next")?.startsWith("/dashboard") ? params.get("next")! : "/dashboard");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sign in."); setLoading(false); }
  }
  return <main className="admin-login"><section className="admin-login__panel"><div className="admin-login__brand"><span className="admin-login__logo"><img src={withBasePath("/static/img/logo-nti-white.svg")} alt="New Turing Institute"/></span><span>Program administration</span></div><div className="admin-login__heading"><span>Restricted access</span><h1>Sign in to Admin</h1><p>Manage applications, acquisition reporting and program configuration.</p></div><form onSubmit={submit}><label>Username<input name="username" required autoComplete="username" autoFocus /></label><label>Password<input name="password" type="password" required autoComplete="current-password" /></label>{error && <p role="alert">{error}</p>}<button disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form><a href={withBasePath("/")}>← Return to GStar website</a></section><aside><span>GStar 2026 operations</span><h2>One workspace for the full admissions cycle.</h2><ul><li>Review applicant pipeline</li><li>Track UTM campaign quality</li><li>Control deadlines and integrations</li></ul></aside></main>;
}
