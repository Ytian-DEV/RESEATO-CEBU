import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";
import { useSession } from "../lib/auth/useSession";
import { getPostAuthRedirect } from "../lib/auth/roleRedirect";

export default function HomePage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();

  useEffect(() => {
    let alive = true;

    async function redirectAuthedUser() {
      if (loading || !session) return;

      const target = await getPostAuthRedirect(session);
      if (!alive) return;

      if (target !== "/") {
        navigate(target, { replace: true });
      }
    }

    void redirectAuthedUser();

    return () => {
      alive = false;
    };
  }, [loading, navigate, session]);

  async function onSignIn() {
    if (session) {
      const target = await getPostAuthRedirect(session);
      navigate(target, { replace: true });
      return;
    }

    navigate("/log-in-sign-up");
  }

  async function onGetStarted() {
    if (session) {
      const target = await getPostAuthRedirect(session);
      navigate(target, { replace: true });
      return;
    }
    navigate("/log-in-sign-up");
  }

  if (loading) {
    return <div className="h-screen bg-black" />;
  }

  if (session) {
    return null;
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2400&q=90"
          alt="Restaurant interior"
          className="hero-bg-motion h-full w-full object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-black/58" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,16,20,0.58)_0%,rgba(16,11,12,0.44)_48%,rgba(14,10,10,0.74)_100%)]" />

      <div className="relative z-10 flex h-screen flex-col">
        <header className="mx-auto flex w-full max-w-[1520px] items-center justify-between gap-2 px-4 pt-4 sm:px-9 sm:pt-5 lg:px-10">
          <Link to="/" className="group flex shrink-0 items-center gap-2 sm:gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(44,42,47,0.85)] ring-1 ring-white/10 backdrop-blur transition-all duration-300 group-hover:bg-[rgba(70,52,56,0.92)] sm:h-11 sm:w-11 sm:rounded-2xl">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="whitespace-nowrap text-[clamp(1.28rem,5.5vw,2rem)] leading-none font-semibold tracking-tight text-white max-[380px]:text-[1.12rem]">
              RESEATO
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onSignIn}
              className="shrink-0 whitespace-nowrap rounded-xl border border-white/35 bg-[rgba(17,17,20,0.35)] px-2.5 py-1.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.24)] backdrop-blur hover:bg-[rgba(34,34,40,0.5)] max-[380px]:px-2 max-[380px]:text-[0.78rem] sm:px-[1.08rem] sm:py-[0.48rem] sm:text-[clamp(0.88rem,0.88vw,1.1rem)]"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="shrink-0 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#b46d73] to-[#923f4a] px-3 py-1.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(116,43,53,0.42)] hover:brightness-105 max-[380px]:px-2.5 max-[380px]:text-[0.78rem] sm:px-[1.22rem] sm:py-[0.48rem] sm:text-[clamp(0.88rem,0.88vw,1.1rem)]"
            >
              Get Started
            </button>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-[1520px] flex-1 items-center justify-center px-6 text-center sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-[760px]"
          >
            <h1 className="text-[clamp(1.95rem,3vw,3rem)] leading-[1.1] font-semibold tracking-tight text-white drop-shadow-[0_8px_16px_rgba(0,0,0,0.38)]">
              Restaurants in Cebu City
            </h1>

            <p className="mx-auto mt-3 max-w-[740px] text-[clamp(0.98rem,1.35vw,1.45rem)] leading-[1.32] font-medium text-white/95 drop-shadow-[0_6px_14px_rgba(0,0,0,0.4)]">
              Book the Best Tables at Top Rated Restaurants, Skip the Line,
              Enjoy the Dine and Suggest What&apos;s Best.
            </p>
          </motion.div>
        </section>

        <footer className="pb-5">
          <div className="mx-auto flex w-full max-w-[1520px] items-center justify-center gap-4 text-[clamp(0.9rem,0.9vw,1.08rem)] text-white/90">
            <Link to="/about" className="hover:text-white">
              About
            </Link>
            <span className="text-white/50">|</span>
            <Link to="/terms" className="hover:text-white">
              Terms and Conditions
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}


