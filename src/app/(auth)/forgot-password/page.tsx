"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // In production this would call /api/auth/forgot-password
    // For now we just show the confirmation message
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--surface-0)" }}
    >
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#059669" />
              <path
                d="M8 14L12 18L20 10"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontWeight: 800,
                fontSize: 22,
                color: "var(--text-primary)",
              }}
            >
              FocusForge
            </span>
          </Link>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {submitted ? (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "rgba(16,185,129,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <Mail size={24} color="var(--brand-400)" />
              </div>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                Check your email
              </h1>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                If an account with{" "}
                <strong style={{ color: "var(--text-secondary)" }}>
                  {email}
                </strong>{" "}
                exists, we&apos;ll send a password reset link.
              </p>
              <Link
                href="/login"
                className="btn-primary"
                style={{
                  display: "inline-flex",
                  marginTop: 24,
                  justifyContent: "center",
                }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                Forgot your password?
              </h1>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 14,
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div className="form-group">
                  <label className="label" htmlFor="forgot-email">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "12px",
                  }}
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>

        <Link
          href="/login"
          className="btn-ghost"
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 16,
            fontSize: 13,
          }}
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
