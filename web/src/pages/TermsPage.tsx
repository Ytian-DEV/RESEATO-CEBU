import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <h1 className="text-3xl md:text-4xl font-semibold text-white mb-2">
        RESEATO Terms and Conditions & Policy
      </h1>
      <p className="text-neutral-300 leading-relaxed mb-8">
        By ticking the agreement box and proceeding, you acknowledge that you
        have read, understood, and agreed to the following Terms and Conditions.
      </p>

      <ol className="list-decimal list-outside space-y-6 text-neutral-300 leading-relaxed pl-5">
        <li>
          <strong className="text-white">Acceptance of Terms.</strong> By using
          RESEATO and completing a reservation, you agree to comply with all
          policies stated herein.
        </li>
        <li>
          <strong className="text-white">Payment Policy.</strong> Reservation
          payments are final and non-refundable once processed.
        </li>
        <li>
          <strong className="text-white">No Cancellation Policy.</strong> Once
          payment is processed, the reservation is confirmed and cannot be
          canceled, transferred, or rescheduled.
        </li>
        {/* Keep pasting the rest exactly like your old content */}
      </ol>

      <div className="mt-10 pt-8 border-t border-white/10">
        <Link to="/" className="text-white/80 hover:text-white font-medium">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
