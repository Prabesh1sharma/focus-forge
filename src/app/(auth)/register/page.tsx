"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

interface FormState {
  username: string;
  displayName: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    username: "",
    displayName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<FormState & { general: string }>>({});
  const [loading, setLoading] = useState(false);

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.message || "Registration failed" });
        }
        return;
      }

      // Auto sign-in after registration
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      router.push("/onboarding");
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--surface-0)" }}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#059669" />
              <path d="M8 14L12 18L20 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontWeight: 800, fontSize: 22, color: "var(--text-primary)" }}>FocusForge</span>
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 20, marginBottom: 6 }}>
            Create your account
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Start forging your focus today</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {errors.general && (
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#f87171" }}>
                {errors.general}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group">
                <label className="label" htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  type="text"
                  className="input"
                  placeholder="Alex Johnson"
                  value={form.displayName}
                  onChange={(e) => updateField("displayName", e.target.value)}
                  required
                />
                {errors.displayName && <p className="error-text">{errors.displayName}</p>}
              </div>

              <div className="form-group">
                <label className="label" htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  className="input"
                  placeholder="alexj"
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value.toLowerCase())}
                  required
                />
                {errors.username && <p className="error-text">{errors.username}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                autoComplete="email"
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label className="label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                className="input"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                autoComplete="new-password"
              />
              {errors.password && <p className="error-text">{errors.password}</p>}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, marginTop: 4 }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, marginTop: 20 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--brand-400)", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
