import type { EmailOtpType, Session } from "@supabase/supabase-js";
import { ArrowLeft, CheckCircle2, Circle, Eye, EyeOff, Lock, UtensilsCrossed } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type PasswordChecks = {
  minLength: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
  matches: boolean;
};

const EMAIL_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && EMAIL_OTP_TYPES.includes(value as EmailOtpType));
}

function evaluatePassword(password: string, confirmPassword: string): PasswordChecks {
  return {
    minLength: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    matches: password.length > 0 && password === confirmPassword,
  };
}

async function getSessionWithRetry(retries = 8, delayMs = 160): Promise<Session | null> {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) return data.session;

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}

function parseHashParams(hash: string) {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

function mapRecoveryError(code: string | null, description: string | null) {
  const normalizedCode = String(code ?? "").toLowerCase();
  const normalizedDescription = String(description ?? "").toLowerCase();

  if (normalizedCode === "otp_expired" || normalizedDescription.includes("expired")) {
    return "This reset link has expired. Please request a new password reset email.";
  }

  if (normalizedDescription.includes("invalid")) {
    return "This reset link is invalid. Please request a new password reset email.";
  }

  if (description) {
    return description;
  }

  return "Unable to validate reset link. Please request a new one.";
}

function RequirementItem(props: { ok: boolean; text: string }) {
  return (
    <li
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${
        props.ok
          ? "border-[#cfe8d8] bg-[#ecfdf3] text-[#166534]"
          : "border-[#e6e5e6] bg-[#fafafa] text-[#4b5563]"
      }`}
    >
      {props.ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Circle className="h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
      )}
      <span>{props.text}</span>
    </li>
  );
}

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [readyForReset, setReadyForReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const passwordChecks = useMemo(
    () => evaluatePassword(password, confirmPassword),
    [password, confirmPassword],
  );

  const passwordRulePass =
    passwordChecks.minLength &&
    passwordChecks.uppercase &&
    passwordChecks.number &&
    passwordChecks.special;

  const canSubmit = readyForReset && passwordRulePass && passwordChecks.matches;

  useEffect(() => {
    let alive = true;

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!alive) return;
      if (!nextSession) return;

      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED"
      ) {
        setReadyForReset(true);
        setCheckingSession(false);
        setErrorMsg(null);
      }
    });

    async function prepareRecoverySession() {
      try {
        setCheckingSession(true);
        setErrorMsg(null);

        const query = new URLSearchParams(location.search);
        const hashParams = parseHashParams(location.hash);

        const queryErrorCode = query.get("error_code");
        const hashErrorCode = hashParams.get("error_code");
        const queryErrorDescription = query.get("error_description");
        const hashErrorDescription = hashParams.get("error_description");
        const recoveryErrorCode = queryErrorCode || hashErrorCode;
        const recoveryErrorDescription = queryErrorDescription || hashErrorDescription;

        if (recoveryErrorCode || recoveryErrorDescription) {
          setReadyForReset(false);
          setErrorMsg(mapRecoveryError(recoveryErrorCode, recoveryErrorDescription));
          setCheckingSession(false);
          return;
        }

        const code = query.get("code");
        const tokenHash = query.get("token_hash") || hashParams.get("token_hash");
        const legacyToken = query.get("token") || hashParams.get("token");
        const otpType = query.get("type") || hashParams.get("type");
        const emailForOtp = query.get("email") || hashParams.get("email");
        const accessToken = hashParams.get("access_token") || query.get("access_token");
        const refreshToken = hashParams.get("refresh_token") || query.get("refresh_token");
        const hasAccessToken = Boolean(accessToken);
        const hasRefreshToken = Boolean(refreshToken);
        const hasRecoveryType = (otpType ?? "").toLowerCase() === "recovery";

        const hasRecoveryLinkIndicators =
          Boolean(code) ||
          Boolean(tokenHash) ||
          Boolean(legacyToken) ||
          hasAccessToken ||
          hasRefreshToken ||
          hasRecoveryType;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        if (tokenHash && isEmailOtpType(otpType)) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (error) throw error;
        }

        if (legacyToken && isEmailOtpType(otpType) && emailForOtp) {
          const { error } = await supabase.auth.verifyOtp({
            type: otpType,
            token: legacyToken,
            email: emailForOtp,
          });
          if (error) throw error;
        }

        if (hasAccessToken && hasRefreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: String(accessToken),
            refresh_token: String(refreshToken),
          });
          if (error) throw error;
        }

        const session = await getSessionWithRetry(
          hasRecoveryLinkIndicators ? 24 : 8,
          hasRecoveryLinkIndicators ? 220 : 120,
        );

        if (!alive) return;

        if (session) {
          setReadyForReset(true);
          setErrorMsg(null);
          return;
        }

        if (!hasRecoveryLinkIndicators) {
          setReadyForReset(false);
          setErrorMsg("Reset link is missing. Please open the reset link from your email.");
          return;
        }

        setReadyForReset(false);
        setErrorMsg("Auth session is missing. Please request a new password reset email.");
      } catch (error: any) {
        if (!alive) return;
        setReadyForReset(false);
        setErrorMsg(error?.message ?? "Unable to validate reset link.");
      } finally {
        if (alive) setCheckingSession(false);
      }
    }

    void prepareRecoverySession();

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [location.hash, location.search]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!readyForReset) {
      setErrorMsg("Reset link is not ready. Please request a new one.");
      return;
    }

    if (!passwordChecks.minLength) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (!passwordChecks.uppercase || !passwordChecks.number || !passwordChecks.special) {
      setErrorMsg(
        "Password must include at least one uppercase letter, one number, and one special character.",
      );
      return;
    }

    if (!passwordChecks.matches) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setSuccessMsg("Password updated successfully. Redirecting to sign in...");

      await supabase.auth.signOut();
      window.setTimeout(() => {
        navigate("/log-in-sign-up", { replace: true });
      }, 1200);
    } catch (error: any) {
      setErrorMsg(error?.message ?? "Unable to update password.");
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
          <section className="w-full max-w-[460px] rounded-[28px] border border-[#e6e2e4] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8b3d4a] text-white shadow-[0_10px_20px_rgba(139,61,74,0.3)]">
              <UtensilsCrossed className="h-6 w-6" />
            </div>

            <h1 className="mt-6 text-center text-4xl font-semibold tracking-tight text-[#1f2937]">
              Reset Password
            </h1>
            <p className="mt-2 text-center text-sm text-[#6b7280]">Enter your new password below.</p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <label className="block space-y-1.5">
                <div className="text-sm font-medium text-[#4b5563]">New Password</div>
                <div className="flex items-center gap-2 rounded-xl border border-[#ddd8da] bg-white px-3 py-2.5">
                  <span className="text-[#9ca3af]">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="New password"
                    className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-[#9ca3af] hover:text-[#6b7280]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <label className="block space-y-1.5">
                <div className="text-sm font-medium text-[#4b5563]">Confirm New Password</div>
                <div className="flex items-center gap-2 rounded-xl border border-[#ddd8da] bg-white px-3 py-2.5">
                  <span className="text-[#9ca3af]">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm password"
                    className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="text-[#9ca3af] hover:text-[#6b7280]"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <div className="rounded-2xl border border-[#e8d8dc] bg-[#fff9fa] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <p className="text-[11px] uppercase tracking-[0.15em] text-[#8b3d4a]">Password Requirements</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  <RequirementItem ok={passwordChecks.minLength} text="At least 6 characters" />
                  <RequirementItem ok={passwordChecks.uppercase} text="Uppercase letter" />
                  <RequirementItem ok={passwordChecks.number} text="Number" />
                  <RequirementItem ok={passwordChecks.special} text="Special character" />
                  <RequirementItem ok={passwordChecks.matches} text="Passwords match" />
                </ul>
              </div>

              {checkingSession && (
                <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-sm text-[#475467]">
                  Validating reset link...
                </div>
              )}

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

              {!readyForReset && !checkingSession && (
                <Link
                  to="/forgot-password"
                  className="block text-center text-xs font-semibold text-[#7b2f3b] hover:text-[#923f4a]"
                >
                  Request a new reset link
                </Link>
              )}

              <button
                type="submit"
                disabled={loading || checkingSession || !canSubmit}
                className="w-full rounded-xl bg-gradient-to-r from-[#b46d73] to-[#923f4a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(146,63,74,0.24)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}



