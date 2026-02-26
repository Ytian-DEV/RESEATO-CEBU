export default function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Reserve smarter with RESEATO</h1>
      <p className="max-w-2xl text-neutral-300">
        This is the new rewrite. We’re building a clean, modular, production-style frontend with proper Git Flow.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-neutral-300">Step-by-step rewrite</div>
          <div className="mt-1 font-medium">Feature-based architecture</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-neutral-300">Next</div>
          <div className="mt-1 font-medium">Restaurants listing page</div>
        </div>
      </div>
    </section>
  );
}