import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  CalendarCheck2,
  ClipboardList,
  Loader2,
  RefreshCcw,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../lib/auth/useAuth";
import { CompletionBarChart, ReservationsLineChart } from "../components/admin/AdminOverviewCharts";
import { supabase } from "../lib/supabase";
import {
  AdminAuditLog,
  AdminChartsResponse,
  AdminOverview,
  AdminReservation,
  AdminRestaurant,
  AdminUser,
  getAdminCharts,
  getAdminOverview,
  listAdminAuditLogs,
  listAdminReservations,
  listAdminRestaurants,
  listAdminUsers,
  updateAdminReservationStatus,
  updateAdminUserRole,
} from "../lib/api/admin.api";

type TabKey = "overview" | "users" | "restaurants" | "reservations" | "audit";
type ChartPreset = "7d" | "14d" | "30d" | "90d" | "custom";

function toPeso(minor: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
  }

function toDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  }

function normalizeRole(raw: unknown) {
  return String(raw ?? "customer").trim().toLowerCase();
  }

function sectionToTab(section?: string): TabKey {
  const value = String(section ?? "").trim().toLowerCase();
  if (value === "users") return "users";
  if (value === "restaurants") return "restaurants";
  if (value === "reservations") return "reservations";
  if (value === "audit") return "audit";
  return "overview";
  }

function tabToPath(tab: TabKey) {
  if (tab === "overview") return "/admin";
  return `/admin/${tab}`;
  }

function shortId(value: string) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
  }

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(dt.getTime())) return false;
  return dt.toISOString().slice(0, 10) === value;
  }

function dateInputFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
  }

