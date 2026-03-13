import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Loader2,
  Lock,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import {
  cancelReservationPayment,
  confirmReservationPayment,
  createCheckoutSession,
  getReservationPaymentDetails,
  ReservationPaymentDetails,
} from "../lib/api/payments.api";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function prettyDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

type Method = "card" | "wallet";

function paymentStatusTone(paymentStatus: string) {
  const value = paymentStatus.trim().toLowerCase();

  if (value === "paid") {
    return "border-[#bfe6d0] bg-[#e6f7ef] text-[#227a4c]";
  }

  if (value === "processing") {
    return "border-[#bdd8f2] bg-[#eaf4ff] text-[#1d5f93]";
  }

  if (value === "failed") {
    return "border-[#f4c3c3] bg-[#ffecec] text-[#a63d3d]";
  }

  return "border-[#f0d5a5] bg-[#fff5e5] text-[#9a6a19]";
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const { reservationId } = useParams<{ reservationId: string }>();
  const [searchParams] = useSearchParams();

  const [details, setDetails] = useState<ReservationPaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Method>("card");
  const [agreed, setAgreed] = useState(false);

  const hasHandledReturn = useRef(false);

  const statusQuery = searchParams.get("status");

  const loadDetails = useCallback(async () => {
    if (!reservationId) return;

    setLoading(true);
    try {
      const data = await getReservationPaymentDetails(reservationId);
      setDetails(data);
    } catch (error: any) {
      setMessage(error?.payload?.message ?? error?.message ?? "Unable to load payment details.");
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    if (!reservationId) return;
    if (!statusQuery) return;
    if (hasHandledReturn.current) return;

    hasHandledReturn.current = true;

    (async () => {
      try {
        if (statusQuery === "success") {
          const result = await confirmReservationPayment(reservationId);
          setMessage(result.message);
          await loadDetails();
          return;
        }

        if (statusQuery === "cancelled") {
          const result = await cancelReservationPayment(reservationId);
          setMessage(result.message);
          await loadDetails();
        }
      } catch (error: any) {
        setMessage(error?.payload?.message ?? error?.message ?? "Payment status check failed.");
      }
    })();
  }, [loadDetails, reservationId, statusQuery]);

  const feeLabel = useMemo(() => {
    if (!details) return formatAmount(100);
    return formatAmount(details.paymentAmount);
  }, [details]);

  async function onPayNow() {
    if (!reservationId || !details) return;
    if (!agreed) {
      setMessage("Please accept the terms before continuing.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const session = await createCheckoutSession(reservationId, selectedMethod);
      window.location.href = session.checkoutUrl;
    } catch (error: any) {
      setMessage(error?.payload?.message ?? error?.message ?? "Unable to start payment checkout.");
      setSubmitting(false);
    }
  }

  if (!reservationId) {
    return (
      <div className="relative min-h-[calc(100vh-72px)] w-full bg-[#f3f3f4] text-[#1f2937]">
        <section className="mx-auto max-w-5xl px-6 py-10">
          <div className="rounded-2xl border border-[#f0cdd4] bg-[#fff6f7] p-6 text-[#9f1239]">
            Invalid reservation.
          </div>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative min-h-[calc(100vh-72px)] w-full overflow-hidden bg-[#f3f3f4] text-[#1f2937]">
        <div className="pointer-events-none absolute -left-20 -top-16 h-64 w-64 rounded-full bg-[#f2dde2] blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-28 h-72 w-72 rounded-full bg-[#f8ecee] blur-3xl" />

        <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl flex-col justify-center px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 flex items-center gap-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
              className="grid h-11 w-11 place-items-center rounded-xl bg-[#8b3d4a] text-white shadow-[0_10px_22px_rgba(139,61,74,0.26)]"
            >
              <UtensilsCrossed className="h-5 w-5" />
            </motion.div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8b3d4a]">RESEATO</div>
              <div className="text-lg font-medium text-[#374151]">Preparing payment portal...</div>
            </div>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {[0, 1].map((idx) => (
              <motion.div
                key={idx}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.7, delay: idx * 0.2 }}
                className="rounded-3xl border border-[#e8e2e3] bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
              >
                <div className="h-8 w-56 rounded-xl bg-[#f3ecef]" />
                <div className="mt-4 h-12 w-full rounded-2xl bg-[#f2e5e8]" />
                <div className="mt-3 h-12 w-full rounded-2xl bg-[#f4eff1]" />
                <div className="mt-3 h-12 w-full rounded-2xl bg-[#f4eff1]" />
                <div className="mt-6 h-11 w-full rounded-2xl bg-[#f2e5e8]" />
              </motion.div>
            ))}
          </div>

          <div className="mt-6 inline-flex items-center gap-2 text-sm text-[#7b8498]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading payment details...
          </div>
        </section>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="relative min-h-[calc(100vh-72px)] w-full bg-[#f3f3f4] text-[#1f2937]">
        <section className="mx-auto max-w-5xl px-6 py-10">
          <div className="rounded-2xl border border-[#f0cdd4] bg-[#fff6f7] p-6 text-[#9f1239]">
            <p>{message ?? "Reservation payment details are not available."}</p>
            <Link
              to="/my-reservations"
              className="mt-4 inline-flex rounded-xl border border-[#d8c0c6] bg-[#f8ecee] px-4 py-2 text-sm font-medium text-[#7b2f3b] transition hover:bg-[#f2dde2]"
            >
              Go to My Reservations
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const paymentDone = details.paymentStatus === "paid";
  const paymentLocked = paymentDone || submitting;

  return (
    <div className="relative min-h-[calc(100vh-72px)] w-full bg-[#f3f3f4] text-[#1f2937]">
      <section className="mx-auto max-w-5xl px-6 pb-12 pt-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-[#ddd7d9] bg-white px-4 py-2 text-sm text-[#6b7280] shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:text-[#7b2f3b]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {message && (
          <div className="mt-5 rounded-2xl border border-[#f0cdd4] bg-[#fff6f7] px-4 py-3 text-sm text-[#9f1239]">
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-[#e8e2e3] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.1)]">
            <h1 className="text-5xl font-semibold text-[#1f2937]">Secure Payment</h1>
            <p className="mt-1 text-[#667085]">Complete your reservation fee payment</p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-[#e8e2e3] bg-[#fafafa]">
              <div className="flex items-center justify-between border-b border-[#e8e2e3] bg-[#f8ecee] px-5 py-4">
                <span className="text-base text-[#374151]">Reservation Fee</span>
                <span className="text-4xl font-semibold text-[#8b3d4a]">{feeLabel}</span>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#7b8498]">
                    Select Payment Method
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("card")}
                      disabled={paymentLocked}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selectedMethod === "card"
                          ? "border-[#c98d98] bg-[#f8ecee]"
                          : "border-[#e8e2e3] bg-white hover:bg-[#faf7f8]"
                      } disabled:opacity-60`}
                    >
                      <CreditCard className="h-5 w-5 text-[#8b3d4a]" />
                      <div className="mt-3 text-sm font-medium text-[#1f2937]">Credit Card</div>
                      <div className="text-xs text-[#6b7280]">Visa / Mastercard</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMethod("wallet")}
                      disabled={paymentLocked}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selectedMethod === "wallet"
                          ? "border-[#c98d98] bg-[#f8ecee]"
                          : "border-[#e8e2e3] bg-white hover:bg-[#faf7f8]"
                      } disabled:opacity-60`}
                    >
                      <Wallet className="h-5 w-5 text-[#8b3d4a]" />
                      <div className="mt-3 text-sm font-medium text-[#1f2937]">GCash / Maya</div>
                      <div className="text-xs text-[#6b7280]">Secure wallet checkout</div>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#ece8e9] bg-white p-4 text-sm text-[#667085]">
                  To keep your payment secure and PCI-compliant, card and wallet details are entered on
                  the provider checkout page after you click Pay.
                </div>

                <label className="inline-flex items-start gap-3 text-sm text-[#475467]">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-[#d5c9cc] text-[#8b3d4a] focus:ring-[#b46d73]"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    disabled={paymentLocked}
                  />
                  <span>
                    I agree that this reservation fee is final and non-refundable based on RESEATO terms.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={onPayNow}
                  disabled={paymentLocked || !agreed}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#d5bcc2] bg-[linear-gradient(135deg,#9b4b56,#7f3a41)] px-5 py-3 text-xl font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5" />
                      Pay {feeLabel}
                    </>
                  )}
                </button>

                <div className="inline-flex w-full items-center justify-center gap-2 text-sm text-[#227a4c]">
                  <BadgeCheck className="h-4 w-4" />
                  Secure encrypted transaction
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-[#e8e2e3] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.1)]">
            <h2 className="text-3xl font-semibold text-[#1f2937]">Reservation Details</h2>
            <div className="mt-5 space-y-3 text-sm text-[#475467]">
              <div className="rounded-xl border border-[#ece8e9] bg-[#fafafa] p-4">
                <div className="text-xs uppercase tracking-wide text-[#7b8498]">Restaurant</div>
                <div className="mt-1 text-base font-medium text-[#1f2937]">{details.restaurantName}</div>
              </div>

              <div className="rounded-xl border border-[#ece8e9] bg-[#fafafa] p-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-[#7b8498]">
                  <CalendarDays className="h-3.5 w-3.5 text-[#8b3d4a]" />
                  Date and Time
                </div>
                <div className="mt-1 text-base font-medium text-[#1f2937]">
                  {prettyDate(details.date)} at {details.time}
                </div>
              </div>

              <div className="rounded-xl border border-[#ece8e9] bg-[#fafafa] p-4">
                <div className="text-xs uppercase tracking-wide text-[#7b8498]">Guests</div>
                <div className="mt-1 text-base font-medium text-[#1f2937]">{details.guests}</div>
              </div>

              <div className="rounded-xl border border-[#ece8e9] bg-[#fafafa] p-4">
                <div className="text-xs uppercase tracking-wide text-[#7b8498]">Payment Status</div>
                <div className="mt-2">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${paymentStatusTone(details.paymentStatus)}`}>
                    {details.paymentStatus}
                  </span>
                </div>
              </div>

              {paymentDone && (
                <div className="rounded-xl border border-[#bfe6d0] bg-[#e6f7ef] p-4 text-[#227a4c]">
                  Payment received. Your reservation is now secured.
                </div>
              )}

              <Link
                to="/my-reservations"
                className="inline-flex w-full items-center justify-center rounded-xl border border-[#d8c0c6] bg-[#f8ecee] px-4 py-2.5 text-sm font-medium text-[#7b2f3b] transition hover:bg-[#f2dde2]"
              >
                View My Reservations
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}


