import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <h1 className="text-3xl md:text-4xl font-semibold text-[var(--maroon-light)] mb-2">
        RESEATO Terms and Conditions & Policy
      </h1>
      <p className="text-white/75 leading-relaxed mb-8">
        By ticking the agreement box and proceeding with payment, you
        acknowledge that you have read, understood, and agreed to the following
        Terms and Conditions.
      </p>

      <ol className="list-decimal list-outside space-y-6 text-white/75 leading-relaxed pl-5">
        <li>
          <strong className="text-white">Acceptance of Terms.</strong> By using
          RESEATO and completing a reservation, you agree to comply with all
          policies stated herein. If you do not agree with these terms, you must
          not proceed with the reservation or payment.
        </li>
        <li>
          <strong className="text-white">Payment Policy.</strong> All
          reservation payments made through RESEATO are considered final and
          non-refundable once successfully processed. No cancellations,
          modifications, or refund requests will be entertained after payment
          confirmation.
        </li>
        <li>
          <strong className="text-white">No Cancellation Policy.</strong> Once
          payment has been successfully processed, the reservation is confirmed
          and cannot be canceled, transferred, or rescheduled.
        </li>
        <li>
          <strong className="text-white">
            Limitation of Liability – Payment and Data Security.
          </strong>{" "}
          RESEATO utilizes third-party payment gateway providers to process
          online payments. While reasonable security measures are implemented,
          RESEATO shall not be held liable for:
          <ul className="list-disc list-inside mt-2 space-y-1 text-white/65">
            <li>
              Any data breach, unauthorized access, or leakage of personal
              information
            </li>
            <li>Any exposure or compromise of credit/debit card details</li>
            <li>Any loss arising from third-party system vulnerabilities</li>
          </ul>
        </li>
        <li>
          <strong className="text-white">Accuracy of Information.</strong>{" "}
          Customers are responsible for providing accurate and complete personal
          and payment information. RESEATO shall not be liable for failed
          reservations due to incorrect details submitted by the user.
        </li>
        <li>
          <strong className="text-white">Restaurant Responsibility.</strong>{" "}
          RESEATO acts as a reservation platform only. The partnered restaurant
          is solely responsible for food quality, service delivery, pricing
          accuracy, and dining experience.
        </li>
        <li>
          <strong className="text-white">Force Majeure.</strong> RESEATO shall
          not be held liable for failure to fulfill reservations due to events
          beyond reasonable control.
        </li>
        <li>
          <strong className="text-white">System Availability.</strong> We do not
          guarantee uninterrupted access due to possible maintenance, updates,
          or technical issues.
        </li>
        <li>
          <strong className="text-white">Amendments.</strong> RESEATO reserves
          the right to modify these Terms and Conditions at any time. Continued
          use of the system constitutes acceptance of any revisions.
        </li>
        <li>
          <strong className="text-white">No-Show Policy.</strong> Payment will
          be forfeited if the customer fails to appear at the reserved time.
        </li>
        <li>
          <strong className="text-white">Chargeback Protection Clause.</strong>{" "}
          Customers agree not to initiate fraudulent chargebacks.
        </li>
        <li>
          <strong className="text-white">Privacy Policy.</strong> Personal data
          is collected, stored, and protected in accordance with our privacy
          practices.
        </li>
        <li>
          <strong className="text-white">User Conduct Clause.</strong> No
          fraudulent bookings or misuse of the platform is permitted.
        </li>
        <li>
          <strong className="text-white">Time Allowance Policy.</strong>{" "}
          Reservation automatically expires if the customer arrives late (e.g.,
          15–30 minutes grace period).
        </li>
      </ol>

      <div className="mt-10 pt-8 border-t border-white/10">
        <Link to="/" className="text-white/80 hover:text-white font-medium">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