function shiftDateInput(value: string, deltaDays: number) {
  if (!isValidDateKey(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  const dt = new Date(year, month - 1, day);
  dt.setDate(dt.getDate() + deltaDays);
  return dateInputFromDate(dt);
  }

function getPresetDays(preset: ChartPreset) {
  if (preset === "7d") return 7;
  if (preset === "14d") return 14;
  if (preset === "90d") return 90;
  return 30;
  }

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
  }

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const { isAuthed, loading: authLoading, user } = useAuth();

  const [role, setRole] = useState("customer");
  const [roleLoading, setRoleLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  const [chartPreset, setChartPreset] = useState<ChartPreset>("30d");
  const [chartTo, setChartTo] = useState(() => dateInputFromDate(new Date()));
  const [chartFrom, setChartFrom] = useState(() => shiftDateInput(dateInputFromDate(new Date()), -29));
  const [chartData, setChartData] = useState<AdminChartsResponse | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [reservationStatusFilter, setReservationStatusFilter] = useState("all");
  const [reservationPaymentFilter, setReservationPaymentFilter] = useState("all");
  const [reservationDateFilter, setReservationDateFilter] = useState("");

  const [roleDraftByUserId, setRoleDraftByUserId] = useState<Record<string, string>>({});
  const [statusDraftByReservationId, setStatusDraftByReservationId] = useState<Record<string, string>>({});

  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [updatingReservationId, setUpdatingReservationId] = useState<string | null>(null);

  const panelClass =
    "rounded-3xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.04)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]";
  const inputClass =
    "rounded-xl border border-[rgba(127,58,65,0.45)] bg-[rgba(19,10,11,0.78)] px-3 py-2 text-sm text-[#f7dee1] outline-none placeholder:text-[#d7aeb3]/50 focus:border-[#b76a73] focus:ring-2 focus:ring-[rgba(183,106,115,0.25)]";
  const selectClass =
    "maroon-select rounded-xl border border-[rgba(127,58,65,0.45)] bg-[rgba(19,10,11,0.86)] px-3 py-2 text-sm text-[#f7dee1] outline-none focus:border-[#b76a73] focus:ring-2 focus:ring-[rgba(183,106,115,0.25)]";
  const ghostButtonClass =
    "rounded-xl border border-[rgba(127,58,65,0.45)] bg-[rgba(127,58,65,0.2)] px-3 py-2 text-sm font-semibold text-[#f4d3d7] hover:bg-[rgba(127,58,65,0.3)]";

  useEffect(() => {
    let alive = true;

    async function resolveRole() {
      if (!user) {
        if (alive) {
          setRole("customer");
          setRoleLoading(false);
        }
        return;
      }

      const metadataRole = normalizeRole(
        (user.user_metadata as Record<string, unknown> | undefined)?.role,
      );
      if (metadataRole && metadataRole !== "customer") {
        if (alive) {
          setRole(metadataRole);
          setRoleLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (error || !data?.role) {
        setRole(metadataRole || "customer");
      } else {
        setRole(normalizeRole(data.role));
      }

      setRoleLoading(false);
    }

    setRoleLoading(true);
    void resolveRole();

    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    if (chartPreset === "custom") return;

    const days = getPresetDays(chartPreset);
    const to = dateInputFromDate(new Date());
    const from = shiftDateInput(to, -(days - 1));

    setChartTo(to);
    setChartFrom(from);
  }, [chartPreset]);

  const isAdmin = useMemo(() => role === "admin", [role]);
  const activeTab = useMemo(() => sectionToTab(section), [section]);

  const loadOverview = useCallback(async () => {
    const data = await getAdminOverview();
    setOverview(data);
  }, []);

  const loadCharts = useCallback(async (from: string, to: string) => {
    setChartLoading(true);
    setChartError(null);

    try {
      const data = await getAdminCharts({ from, to });
      setChartData(data);
    } catch (error: any) {
      setChartError(error?.payload?.message ?? error?.message ?? "Failed to load chart data.");
    } finally {
      setChartLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    const data = await listAdminUsers({
      search: userSearch.trim() || undefined,
      role: userRoleFilter,
      limit: 80,
      offset: 0,
    });

    setUsers(data);
    setRoleDraftByUserId((prev) => {
      const next = { ...prev };
      for (const item of data) {
        if (!next[item.id]) {
          next[item.id] = item.role;
        }
      }
      return next;
    });
  }, [userRoleFilter, userSearch]);

  const loadRestaurants = useCallback(async () => {
    const data = await listAdminRestaurants({
      search: restaurantSearch.trim() || undefined,
      limit: 80,
      offset: 0,
    });

    setRestaurants(data);
  }, [restaurantSearch]);

  const loadReservations = useCallback(async () => {
    const data = await listAdminReservations({
      status: reservationStatusFilter,
      paymentStatus: reservationPaymentFilter,
      date: reservationDateFilter || undefined,
      limit: 100,
      offset: 0,
    });

    setReservations(data);
    setStatusDraftByReservationId((prev) => {
      const next = { ...prev };
      for (const item of data) {
        if (!next[item.id]) {
          next[item.id] = item.status;
        }
      }
      return next;
    });
  }, [reservationDateFilter, reservationPaymentFilter, reservationStatusFilter]);

  const loadAuditLogs = useCallback(async () => {
    const data = await listAdminAuditLogs({ limit: 80 });
    setAuditLogs(data);
  }, []);

  function extractErrorMessage(error: any, fallback: string) {
    return error?.payload?.message ?? error?.message ?? fallback;
  }

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    const jobs: Array<{ label: string; run: () => Promise<void> }> = [
      { label: "overview", run: loadOverview },
    ];

    if (activeTab === "users") {
      jobs.push({ label: "users", run: loadUsers });
    } else if (activeTab === "restaurants") {
      jobs.push({ label: "restaurants", run: loadRestaurants });
    } else if (activeTab === "reservations") {
      jobs.push({ label: "reservations", run: loadReservations });
    } else if (activeTab === "audit") {
      jobs.push({ label: "audit logs", run: loadAuditLogs });
    }

    const results = await Promise.allSettled(jobs.map((job) => job.run()));

    const failures: string[] = [];
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      if (result.status === "rejected") {
        failures.push(
          `${jobs[index].label}: ${extractErrorMessage(
            result.reason,
            "Failed to load admin data.",
          )}`,
        );
      }
    }

    if (failures.length > 0) {
      setMessage(failures.join(" | "));
    }

    setLoading(false);
  }, [activeTab, loadAuditLogs, loadOverview, loadReservations, loadRestaurants, loadUsers]);
  useEffect(() => {
    if (!isAuthed || roleLoading || !isAdmin) {
      setLoading(false);
      return;
    }

    void refreshAll();
  }, [isAuthed, roleLoading, isAdmin, refreshAll]);

  useEffect(() => {
    if (!isAuthed || roleLoading || !isAdmin) return;
    if (activeTab !== "overview") return;

    if (!isValidDateKey(chartFrom) || !isValidDateKey(chartTo)) {
      setChartError("Invalid date format. Use YYYY-MM-DD.");
      return;
    }

    if (chartFrom > chartTo) {
      setChartError("Date range is invalid. From date must be before To date.");
      return;
    }

    void loadCharts(chartFrom, chartTo);
  }, [activeTab, chartFrom, chartTo, isAdmin, isAuthed, loadCharts, roleLoading]);

  async function handleRefresh() {
    await refreshAll();

    if (
      activeTab === "overview" &&
      isValidDateKey(chartFrom) &&
      isValidDateKey(chartTo) &&
      chartFrom <= chartTo
    ) {
      await loadCharts(chartFrom, chartTo);
    }
  }

  function handleExportChartCsv() {
    if (!chartData?.days?.length) {
      setChartError("No chart data available to export for the selected range.");
      return;
    }

    const headers = [
      "date",
      "total",
      "completed",
      "cancelled",
      "pending",
      "confirmed",
      "paid",
      "revenue_minor",
      "revenue_php",
      "completion_rate_pct",
      "cancellation_rate_pct",
    ];

    const rows = chartData.days.map((day) => {
      const total = Number(day.total ?? 0);
      const completionRate = total > 0 ? (Number(day.completed ?? 0) / total) * 100 : 0;
      const cancellationRate = total > 0 ? (Number(day.cancelled ?? 0) / total) * 100 : 0;
      const revenueMinor = Number(day.revenueMinor ?? 0);

      return [
        day.date,
        total,
        Number(day.completed ?? 0),
        Number(day.cancelled ?? 0),
        Number(day.pending ?? 0),
        Number(day.confirmed ?? 0),
        Number(day.paid ?? 0),
        revenueMinor,
        (revenueMinor / 100).toFixed(2),
        completionRate.toFixed(2),
        cancellationRate.toFixed(2),
      ];
    });

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => row.map((cell) => csvCell(cell as string | number)).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-charts-${chartData.from}-to-${chartData.to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleUpdateUserRole(targetUserId: string) {
    const nextRole = String(roleDraftByUserId[targetUserId] ?? "").toLowerCase();
    if (!["customer", "vendor", "admin"].includes(nextRole)) {
      setMessage("Invalid role selection.");
      return;
    }

    try {
      setUpdatingUserId(targetUserId);
      setMessage(null);

      await updateAdminUserRole(targetUserId, nextRole as "customer" | "vendor" | "admin");
      await Promise.all([loadUsers(), loadOverview(), loadAuditLogs()]);
      setMessage("User role updated.");
    } catch (error: any) {
      setMessage(error?.payload?.message ?? error?.message ?? "Failed to update user role.");
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleUpdateReservationStatus(reservationId: string) {
    const nextStatus = String(statusDraftByReservationId[reservationId] ?? "").toLowerCase();
    if (!["pending", "confirmed", "declined", "cancelled", "completed"].includes(nextStatus)) {
      setMessage("Invalid reservation status.");
      return;
    }

    let reason: string | undefined;
    if (nextStatus === "declined") {
      const input = window.prompt("Decline reason (optional):", "Declined by admin");
      if (input === null) return;
      reason = input;
    }

    try {
      setUpdatingReservationId(reservationId);
      setMessage(null);

      const result = await updateAdminReservationStatus(
        reservationId,
        nextStatus as "pending" | "confirmed" | "declined" | "cancelled" | "completed",
        reason,
      );

      await Promise.all([loadReservations(), loadOverview(), loadAuditLogs()]);
      setMessage(result.message);
    } catch (error: any) {
      setMessage(error?.payload?.message ?? error?.message ?? "Failed to update reservation status.");
    } finally {
      setUpdatingReservationId(null);
    }
  }

  if (authLoading || roleLoading) {
    return (
      <div className="inline-flex items-center gap-2 text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking admin access...
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="rounded-3xl border border-[var(--maroon-border)] bg-[var(--maroon-glass)] p-6 text-white/85">
        Login is required to access admin dashboard.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-3xl border border-[#b44a53]/40 bg-[#4a1e23]/30 p-6 text-[#f6c8cd]">
        You do not have admin access.
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-5xl text-white">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-white/65">Platform overview and management</p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(127,58,65,0.45)] bg-[rgba(127,58,65,0.2)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[rgba(127,58,65,0.3)] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh
        </button>
      </header>

      {message && (
        <div className="mt-5 rounded-2xl border border-[#b44a53]/40 bg-[#4a1e23]/30 px-4 py-3 text-sm text-[#f6c8cd]">
          {message}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.03)] p-1">
          {([
            ["overview", "Overview"],
            ["reservations", "Reservations"],
            ["restaurants", "Restaurants"],
            ["users", "Users"],
            ["audit", "Audit Logs"],
          ] as Array<[TabKey, string]>).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(tabToPath(key))}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === key
                  ? "bg-[rgba(127,58,65,0.26)] text-white"
                  : "text-white/70 hover:bg-[rgba(127,58,65,0.16)] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <section className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Restaurants", value: overview?.restaurants ?? 0, icon: Building2 },
              { label: "Reservations", value: overview?.reservations ?? 0, icon: CalendarCheck2 },
              { label: "Users", value: overview?.users ?? 0, icon: Users },
              { label: "Total Revenue", value: toPeso(overview?.totalPaidAmountMinor ?? 0), icon: Wallet },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.label} className={panelClass}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/65">{card.label}</span>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[rgba(127,58,65,0.2)] text-[#e8c1c7]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-white">{card.value}</div>
                </article>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {[
              { label: "Vendors", value: overview?.vendors ?? 0, icon: Shield },
              { label: "Admins", value: overview?.admins ?? 0, icon: Shield },
              { label: "Pending", value: overview?.pendingReservations ?? 0, icon: ClipboardList },
              { label: "Paid", value: overview?.paidReservations ?? 0, icon: Wallet },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.label} className="rounded-2xl border border-[var(--maroon-border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-white/55">{card.label}</span>
                    <Icon className="h-4 w-4 text-[#d6aab0]" />
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">{card.value}</div>
                </article>
              );
            })}
          </div>

          <article className={panelClass}>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/55">Range preset</p>
                <select
                  value={chartPreset}
                  onChange={(event) => setChartPreset(event.target.value as ChartPreset)}
                  className={`${selectClass} mt-1`}
                >
                  <option value="7d">Last 7 days</option>
                  <option value="14d">Last 14 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-white/55">From</p>
                <input
                  type="date"
                  value={chartFrom}
                  onChange={(event) => {
                    setChartPreset("custom");
                    setChartFrom(event.target.value);
                  }}
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-white/55">To</p>
                <input
                  type="date"
                  value={chartTo}
                  onChange={(event) => {
                    setChartPreset("custom");
                    setChartTo(event.target.value);
                  }}
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div className="pb-1 text-xs text-white/55">
                Charts update instantly when range changes.
              </div>

              <button
                type="button"
                onClick={handleExportChartCsv}
                disabled={!chartData?.days?.length}
                className={`${ghostButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Export CSV
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80">
                Range: <span className="font-semibold text-white">{chartData?.from ?? chartFrom}</span> to <span className="font-semibold text-white">{chartData?.to ?? chartTo}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80">
                Completion Rate: <span className="font-semibold text-white">{(chartData?.summary.completionRate ?? 0).toFixed(2)}%</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80">
                Cancellation Rate: <span className="font-semibold text-white">{(chartData?.summary.cancellationRate ?? 0).toFixed(2)}%</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80">
                Revenue in range: <span className="font-semibold text-white">{toPeso(chartData?.summary.totalRevenueMinor ?? 0)}</span>
              </div>
            </div>

            {chartError && (
              <div className="mt-4 rounded-xl border border-[#b44a53]/40 bg-[#4a1e23]/30 px-3 py-2 text-sm text-[#f6c8cd]">
                {chartError}
              </div>
            )}
          </article>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className={panelClass}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-2xl text-white">Reservations by Day</h3>
                {chartLoading && <Loader2 className="h-4 w-4 animate-spin text-white/70" />}
              </div>
              <p className="text-xs text-white/55">Line chart of total reservations per selected date.</p>
              <div className="mt-3">
                <ReservationsLineChart points={chartData?.days ?? []} />
              </div>
            </article>

            <article className={panelClass}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-2xl text-white">Completion vs Cancellation</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-[#8ee6b2]">
                    <span className="h-2 w-2 rounded-full bg-[#61c98f]" /> completed
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#f0b1b9]">
                    <span className="h-2 w-2 rounded-full bg-[#e38a95]" /> cancelled/declined
                  </span>
                </div>
              </div>
              <p className="text-xs text-white/55">Bar chart comparing completed and cancelled reservations by day.</p>
              <div className="mt-3">
                <CompletionBarChart points={chartData?.days ?? []} />
              </div>
            </article>
          </div>

        </section>
      )}

      {activeTab === "users" && (
        <section className={`mt-5 ${panelClass}`}>
          <h2 className="text-3xl text-white">User Management</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by full name"
              className={inputClass}
            />

            <select
              value={userRoleFilter}
              onChange={(event) => setUserRoleFilter(event.target.value)}
              className={selectClass}
            >
              <option value="all">All roles</option>
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="admin">Admin</option>
            </select>

            <button type="button" onClick={loadUsers} className={ghostButtonClass}>
              Apply
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm text-white/85">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/45">
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Joined</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} className="border-b border-white/5">
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        {item.fullName || shortId(item.id)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-white/75">{item.email || "-"}</td>
                    <td className="py-2 pr-3">
                      <select
                        value={roleDraftByUserId[item.id] ?? item.role}
                        onChange={(event) =>
                          setRoleDraftByUserId((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                        className={`${selectClass} rounded-lg px-2 py-1 text-xs`}
                      >
                        <option value="customer">customer</option>
                        <option value="vendor">vendor</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-white/65">{toDateTime(item.createdAt)}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => handleUpdateUserRole(item.id)}
                        disabled={updatingUserId === item.id}
                        className="rounded-lg border border-[rgba(127,58,65,0.45)] bg-[rgba(127,58,65,0.2)] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {updatingUserId === item.id ? "Saving..." : "Update"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "restaurants" && (
        <section className={`mt-5 ${panelClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-3xl text-white">Restaurant Management</h2>
            <div className="text-xs text-white/50">Owner now shows readable name</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <input
              value={restaurantSearch}
              onChange={(event) => setRestaurantSearch(event.target.value)}
              placeholder="Search restaurant name/cuisine/location"
              className={`${inputClass} w-[340px]`}
            />
            <button type="button" onClick={loadRestaurants} className={ghostButtonClass}>
              Apply
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm text-white/85">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/45">
                  <th className="py-2 pr-3">Restaurant</th>
                  <th className="py-2 pr-3">Owner</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Tables</th>
                  <th className="py-2 pr-3">Rating</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((item) => (
                  <tr key={item.id} className="border-b border-white/5">
                    <td className="py-2 pr-3">
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-xs text-white/55">{item.cuisine} | {item.location}</div>
                    </td>
                    <td className="py-2 pr-3 text-white/75">
                      {item.ownerName || item.ownerEmail || shortId(item.ownerId || "") || "-"}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                        Active
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-white/75">{item.totalTables}</td>
                    <td className="py-2 pr-3 text-white/75">{item.rating.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "reservations" && (
        <section className={`mt-5 ${panelClass}`}>
          <h2 className="text-3xl text-white">All Reservations</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <select
              value={reservationStatusFilter}
              onChange={(event) => setReservationStatusFilter(event.target.value)}
              className={selectClass}
            >
              <option value="all">All statuses</option>
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
              <option value="declined">declined</option>
              <option value="cancelled">cancelled</option>
              <option value="completed">completed</option>
            </select>

            <select
              value={reservationPaymentFilter}
              onChange={(event) => setReservationPaymentFilter(event.target.value)}
              className={selectClass}
            >
              <option value="all">All payment</option>
              <option value="unpaid">unpaid</option>
              <option value="processing">processing</option>
              <option value="paid">paid</option>
              <option value="failed">failed</option>
              <option value="cancelled">cancelled</option>
            </select>

            <input
              type="date"
              value={reservationDateFilter}
              onChange={(event) => setReservationDateFilter(event.target.value)}
              className={inputClass}
            />

            <button type="button" onClick={loadReservations} className={ghostButtonClass}>
              Apply Filters
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm text-white/85">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/45">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Restaurant</th>
                  <th className="py-2 pr-3">Date/Time</th>
                  <th className="py-2 pr-3">Guests</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Payment</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((item) => (
                  <tr key={item.id} className="border-b border-white/5">
                    <td className="py-2 pr-3 text-white/70">{shortId(item.id)}</td>
                    <td className="py-2 pr-3 text-white/75">{item.user_name || item.user_email || shortId(item.user_id)}</td>
                    <td className="py-2 pr-3 text-white/75">{item.restaurant_name || shortId(item.restaurant_id)}</td>
                    <td className="py-2 pr-3 text-white/75">{item.date} {item.time}</td>
                    <td className="py-2 pr-3 text-white/75">{item.guests}</td>
                    <td className="py-2 pr-3">
                      <select
                        value={statusDraftByReservationId[item.id] ?? item.status}
                        onChange={(event) =>
                          setStatusDraftByReservationId((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                        className={`${selectClass} rounded-lg px-2 py-1 text-xs`}
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="declined">declined</option>
                        <option value="cancelled">cancelled</option>
                        <option value="completed">completed</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-white/75">{item.payment_status || "unpaid"}</td>
                    <td className="py-2 pr-3 text-white/75">{toPeso(item.payment_amount ?? 0)}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => handleUpdateReservationStatus(item.id)}
                        disabled={updatingReservationId === item.id}
                        className="rounded-lg border border-[rgba(127,58,65,0.45)] bg-[rgba(127,58,65,0.2)] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {updatingReservationId === item.id ? "Saving..." : "Update"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs italic text-white/45">
            Each completed reservation can be used for commission tracking later.
          </p>
        </section>
      )}

      {activeTab === "audit" && (
        <section className={`mt-5 ${panelClass}`}>
          <h2 className="text-3xl text-white">Admin Audit Logs</h2>

          <div className="mt-4 space-y-3">
            {auditLogs.map((log) => (
              <article
                key={log.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">{log.action}</div>
                  <div className="text-xs text-white/55">{toDateTime(log.created_at)}</div>
                </div>
                <p className="mt-1 text-xs text-white/60">
                  Actor: {shortId(log.actor_id)} | Target: {log.target_type} ({shortId(log.target_id)})
                </p>
                <pre className="mt-2 overflow-auto rounded-lg bg-black/30 p-2 text-[11px] text-white/65">
                  {JSON.stringify(log.payload ?? {}, null, 2)}
                </pre>
              </article>
            ))}
            {auditLogs.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
                No audit logs available.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
  }

