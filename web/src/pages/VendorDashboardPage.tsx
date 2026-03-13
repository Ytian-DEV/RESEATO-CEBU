import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  Loader2,
  Settings2,
  Star,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import {
  getVendorCharts,
  getVendorOverview,
  listVendorBestSellers,
  listVendorRestaurants,
  VendorBestSeller,
  VendorChartsResponse,
  VendorOverview,
  VendorRestaurant,
} from "../lib/api/vendor.api";
import { ApiError } from "../lib/api/client";
import { useAuth } from "../lib/auth/useAuth";
import VendorPageReveal from "../components/vendor/VendorPageReveal";

type ChartPreset = "7d" | "30d" | "90d" | "custom";

type TrendPoint = VendorChartsResponse["days"][number];

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const payload = error.payload as { message?: string } | undefined;
    return payload?.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function toCurrency(minor: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
}

function csvCell(value: string | number | boolean) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean>>) {
  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map((value) => csvCell(value)).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function dateInputFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateInput(value: string, deltaDays: number) {
  const [year, month, day] = value.split("-").map(Number);
  const dt = new Date(year, month - 1, day);
  dt.setDate(dt.getDate() + deltaDays);
  return dateInputFromDate(dt);
}

function formatDayLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getPresetDays(preset: ChartPreset) {
  if (preset === "7d") return 7;
  if (preset === "90d") return 90;
  return 30;
}

type TrendTooltipState = {
  x: number;
  y: number;
  point: TrendPoint;
};

function VendorLineChart({ points }: { points: TrendPoint[] }) {
  const width = 980;
  const height = 320;
  const padX = 42;
  const padY = 26;
  const [tooltip, setTooltip] = useState<TrendTooltipState | null>(null);

  const chart = useMemo(() => {
    if (!points.length) return null;

    const values = points.map((point) => Number(point.total ?? 0));
    const maxValue = Math.max(1, ...values);
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const baselineY = padY + innerH;
    const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

    const coords = points.map((point, index) => {
      const value = Number(point.total ?? 0);
      return {
        point,
        x: padX + index * stepX,
        y: baselineY - (value / maxValue) * innerH,
      };
    });

    const path = coords
      .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
      .join(" ");

    const areaPath = `${path} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`;

    return {
      coords,
      path,
      areaPath,
      maxValue,
      labelStep: Math.max(1, Math.floor(points.length / 10)),
      tickValues: Array.from({ length: 5 }, (_, index) =>
        Math.round((maxValue * (4 - index)) / 4),
      ),
      baselineY,
      innerH,
    };
  }, [points]);

  if (!chart) {
    return (
      <div className="grid h-[320px] place-items-center rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] text-sm text-[#6b7280]">
        No bookings in selected range.
      </div>
    );
  }

  const tooltipWidth = 210;
  const tooltipHeight = 172;
  const tooltipX = tooltip
    ? Math.min(width - tooltipWidth / 2 - 8, Math.max(tooltipWidth / 2 + 8, tooltip.x))
    : 0;
  const preferredTooltipY = tooltip
    ? tooltip.y > height * 0.55
      ? tooltip.y - tooltipHeight - 12
      : tooltip.y + 12
    : 0;
  const tooltipY = tooltip
    ? Math.min(height - tooltipHeight - 8, Math.max(8, preferredTooltipY))
    : 0;

  function handleSvgMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;

    setTooltip((prev) => (prev ? { ...prev, x, y } : prev));
  }

  return (
    <div
      className="relative rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd]"
      onMouseLeave={() => setTooltip(null)}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full" onMouseMove={handleSvgMouseMove}>
        <defs>
          <linearGradient id="vendorArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bf6f7a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#bf6f7a" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {chart.tickValues.map((tick, tickIndex) => {
          const y = chart.baselineY - (tick / chart.maxValue) * chart.innerH;
          return (
            <g key={`tick-${tick}-${tickIndex}`}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="rgba(100,116,139,0.2)" strokeDasharray="4 5" />
              <text x={10} y={y + 4} fontSize="11" fill="rgba(71,85,105,0.7)">{tick}</text>
            </g>
          );
        })}

        <path d={chart.areaPath} fill="url(#vendorArea)" />
        <path d={chart.path} fill="none" stroke="#8b3d4a" strokeWidth="3" strokeLinecap="round" />

        {chart.coords.map((coord) => (
          <circle
            key={coord.point.date}
            cx={coord.x}
            cy={coord.y}
            r="4"
            fill="#f8e7ea"
            stroke="#8b3d4a"
            strokeWidth="1.2"
            onMouseEnter={() => setTooltip({ x: coord.x, y: coord.y, point: coord.point })}
          >
            <title>{`${coord.point.date}: ${coord.point.total} bookings`}</title>
          </circle>
        ))}

        {chart.coords.map((coord, index) => {
          if (index !== 0 && index !== chart.coords.length - 1 && index % chart.labelStep !== 0) {
            return null;
          }

          return (
            <text key={`label-${coord.point.date}`} x={coord.x} y={height - 8} textAnchor="middle" fontSize="10" fill="rgba(71,85,105,0.72)">
              {formatDayLabel(coord.point.date)}
            </text>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 min-w-[190px] -translate-x-1/2 rounded-xl border border-[#d9c3c8] bg-[rgba(255,255,255,0.96)] px-3 py-2 text-xs text-[#475467] shadow-xl"
          style={{
            left: `${(tooltipX / width) * 100}%`,
            top: `${(tooltipY / height) * 100}%`,
          }}
        >
          <div className="font-semibold text-[#1f2937]">{formatDayLabel(tooltip.point.date)}</div>
          <div className="mt-1">Total: {tooltip.point.total}</div>
          <div>Pending: {tooltip.point.pending}</div>
          <div>Confirmed: {tooltip.point.confirmed}</div>
          <div>Completed: {tooltip.point.completed}</div>
          <div>Cancelled: {tooltip.point.cancelled}</div>
          <div>Paid: {tooltip.point.paid}</div>
          <div>Revenue: {toCurrency(tooltip.point.revenueMinor)}</div>
        </div>
      )}
    </div>
  );
}

const EMPTY_OVERVIEW: VendorOverview = {
  restaurantCount: 0,
  reservationCount: 0,
  pendingCount: 0,
  confirmedCount: 0,
  completedCount: 0,
  paidCount: 0,
  totalPaidAmountMinor: 0,
};

export default function VendorDashboardPage() {
  const { isAuthed, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<VendorOverview | null>(null);
  const [restaurants, setRestaurants] = useState<VendorRestaurant[]>([]);
  const [bestSellers, setBestSellers] = useState<VendorBestSeller[]>([]);
  const [chartData, setChartData] = useState<VendorChartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [chartPreset, setChartPreset] = useState<ChartPreset>("30d");
  const [chartTo, setChartTo] = useState(() => dateInputFromDate(new Date()));
  const [chartFrom, setChartFrom] = useState(() => shiftDateInput(dateInputFromDate(new Date()), -29));

  useEffect(() => {
    if (chartPreset === "custom") return;
    const days = getPresetDays(chartPreset);
    const to = dateInputFromDate(new Date());
    setChartTo(to);
    setChartFrom(shiftDateInput(to, -(days - 1)));
  }, [chartPreset]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!isAuthed) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setMessage(null);

        const [overviewResult, restaurantsResult, bestSellersResult] = await Promise.allSettled([
          getVendorOverview(),
          listVendorRestaurants(),
          listVendorBestSellers({ limit: 120, active: "all" }),
        ]);

        if (!alive) return;

        setOverview(overviewResult.status === "fulfilled" ? overviewResult.value : EMPTY_OVERVIEW);
        setRestaurants(restaurantsResult.status === "fulfilled" ? restaurantsResult.value : []);
        setBestSellers(bestSellersResult.status === "fulfilled" ? bestSellersResult.value : []);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [isAuthed]);

  useEffect(() => {
    let alive = true;

    async function loadCharts() {
      if (!isAuthed) return;
      try {
        setChartLoading(true);
        const data = await getVendorCharts({ from: chartFrom, to: chartTo });
        if (!alive) return;
        setChartData(data);
      } catch (error) {
        if (!alive) return;
        setMessage(getErrorMessage(error, "Failed to load chart data."));
      } finally {
        if (alive) setChartLoading(false);
      }
    }

    loadCharts();
    return () => {
      alive = false;
    };
  }, [chartFrom, chartTo, isAuthed]);

  const cards = useMemo(() => {
    const data = overview ?? EMPTY_OVERVIEW;
    return [
      { key: "restaurants", label: "Assigned Restaurants", value: data.restaurantCount, icon: Building2 },
      { key: "reservations", label: "Reservations", value: data.reservationCount, icon: CalendarClock },
      { key: "pending", label: "Pending", value: data.pendingCount, icon: Clock3 },
      { key: "confirmed", label: "Confirmed", value: data.confirmedCount, icon: CheckCircle2 },
    ];
  }, [overview]);

  const topBestSellers = useMemo(() => [...bestSellers].sort((a, b) => b.soldCount - a.soldCount), [bestSellers]);
  const favorites = topBestSellers.slice(0, 5);
  const inventoryValueMinor = useMemo(() => topBestSellers.reduce((sum, item) => sum + item.priceMinor * item.stockQuantity, 0), [topBestSellers]);

  function handleExportTrendsCsv() {
    if (!chartData?.days?.length) return;

    const rows = chartData.days.map((day) => [
      day.date,
      day.total,
      day.pending,
      day.confirmed,
      day.completed,
      day.cancelled,
      day.paid,
      day.revenueMinor,
      (day.revenueMinor / 100).toFixed(2),
    ]);

    downloadCsv(`vendor-booking-trends-${chartData.from}-to-${chartData.to}.csv`, ["date", "total", "pending", "confirmed", "completed", "cancelled", "paid", "revenue_minor", "revenue_php"], rows);
  }

  function handleExportInventoryCsv() {
    if (!topBestSellers.length) return;
    const rows = topBestSellers.map((item) => [item.restaurantName ?? "", item.name, item.priceMinor, (item.priceMinor / 100).toFixed(2), item.stockQuantity, item.soldCount, ((item.priceMinor * item.soldCount) / 100).toFixed(2)]);
    downloadCsv(`vendor-inventory-${new Date().toISOString().slice(0, 10)}.csv`, ["restaurant", "item", "price_minor", "price_php", "stock", "sold", "estimated_sales_php"], rows);
  }

  if (authLoading) {
    return <div className="relative min-h-[calc(100vh-72px)] w-full bg-[#f3f3f4] text-[#1f2937]" />;
  }

  if (!isAuthed) {
    return (
      <div className="relative min-h-[calc(100vh-72px)] w-full bg-[#f3f3f4] text-[#1f2937]">
        <div className="mx-auto max-w-6xl px-6 py-8">Login is required to access the vendor portal.</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] w-full bg-[#f3f3f4] text-[#1f2937]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b3d4a]">Vendor Portal</p>
          <h1 className="mt-2 text-5xl text-[#1f2937]">Dashboard</h1>
        </header>

        {message && <div className="mt-5 rounded-2xl border border-[#f2cccf] bg-[#fff6f7] px-4 py-3 text-sm text-[#9f1239]">{message}</div>}

        {loading ? (
          <div className="mt-6 rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#5b6374]"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : (
          <VendorPageReveal>
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.key} className="rounded-2xl border border-[#e8e2e3] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                    <div className="flex items-center justify-between"><span className="text-sm text-[#6b7280]">{card.label}</span><Icon className="h-4 w-4 text-[#8b3d4a]" /></div>
                    <div className="mt-3 text-4xl font-semibold text-[#1f2937]">{card.value}</div>
                  </article>
                );
              })}
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <h2 className="text-3xl text-[#1f2937]">Assigned Restaurants</h2>
                <div className="mt-4 space-y-3">
                  {restaurants.slice(0, 4).map((restaurant) => (
                    <div key={restaurant.id} className="rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div><h3 className="text-xl text-[#1f2937]">{restaurant.name}</h3><p className="text-sm text-[#6b7280]">{restaurant.cuisine} - {restaurant.location}</p></div>
                        <div className="flex gap-2">
                          <Link to={`/vendor/restaurants/${restaurant.id}/slots`} className="rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-3 py-2 text-xs font-medium text-[#7b2f3b]">Configure Tables</Link>
                          <Link to={`/vendor/restaurants/${restaurant.id}/best-sellers`} className="rounded-xl border border-[#d8dbe2] bg-white px-3 py-2 text-xs font-medium text-[#374151]">Best Sellers</Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <h2 className="text-3xl text-[#1f2937]">Revenue Snapshot</h2>
                <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4"><div className="flex items-center justify-between text-[#6b7280]"><span>Paid reservations</span><CircleDollarSign className="h-4 w-4 text-[#8b3d4a]" /></div><div className="mt-2 text-2xl font-semibold text-[#1f2937]">{overview?.paidCount ?? 0}</div></div>
                <div className="mt-3 rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4"><div className="text-[#6b7280]">Collected reservation fees</div><div className="mt-2 text-3xl font-semibold text-[#7b2f3b]">{toCurrency(overview?.totalPaidAmountMinor ?? 0)}</div></div>
                <div className="mt-3 rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4"><div className="text-[#6b7280]">Inventory value</div><div className="mt-2 text-2xl font-semibold text-[#1f2937]">{toCurrency(inventoryValueMinor)}</div></div>
                <div className="mt-4 space-y-2">
                  <Link to="/vendor/reservations" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#c98d98] bg-[#f8ecee] px-4 py-2.5 text-sm font-semibold text-[#7b2f3b]"><Settings2 className="h-4 w-4" />Open Reservation List</Link>
                  <Link to="/vendor/tables" className="inline-flex w-full items-center justify-center rounded-xl border border-[#d8dbe2] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151]">Manage Tables & Best Sellers</Link>
                </div>
              </article>
            </section>

            <section className="mt-5">
              <article className="rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h2 className="text-3xl text-[#1f2937]">Booking Trends</h2>
                  <div className="flex flex-wrap items-end gap-2">
                    <select value={chartPreset} onChange={(event) => setChartPreset(event.target.value as ChartPreset)} className="rounded-lg border border-[#ddd8da] bg-white px-2 py-1 text-xs text-[#1f2937]"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="custom">Custom</option></select>
                    <input type="date" value={chartFrom} onChange={(event) => { setChartPreset("custom"); setChartFrom(event.target.value); }} className="rounded-lg border border-[#ddd8da] bg-white px-2 py-1 text-xs text-[#1f2937]" />
                    <input type="date" value={chartTo} onChange={(event) => { setChartPreset("custom"); setChartTo(event.target.value); }} className="rounded-lg border border-[#ddd8da] bg-white px-2 py-1 text-xs text-[#1f2937]" />
                    <button type="button" onClick={handleExportTrendsCsv} className="inline-flex items-center gap-1 rounded-lg border border-[#d9c3c8] bg-[#f8ecee] px-2.5 py-1.5 text-xs font-semibold text-[#7b2f3b]"><Download className="h-3.5 w-3.5" />Export</button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] px-3 py-2 text-xs text-[#5b6374]">Total reservations<div className="mt-1 text-xl font-semibold text-[#1f2937]">{chartData?.summary.totalReservations ?? 0}</div></div>
                  <div className="rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] px-3 py-2 text-xs text-[#5b6374]">Completion rate<div className="mt-1 text-xl font-semibold text-[#1f2937]">{(chartData?.summary.completionRate ?? 0).toFixed(2)}%</div></div>
                  <div className="rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] px-3 py-2 text-xs text-[#5b6374]">Cancellation rate<div className="mt-1 text-xl font-semibold text-[#1f2937]">{(chartData?.summary.cancellationRate ?? 0).toFixed(2)}%</div></div>
                  <div className="rounded-xl border border-[#e5e7eb] bg-[#fcfcfd] px-3 py-2 text-xs text-[#5b6374]">Revenue<div className="mt-1 text-xl font-semibold text-[#7b2f3b]">{toCurrency(chartData?.summary.totalRevenueMinor ?? 0)}</div></div>
                </div>

                <div className="mt-4">{chartLoading ? <div className="grid h-[320px] place-items-center rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] text-sm text-[#5b6374]"><Loader2 className="h-4 w-4 animate-spin" /></div> : <VendorLineChart points={chartData?.days ?? []} />}</div>

                <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f2937]"><Star className="h-4 w-4 text-[#8b3d4a]" />Favorites</div>
                  {favorites.length === 0 ? <p className="mt-2 text-sm text-[#6b7280]">No favorites yet.</p> : <div className="mt-2 flex flex-wrap gap-2">{favorites.map((item) => <span key={item.id} className="inline-flex items-center gap-1 rounded-full border border-[#d9c3c8] bg-[#fff7f8] px-3 py-1 text-xs font-semibold text-[#7b2f3b]"><Star className="h-3 w-3" />{item.name}</span>)}</div>}
                </div>
              </article>
            </section>

            <section className="mt-5">
              <article className="rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-3xl text-[#1f2937]">Best Sellers</h2>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleExportInventoryCsv} className="inline-flex items-center gap-1 rounded-lg border border-[#d9c3c8] bg-[#f8ecee] px-2.5 py-1.5 text-xs font-semibold text-[#7b2f3b]"><Download className="h-3.5 w-3.5" />Export</button>
                    <Link to="/vendor/tables" className="inline-flex items-center gap-1 rounded-lg border border-[#d8dbe2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#374151]"><Settings2 className="h-3.5 w-3.5" />Manage</Link>
                  </div>
                </div>

                {topBestSellers.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4 text-sm text-[#5b6374]">No best sellers added yet.</div>
                ) : (
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {topBestSellers.slice(0, 9).map((item) => (
                      <article key={item.id} className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd]">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-40 w-full object-cover" /> : <div className="grid h-40 w-full place-items-center bg-[linear-gradient(135deg,#f7ebee_0%,#f5f7fb_100%)] text-[#8b3d4a]"><UtensilsCrossed className="h-7 w-7" /></div>}
                        <div className="p-4">
                          <div className="text-lg font-semibold text-[#1f2937]">{item.name}</div>
                          <div className="mt-0.5 text-xs text-[#6b7280]">{item.restaurantName || "Restaurant"}</div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded-lg border border-[#e5e7eb] bg-white p-2"><div className="text-[#8b97a8]">Sold</div><div className="mt-1 font-semibold text-[#1f2937]">{item.soldCount}</div></div>
                            <div className="rounded-lg border border-[#e5e7eb] bg-white p-2"><div className="text-[#8b97a8]">Stock</div><div className="mt-1 font-semibold text-[#1f2937]">{item.stockQuantity}</div></div>
                            <div className="rounded-lg border border-[#e5e7eb] bg-white p-2"><div className="text-[#8b97a8]">Price</div><div className="mt-1 font-semibold text-[#1f2937]">{toCurrency(item.priceMinor)}</div></div>
                          </div>
                          <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#d9c3c8] bg-[#fff7f8] px-2.5 py-1 text-xs font-semibold text-[#7b2f3b]"><TrendingUp className="h-3.5 w-3.5" />Est. sales {toCurrency(item.priceMinor * item.soldCount)}</div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </article>
            </section>
          </VendorPageReveal>
        )}
      </div>
    </div>
  );
}


