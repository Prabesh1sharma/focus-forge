"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--surface-0)" }}>
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
            Welcome back
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Sign in to continue your focus journey</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {error && (
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#f87171" }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label className="label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--brand-400)", textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15 }}
            >
              {loading ? (
                <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              ) : null}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, marginTop: 20 }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "var(--brand-400)", fontWeight: 600, textDecoration: "none" }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
