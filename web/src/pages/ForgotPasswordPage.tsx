import { Mail, ArrowLeft, UtensilsCrossed, Send } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { requestPasswordReset } from "../lib/api/auth.api";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function extractErrorMessage(error: any) {
  const payloadMessage =
    typeof error?.payload === "object" && error?.payload && "message" in error.payload
      ? String((error.payload as Record<string, unknown>).message ?? "")
      : "";

  return payloadMessage || String(error?.message ?? "Unable to send reset email.");
}

export default function ForgotPasswordPage() {
  const location = useLocation();
  const prefillEmail =
    typeof (location.state as Record<string, unknown> | null)?.email === "string"
      ? String((location.state as Record<string, unknown>).email)
      : "";

  const [email, setEmail] = useState(prefillEmail);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const normalized = useMemo(() => normalizeEmail(email), [email]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isValidEmail(normalized)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const redirectTo = `${window.location.origin}/reset-password`;
      const response = await requestPasswordReset(normalized, redirectTo);
      setSuccessMsg(response.message || "Password reset email sent.");
    } catch (error: any) {
      setErrorMsg(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f3f4] px-6 py-10 text-[#1f2937]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            to="/log-in-sign-up"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#ded7d9] bg-white px-4 py-2.5 text-sm font-medium text-[#6b7280] shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#cdb8bd] hover:text-[#7b2f3b]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>

        <div className="grid min-h-[calc(100vh-150px)] place-items-center">
          <section className="w-full max-w-[540px] rounded-[28px] border border-[#e6e2e4] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8b3d4a] text-white shadow-[0_10px_20px_rgba(139,61,74,0.3)]">
              <UtensilsCrossed className="h-6 w-6" />
            </div>

            <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight text-[#1f2937]">
              Forgot Password
            </h1>
            <p className="mt-2 text-center text-sm text-[#6b7280]">
              Enter your account email. If registered, we&apos;ll send a reset link.
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <label className="block space-y-1.5">
                <div className="text-sm font-medium text-[#4b5563]">Email Address</div>
                <div className="flex items-center gap-2 rounded-xl border border-[#ddd8da] bg-white px-3 py-2.5">
                  <span className="text-[#9ca3af]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@email.com"
                    className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
                  />
                </div>
              </label>

              {errorMsg && (
                <div className="rounded-xl border border-[#ead9dd] bg-[#fff7f8] px-4 py-3 text-sm text-[#7b2f3b]">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="rounded-xl border border-[#cfe8d8] bg-[#ecfdf3] px-4 py-3 text-sm text-[#166534]">
                  {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#b46d73] to-[#923f4a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(146,63,74,0.24)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send Reset Link"}
                <Send className="h-4 w-4" />
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
