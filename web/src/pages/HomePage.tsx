import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSession } from "../lib/auth/useSession";

function TermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950 p-6 text-neutral-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Terms and Conditions</h3>
            <p className="mt-1 text-sm text-neutral-300">
              This is a placeholder Terms modal. Replace with your real terms
              content.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-neutral-300 hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-neutral-300">
          <p>
            By using RESEATO, you agree to provide accurate information and
            follow restaurant policies.
          </p>
          <p>
            Reservations are subject to confirmation and availability. Please
            arrive on time.
          </p>
          <p>
            We may update these terms anytime. Continued use means acceptance.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
        >
          I Understand
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [termsOpen, setTermsOpen] = useState(false);

  const ctaLabel = useMemo(() => {
    if (loading) return "Loading…";
    return session ? "Explore Restaurants" : "Get Started";
  }, [loading, session]);

  function onPrimaryCTA() {
    if (session) navigate("/restaurants");
    else navigate("/log-in-sign-up");
  }

  return (
    <div className="relative h-screen overflow-hidden bg-neutral-950">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80"
          alt=""
          className="h-full w-full object-cover hero-bg-motion"
        />
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/75" />
      <div className="absolute inset-0 bg-emerald-900/20" />

      {/* Content (push down so navbar doesn't overlap) */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-center justify-center px-4 text-center pt-20"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight drop-shadow-lg max-w-4xl">
          Restaurants in Cebu City
        </h1>

        <p className="mt-4 md:mt-6 text-base sm:text-lg md:text-xl text-white/95 font-light tracking-wide max-w-2xl">
          Book the best tables at top rated restaurants — skip the line, enjoy
          the dine, and discover what’s best.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onPrimaryCTA}
            disabled={loading}
            className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-white/95 disabled:opacity-60 transition"
          >
            {ctaLabel}
          </button>

          <button
            onClick={() => navigate("/restaurants")}
            className="rounded-xl border border-white/30 bg-white/0 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition"
          >
            Browse Now
          </button>
        </div>

        {!session && (
          <div className="mt-4 text-sm text-white/80">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/log-in-sign-up")}
              className="underline hover:text-white"
            >
              Sign in here
            </button>
          </div>
        )}
      </motion.div>

      {/* Bottom links */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-6 py-4 text-sm text-white/80">
        <Link to="/about" className="hover:text-white transition">
          About
        </Link>
        <span className="text-white/40">|</span>
        <Link to="/terms" className="hover:text-white transition">
          Terms and Conditions
        </Link>
      </div>

      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </div>
  );
}
