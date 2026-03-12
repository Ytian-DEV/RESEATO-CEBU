import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle2, Circle, UtensilsCrossed, Check, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

type Mode = "login" | "signup";
type Role = "customer" | "vendor";

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

function getStrengthLabel(score: number) {
  if (score <= 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  return "Strong";
}

function getStrengthBarClass(score: number) {
  if (score <= 1) return "bg-red-500";
  if (score === 2) return "bg-amber-500";
  if (score === 3) return "bg-yellow-400";
  return "bg-emerald-500";
}

function getStrengthTextClass(score: number) {
  if (score <= 1) return "text-[#be123c]";
  if (score === 2) return "text-[#b45309]";
  if (score === 3) return "text-[#a16207]";
  return "text-[#166534]";
}

function getStrengthBadgeClass(score: number) {
  if (score <= 1) return "border-[#f5c2c7] bg-[#fff1f2] text-[#be123c]";
  if (score === 2) return "border-[#f8d9a5] bg-[#fff7ed] text-[#b45309]";
  if (score === 3) return "border-[#f6e2b3] bg-[#fffbeb] text-[#a16207]";
  return "border-[#b7e4c7] bg-[#ecfdf3] text-[#166534]";
}

function getStrengthSegmentClass(score: number, step: number) {
  if (score < step) return "border border-[#e5e7eb] bg-[#f3f4f6]";
  if (score <= 1) return "bg-[#e11d48]";
  if (score === 2) return "bg-[#d97706]";
  if (score === 3) return "bg-[#b45309]";
  return "bg-[#16a34a]";
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

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const redirectTo = (location.state as any)?.from ?? "/restaurants";
  const authRedirectUrl = `${window.location.origin}/log-in-sign-up`;

  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("customer");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [signupConfirmationEmail, setSignupConfirmationEmail] = useState<string | null>(null);
  const [lastAuthEmail, setLastAuthEmail] = useState("");
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [confirmationCardMsg, setConfirmationCardMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleAuthCallback() {
      const query = new URLSearchParams(location.search);
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const otpType = query.get("type");
      const errorDescription = query.get("error_description");

      if (errorDescription) {
        const decodedError = decodeURIComponent(errorDescription.replace(/\+/g, " "));
        if (!cancelled) setMsg(decodedError);
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;

        if (error) {
          setMsg(error.message || "Failed to complete email verification.");
          return;
        }

        if (data.session) {
          navigate(redirectTo, { replace: true });
          return;
        }
      }

      if (tokenHash && isEmailOtpType(otpType)) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });

        if (cancelled) return;

        if (error) {
          setMsg(error.message || "Verification link is invalid or expired.");
          return;
        }

        if (data.session) {
          navigate(redirectTo, { replace: true });
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionData.session) {
          navigate(redirectTo, { replace: true });
          return;
        }

        setMode("login");
        setMsg("Email confirmed. Please sign in.");
        return;
      }

      if (location.hash.includes("access_token=")) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionData.session) {
          navigate(redirectTo, { replace: true });
        }
      }
    }

    void handleAuthCallback();

    return () => {
      cancelled = true;
    };
  }, [location.hash, location.search, navigate, redirectTo]);

  const passwordChecks = useMemo(
    () => evaluatePassword(password, confirmPassword),
    [password, confirmPassword],
  );

  const passwordRulePass = useMemo(
    () => passwordChecks.uppercase && passwordChecks.number && passwordChecks.special,
    [passwordChecks],
  );

  const passwordStrengthScore = useMemo(() => {
    let score = 0;
    if (passwordChecks.minLength) score += 1;
    if (passwordChecks.uppercase) score += 1;
    if (passwordChecks.number) score += 1;
    if (passwordChecks.special) score += 1;
    return score;
  }, [passwordChecks]);

  const passwordStrengthPercent = (passwordStrengthScore / 4) * 100;
  const passwordStrengthLabel = getStrengthLabel(passwordStrengthScore);
  const passwordStrengthBarClass = getStrengthBarClass(passwordStrengthScore);

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    if (!agreed) return false;

    if (mode === "signup") {
      if (!firstName || !lastName) return false;
      if (!passwordChecks.minLength) return false;
      if (!passwordRulePass) return false;
      if (!passwordChecks.matches) return false;
    }

    return true;
  }, [
    email,
    password,
    agreed,
    mode,
    firstName,
    lastName,
    passwordChecks,
    passwordRulePass,
  ]);

  function parseAuthError(error: any, fallback: string) {
    const message = String(error?.message ?? fallback);
    const lower = message.toLowerCase();
    const status = typeof error?.status === "number" ? error.status : null;
    return { message, lower, status };
  }

  function setResendMessage(surface: "form" | "card", text: string) {
    if (surface === "card") {
      setConfirmationCardMsg(text);
      return;
    }
    setMsg(text);
  }

  async function resendConfirmationEmail(
    emailToSend: string,
    surface: "form" | "card" = "form",
  ): Promise<boolean> {
    const targetEmail = emailToSend.trim();
    if (!targetEmail) {
      setResendMessage(surface, "Enter your email first so we can resend the confirmation link.");
      return false;
    }

    setResendingConfirmation(true);
    if (surface === "card") {
      setConfirmationCardMsg(null);
    } else {
      setMsg(null);
    }

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: { emailRedirectTo: authRedirectUrl },
      });

      if (error) throw error;

      setShowResendConfirmation(false);
      setResendMessage(surface, "Confirmation email sent. Please check inbox and spam.");
      return true;
    } catch (err: any) {
      const parsed = parseAuthError(err, "Unable to resend confirmation email.");

      if (parsed.lower.includes("rate limit")) {
        setResendMessage(
          surface,
          "Too many confirmation emails were sent recently. Please wait about a minute and retry.",
        );
      } else if (parsed.lower.includes("error sending confirmation email")) {
        setResendMessage(
          surface,
          "SMTP delivery failed. Check Supabase SMTP sender address, username, and app password, then retry.",
        );
      } else {
        const statusText = parsed.status ? ` (HTTP ${parsed.status})` : "";
        setResendMessage(surface, `${parsed.message}${statusText}`);
      }

      setShowResendConfirmation(true);
      return false;
    } finally {
      setResendingConfirmation(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setShowResendConfirmation(false);

    if (!canSubmit) {
      if (mode === "signup" && !passwordRulePass) {
        setMsg(
          "Password must include at least one uppercase letter, one number, and one special character.",
        );
      } else {
        setMsg("Please complete the form properly.");
      }
      return;
    }

    const cleanEmail = email.trim();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanPhone = phone.trim();
    const fullName = `${cleanFirstName} ${cleanLastName}`.trim();

    setLastAuthEmail(cleanEmail);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        setMsg("Logged in!");
        setShowResendConfirmation(false);
        navigate(redirectTo, { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: authRedirectUrl,
            data: {
              first_name: cleanFirstName,
              last_name: cleanLastName,
              full_name: fullName,
              phone: cleanPhone,
              role,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setMsg("Account created. You are now logged in.");
          setShowResendConfirmation(false);
          navigate(redirectTo, { replace: true });
          return;
        }

        const identities = data.user?.identities ?? [];
        if (Array.isArray(identities) && identities.length === 0) {
          setMode("login");
          setMsg("This email is already registered. If not confirmed yet, resend the confirmation email below.");
          setShowResendConfirmation(true);
          return;
        }

        setMsg(null);
        setConfirmationCardMsg(null);
        setShowResendConfirmation(false);
        setSignupConfirmationEmail(cleanEmail);
      }
    } catch (err: any) {
      const parsed = parseAuthError(err, "Auth failed");

      if (parsed.lower.includes("email not confirmed")) {
        setMsg("Email not confirmed yet. Check your inbox, or resend the confirmation link below.");
        setShowResendConfirmation(true);
      } else if (parsed.lower.includes("rate limit")) {
        setMsg("Too many email requests. Please wait about a minute before requesting another email.");
        setShowResendConfirmation(true);
      } else if (parsed.lower.includes("error sending confirmation email")) {
        const resent = await resendConfirmationEmail(cleanEmail, "form");
        if (!resent) {
          setShowResendConfirmation(true);
        }
      } else if (parsed.lower.includes("user already registered")) {
        setMsg("This email is already registered. If not confirmed yet, resend the confirmation email below.");
        setShowResendConfirmation(true);
      } else {
        const statusText = parsed.status ? ` (HTTP ${parsed.status})` : "";
        setMsg(`${parsed.message}${statusText}`);
      }
    } finally {
      setLoading(false);
    }
  }

  if (signupConfirmationEmail) {
    return (
      <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#f2f2f5] px-6 py-10">
        <div className="mx-auto mb-6 flex max-w-6xl justify-start">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-[#ded7d9] bg-white px-4 py-2.5 text-sm font-medium text-[#6b7280] shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#cdb8bd] hover:text-[#7b2f3b]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="mx-auto grid min-h-full max-w-6xl place-items-center">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="w-full max-w-[520px] rounded-[28px] border border-black/5 bg-white px-8 py-9 text-center shadow-[0_28px_60px_rgba(15,23,42,0.14)]"
          >
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#d8f3df] text-[#169c46]">
              <Mail className="h-11 w-11" />
            </div>
            <h1 className="mt-7 text-[34px] font-semibold tracking-tight text-[#1c2233] sm:text-[40px]">
              Confirm your registration
            </h1>

            <p className="mx-auto mt-4 max-w-[410px] text-[21px] leading-tight text-[#4f5870]">
              We&apos;ve sent a confirmation link to
            </p>
            <p className="mx-auto mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-1 text-[clamp(17px,2.4vw,27px)] font-semibold leading-tight text-[#111827]">
              {signupConfirmationEmail}
            </p>
            <p className="mx-auto mt-2 max-w-[430px] text-[21px] leading-tight text-[#4f5870]">
              Please check your email and click the link to activate your account.
            </p>

            {confirmationCardMsg && (
              <div className="mx-auto mt-4 max-w-[430px] rounded-xl border border-black/10 bg-[#f8fafc] px-4 py-3 text-sm text-[#334155]">
                {confirmationCardMsg}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                void resendConfirmationEmail(signupConfirmationEmail, "card");
              }}
              disabled={resendingConfirmation}
              className="mt-5 w-full rounded-2xl border border-[#d6dbe6] bg-white px-4 py-3 text-[18px] font-semibold text-[#334155] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendingConfirmation ? "Sending..." : "Resend Email"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSignupConfirmationEmail(null);
                setMode("login");
                setPassword("");
                setConfirmPassword("");
                setMsg(null);
                setConfirmationCardMsg(null);
                setShowResendConfirmation(false);
              }}
              className="mt-8 w-full rounded-2xl bg-gradient-to-r from-[#b46d73] to-[#923f4a] px-4 py-3.5 text-[22px] font-semibold text-white shadow-[0_12px_24px_rgba(146,63,74,0.35)] transition-transform hover:scale-[1.01] hover:brightness-105"
            >
              Back to Sign In
            </button>

            <p className="mx-auto mt-5 max-w-[430px] text-[16px] leading-snug text-[#7c8599]">
              Didn&apos;t receive the email? Check your spam folder or try registering again.
            </p>
          </motion.section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f3f4] px-6 py-10 text-[#1f2937]">
      <div className="mx-auto max-w-6xl">
        <div className="relative min-h-[calc(100vh-80px)] py-6">
          <div className="absolute left-0 top-0 z-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#ded7d9] bg-white px-4 py-2.5 text-sm font-medium text-[#6b7280] shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#cdb8bd] hover:text-[#7b2f3b]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>

          <div
            className={`grid min-h-[calc(100vh-80px)] w-full gap-10 pt-14 md:grid-cols-2 ${
              mode === "signup" ? "md:items-start" : "md:items-center"
            }`}
          >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className={`hidden md:block ${mode === "signup" ? "md:flex md:h-[78vh] md:items-center" : ""}`}
        >
          <div className="space-y-6">
            <div className="shrink-0">
              <Link to="/" className="group flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8b3d4a] shadow-sm shadow-[#e8ccd1] transition-all duration-300 group-hover:bg-[#7b2f3b]">
                  <UtensilsCrossed className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-bold tracking-tight text-neutral-900">RESEATO</span>
              </Link>
            </div>

            <div className="rounded-[24px] border border-[#e8e2e3] bg-white/85 p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="text-xl font-semibold">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </div>
              <p className="mt-3 text-[18px] text-[#5b6374]">
                {mode === "login"
                  ? "Sign in to manage reservations and book faster."
                  : "Sign up to reserve tables, track bookings, and access exclusive features."}
              </p>

              <ul className="mt-7 space-y-3 text-[#1f2937]">
                <li className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f8ecee] text-[#7b2f3b]"><Check className="h-4 w-4" /></span><span className="text-lg">Reserve tables in seconds</span></li>
                <li className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f8ecee] text-[#7b2f3b]"><Check className="h-4 w-4" /></span><span className="text-lg">Skip the waiting lines</span></li>
                <li className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f8ecee] text-[#7b2f3b]"><Check className="h-4 w-4" /></span><span className="text-lg">Manage all your bookings</span></li>
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className={`rounded-[24px] border border-[#e6e2e4] bg-white p-6 md:p-10 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ${
              mode === "signup" ? "md:h-[78vh] md:overflow-y-auto" : ""
            }`}
          >
            <div className="flex rounded-2xl border border-[#dccfd2] bg-[#f6edef] p-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMsg(null);
                  setShowResendConfirmation(false);
                }}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === "login"
                    ? "bg-[#8b3d4a] text-white shadow-[0_8px_16px_rgba(139,61,74,0.28)]"
                    : "text-[#7b2f3b] hover:bg-[#f3e6e9]"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setMsg(null);
                  setShowResendConfirmation(false);
                }}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === "signup"
                    ? "bg-[#8b3d4a] text-white shadow-[0_8px_16px_rgba(139,61,74,0.28)]"
                    : "text-[#7b2f3b] hover:bg-[#f3e6e9]"
                }`}
              >
                Sign up
              </button>
            </div>

            <div className="mt-6">
              <h1 className="text-2xl font-semibold">{mode === "login" ? "Sign in" : "Create account"}</h1>
              <p className="mt-1 text-sm text-[#6b7280]">
                {mode === "login"
                  ? "Enter your credentials to continue."
                  : "Fill up the form to register."}
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("customer")}
                      className={`rounded-xl border px-4 py-3 text-left ${
                        role === "customer"
                          ? "border-[#c98d98] bg-[#f8ecee]"
                          : "border-[#e3dde0] bg-white hover:bg-[#faf6f7]"
                      }`}
                    >
                      <div className="text-sm font-medium">Customer</div>
                      <div className="text-xs text-[#6b7280]">Reserve tables</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("vendor")}
                      className={`rounded-xl border px-4 py-3 text-left ${
                        role === "vendor"
                          ? "border-[#c98d98] bg-[#f8ecee]"
                          : "border-[#e3dde0] bg-white hover:bg-[#faf6f7]"
                      }`}
                    >
                      <div className="text-sm font-medium">Restaurant Owner</div>
                      <div className="text-xs text-[#6b7280]">Manage bookings</div>
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="First Name"
                      icon={<User className="h-4 w-4" />}
                      value={firstName}
                      onChange={setFirstName}
                      placeholder="Christian"
                    />
                    <Field
                      label="Last Name"
                      icon={<User className="h-4 w-4" />}
                      value={lastName}
                      onChange={setLastName}
                      placeholder="Boyles"
                    />
                  </div>

                  <Field
                    label="Phone (optional)"
                    icon={<Phone className="h-4 w-4" />}
                    value={phone}
                    onChange={setPhone}
                    placeholder="09xxxxxxxxx"
                  />
                </>
              )}

              <Field
                label="Email"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={setEmail}
                placeholder="you@email.com"
                type="email"
              />

              <PasswordField
                label="Password"
                icon={<Lock className="h-4 w-4" />}
                value={password}
                onChange={setPassword}
                show={showPassword}
                toggleShow={() => setShowPassword((s) => !s)}
              />

              {mode === "signup" && (
                <>
                  <PasswordField
                    label="Confirm Password"
                    icon={<Lock className="h-4 w-4" />}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showPassword}
                    toggleShow={() => setShowPassword((s) => !s)}
                  />

                  <div className="rounded-2xl border border-[#e8d8dc] bg-[#fff9fa] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.15em] text-[#8b3d4a]">Password Health</p>
                        <p className={`text-sm font-semibold ${getStrengthTextClass(passwordStrengthScore)}`}>
                          {passwordStrengthLabel}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStrengthBadgeClass(passwordStrengthScore)}`}
                      >
                        {passwordStrengthScore}/4 rules
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className={`h-2 rounded-full transition-colors duration-300 ${getStrengthSegmentClass(passwordStrengthScore, step)}`}
                        />
                      ))}
                    </div>

                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#ede7e8]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${passwordStrengthBarClass}`}
                        style={{ width: `${passwordStrengthPercent}%` }}
                      />
                    </div>

                    <div className="mt-2 text-[11px] text-[#6b7280]">
                      Requires uppercase, number, and special character to enable signup.
                    </div>

                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      <RequirementItem ok={passwordChecks.uppercase} text="Uppercase letter" />
                      <RequirementItem ok={passwordChecks.number} text="Number" />
                      <RequirementItem ok={passwordChecks.special} text="Special character" />
                      <RequirementItem ok={passwordChecks.minLength} text="At least 6 characters" />
                      <RequirementItem ok={passwordChecks.matches} text="Passwords match" />
                    </ul>

                    <div className="mt-2 text-[11px] text-[#8b97a8]">
                      {passwordStrengthPercent.toFixed(0)}% strength
                    </div>
                  </div>
                </>
              )}

              <label className="flex items-start gap-3 text-sm text-[#4b5563]">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#d6c8cc] bg-white text-[#8b3d4a]"
                />
                <span>
                  I agree to the <span className="underline">Terms and Conditions</span>.
                </span>
              </label>

              {msg && (
                <div className="rounded-xl border border-[#ead9dd] bg-[#fff7f8] px-4 py-3 text-sm text-[#7b2f3b]">
                  {msg}
                </div>
              )}

              {showResendConfirmation && (
                <div className="rounded-xl border border-[#ead9dd] bg-[#fff7f8] px-4 py-3">
                  <div className="text-xs text-[#6b7280]">
                    Need another confirmation email for
                    <span className="ml-1 font-medium text-[#111827]">
                      {(email.trim() || lastAuthEmail || "your account")}
                    </span>
                    ?
                  </div>
                  <button
                    type="button"
                    onClick={() => resendConfirmationEmail(email.trim() || lastAuthEmail)}
                    disabled={loading || resendingConfirmation}
                    className="mt-2 rounded-lg border border-[#d6c8cc] bg-white px-3 py-1.5 text-xs font-medium text-[#7b2f3b] hover:bg-[#fdf3f5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resendingConfirmation ? "Sending..." : "Resend confirmation email"}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#b46d73] to-[#923f4a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(146,63,74,0.24)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
              </button>
            </form>
          </div>
        </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block space-y-1">
      <div className="text-sm text-[#4b5563]">{props.label}</div>
      <div className="auth-field flex items-center gap-2 rounded-xl border border-[#ddd8da] bg-white px-3 py-2.5">
        <span className="text-[#9ca3af]">{props.icon}</span>
        <input
          type={props.type ?? "text"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className="auth-input w-full bg-transparent text-sm text-[#111827] placeholder:text-[#9ca3af]"
        />
      </div>
    </label>
  );
}

function PasswordField(props: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggleShow: () => void;
}) {
  return (
    <label className="block space-y-1">
      <div className="text-sm text-[#4b5563]">{props.label}</div>
      <div className="auth-field flex items-center gap-2 rounded-xl border border-[#ddd8da] bg-white px-3 py-2.5">
        <span className="text-[#9ca3af]">{props.icon}</span>
        <input
          type={props.show ? "text" : "password"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className="auth-input w-full bg-transparent text-sm text-[#111827] placeholder:text-[#9ca3af]"
          placeholder="********"
        />
        <button
          type="button"
          onClick={props.toggleShow}
          className="text-[#9ca3af] hover:text-[#6b7280]"
        >
          {props.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
















