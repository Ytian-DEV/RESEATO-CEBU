import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

type Mode = "login" | "signup";
type Role = "customer" | "vendor"; // UI only for now

export default function AuthPage() {
  const location = useLocation();
  const redirectTo = (location.state as any)?.from ?? "/restaurants";

  const navigate = useNavigate();

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
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    if (!agreed) return false;
    if (mode === "signup") {
      if (!firstName || !lastName) return false;
      if (password !== confirmPassword) return false;
      if (password.length < 6) return false;
    }
    return true;
  }, [email, password, agreed, mode, firstName, lastName, confirmPassword]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!canSubmit) {
      setMsg("Please complete the form properly.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMsg("Logged in!");
        navigate(redirectTo, { replace: true });
      } else {
        // Signup
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone,
              role, // UI only now; later we’ll sync to profiles table
            },
          },
        });

        if (error) throw error;

        setMsg(
          "Account created! If email confirmation is enabled, check your inbox.",
        );
        // optional: switch to login mode
        setMode("login");
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-neutral-950 text-neutral-100 px-6 py-10">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
        {/* Left branding */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden md:block"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[rgba(127,58,65,0.25)] grid place-items-center">
                <span className="text-lg font-semibold">R</span>
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-wide">
                  RESEATO
                </div>
                <div className="text-sm text-neutral-300">
                  Reserve smarter. Dine easier.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] p-6">
              <div className="text-xl font-semibold">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </div>
              <p className="mt-2 text-neutral-300">
                {mode === "login"
                  ? "Sign in to manage reservations and book faster."
                  : "Sign up to reserve tables, track bookings, and access exclusive features."}
              </p>

              <ul className="mt-5 space-y-2 text-sm text-neutral-300">
                <li>• Reserve tables in seconds</li>
                <li>• Skip waiting lines</li>
                <li>• Manage bookings in one place</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Right form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="rounded-2xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] p-6 md:p-10">
            {/* Toggle */}
            <div className="flex rounded-xl border border-[var(--maroon-border)] bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                  mode === "login"
                    ? "bg-[rgba(127,58,65,0.25)] text-white"
                    : "text-neutral-300 hover:bg-[var(--maroon-glass)]"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                  mode === "signup"
                    ? "bg-[rgba(127,58,65,0.25)] text-white"
                    : "text-neutral-300 hover:bg-[var(--maroon-glass)]"
                }`}
              >
                Sign up
              </button>
            </div>

            <div className="mt-6">
              <h1 className="text-2xl font-semibold">
                {mode === "login" ? "Sign in" : "Create account"}
              </h1>
              <p className="mt-1 text-sm text-neutral-300">
                {mode === "login"
                  ? "Enter your credentials to continue."
                  : "Fill up the form to register."}
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  {/* Role selection (UI only) */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("customer")}
                      className={`rounded-xl border px-4 py-3 text-left ${
                        role === "customer"
                          ? "border-white/20 bg-[rgba(127,58,65,0.25)]"
                          : "border-[var(--maroon-border)] bg-[var(--maroon-glass)] hover:bg-[rgba(127,58,65,0.25)]"
                      }`}
                    >
                      <div className="text-sm font-medium">Customer</div>
                      <div className="text-xs text-neutral-300">
                        Reserve tables
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("vendor")}
                      className={`rounded-xl border px-4 py-3 text-left ${
                        role === "vendor"
                          ? "border-white/20 bg-[rgba(127,58,65,0.25)]"
                          : "border-[var(--maroon-border)] bg-[var(--maroon-glass)] hover:bg-[rgba(127,58,65,0.25)]"
                      }`}
                    >
                      <div className="text-sm font-medium">
                        Restaurant Owner
                      </div>
                      <div className="text-xs text-neutral-300">
                        Manage bookings
                      </div>
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
                <PasswordField
                  label="Confirm Password"
                  icon={<Lock className="h-4 w-4" />}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showPassword}
                  toggleShow={() => setShowPassword((s) => !s)}
                />
              )}

              <label className="flex items-start gap-3 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-[rgba(127,58,65,0.25)]"
                />
                <span>
                  I agree to the{" "}
                  <span className="underline">Terms and Conditions</span>.
                </span>
              </label>

              {msg && (
                <div className="rounded-xl border border-[var(--maroon-border)] bg-black/20 px-4 py-3 text-sm">
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="w-full rounded-xl bg-[rgba(127,58,65,0.25)] px-4 py-2 text-sm font-medium hover:bg-white/20 disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Login"
                    : "Create account"}
              </button>
            </form>
          </div>
        </motion.div>
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
      <div className="text-sm text-neutral-300">{props.label}</div>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] px-3 py-2">
        <span className="text-neutral-400">{props.icon}</span>
        <input
          type={props.type ?? "text"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
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
      <div className="text-sm text-neutral-300">{props.label}</div>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] px-3 py-2">
        <span className="text-neutral-400">{props.icon}</span>
        <input
          type={props.show ? "text" : "password"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={props.toggleShow}
          className="text-neutral-400 hover:text-neutral-200"
        >
          {props.show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </label>
  );
}
