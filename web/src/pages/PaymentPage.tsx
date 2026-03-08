import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Loader2,
  Lock,
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

  async function loadDetails() {
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
  }

  useEffect(() => {
    loadDetails();
  }, [reservationId]);

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
  }, [reservationId, statusQuery]);

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
    return <div className="py-10 text-white/70">Invalid reservation.</div>;
  }

  if (loading) {
    return (
      <div className="py-10 text-white/70 inline-flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payment details...
      </div>
    );
  }

  if (!details) {
    return (
      <div className="py-12">
        <div className="rounded-2xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] p-6 text-white/80">
          <p>{message ?? "Reservation payment details are not available."}</p>
          <Link
            to="/my-reservations"
            className="mt-4 inline-flex rounded-xl border border-[var(--maroon-border)] bg-black/25 px-4 py-2 text-sm hover:bg-black/35"
          >
            Go to My Reservations
          </Link>
        </div>
      </div>
    );
  }

  const paymentDone = details.paymentStatus === "paid";
  const paymentLocked = paymentDone || submitting;

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--maroon-border)] bg-[var(--maroon-glass)] px-4 py-2 text-sm text-white/80 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {message && (
        <div className="mt-5 rounded-2xl border border-[#b44a53]/40 bg-[#4a1e23]/30 px-4 py-3 text-sm text-[#f6c8cd]">
          {message}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.04)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <h1 className="text-5xl font-semibold text-white">Secure Payment</h1>
          <p className="mt-1 text-white/70">Complete your reservation fee payment</p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--maroon-border)] bg-black/20">
            <div className="flex items-center justify-between border-b border-[var(--maroon-border)] bg-[rgba(127,58,65,0.22)] px-5 py-4">
              <span className="text-base text-white/90">Reservation Fee</span>
              <span className="text-4xl font-semibold text-[#f0b7be]">{feeLabel}</span>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/55">
                  Select Payment Method
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod("card")}
                    disabled={paymentLocked}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedMethod === "card"
                        ? "border-[#8b3e46] bg-[rgba(127,58,65,0.25)]"
                        : "border-white/10 bg-black/20 hover:bg-black/30"
                    } disabled:opacity-60`}
                  >
                    <CreditCard className="h-5 w-5 text-[#e6b9be]" />
                    <div className="mt-3 text-sm font-medium text-white">Credit Card</div>
                    <div className="text-xs text-white/60">Visa / Mastercard</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod("wallet")}
                    disabled={paymentLocked}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedMethod === "wallet"
                        ? "border-[#8b3e46] bg-[rgba(127,58,65,0.25)]"
                        : "border-white/10 bg-black/20 hover:bg-black/30"
                    } disabled:opacity-60`}
                  >
                    <Wallet className="h-5 w-5 text-[#e6b9be]" />
                    <div className="mt-3 text-sm font-medium text-white">GCash / Maya</div>
                    <div className="text-xs text-white/60">Secure wallet checkout</div>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70">
                To keep your payment secure and PCI-compliant, card and wallet details are entered on
                the provider checkout page after you click Pay.
              </div>

              <label className="inline-flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  className="custom-checkbox mt-0.5"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(127,58,65,0.45)] bg-[linear-gradient(135deg,#7f3a41,#5C252B)] px-5 py-3 text-xl font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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

              <div className="inline-flex w-full items-center justify-center gap-2 text-sm text-[#8fd3a7]">
                <BadgeCheck className="h-4 w-4" />
                Secure encrypted transaction
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.04)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <h2 className="text-3xl font-semibold text-white">Reservation Details</h2>
          <div className="mt-5 space-y-3 text-sm text-white/80">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-white/55">Restaurant</div>
              <div className="mt-1 text-base font-medium text-white">{details.restaurantName}</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-white/55">
                <CalendarDays className="h-3.5 w-3.5" />
                Date and Time
              </div>
              <div className="mt-1 text-base font-medium text-white">
                {prettyDate(details.date)} at {details.time}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-white/55">Guests</div>
              <div className="mt-1 text-base font-medium text-white">{details.guests}</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-white/55">Payment Status</div>
              <div className="mt-1 text-base font-medium text-white uppercase">{details.paymentStatus}</div>
            </div>

            {paymentDone && (
              <div className="rounded-xl border border-[#2f8a57]/45 bg-[#1a3325]/35 p-4 text-[#b4e7cb]">
                Payment received. Your reservation is now secured.
              </div>
            )}

            <Link
              to="/my-reservations"
              className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--maroon-border)] bg-black/20 px-4 py-2.5 text-sm font-medium text-white/85 hover:bg-black/30"
            >
              View My Reservations
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

