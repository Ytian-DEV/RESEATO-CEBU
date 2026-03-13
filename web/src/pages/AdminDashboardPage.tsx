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
  assignAdminRestaurantOwner,
  createAdminRestaurant,
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

function toLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "-";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }

function reservationStatusTone(status: string | null | undefined) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "confirmed") return "border-[#d2f5e6] bg-[#ecfcf4] text-[#047857]";
  if (normalized === "completed") return "border-[#cae6ff] bg-[#edf7ff] text-[#1d4ed8]";
  if (normalized === "pending") return "border-[#fee4bf] bg-[#fff4df] text-[#b45309]";
  if (normalized === "declined" || normalized === "cancelled") {
    return "border-[#f7d3d7] bg-[#fff1f2] text-[#be123c]";
  }
  return "border-[#e4e7ec] bg-[#f8fafc] text-[#475467]";
  }

function paymentStatusTone(status: string | null | undefined) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "paid") return "border-[#d2f5e6] bg-[#ecfcf4] text-[#047857]";
  if (normalized === "processing") return "border-[#cae6ff] bg-[#edf7ff] text-[#1d4ed8]";
  if (normalized === "failed" || normalized === "cancelled") {
    return "border-[#f7d3d7] bg-[#fff1f2] text-[#be123c]";
  }
  return "border-[#fee4bf] bg-[#fff4df] text-[#b45309]";
  }

function userRoleTone(role: string | null | undefined) {
  const normalized = String(role ?? "").toLowerCase();
  if (normalized === "admin") return "border-[#f7d3d7] bg-[#fff1f2] text-[#be123c]";
  if (normalized === "vendor") return "border-[#d7e6ff] bg-[#eff6ff] text-[#1d4ed8]";
  return "border-[#d2f5e6] bg-[#ecfcf4] text-[#047857]";
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

function parsePositiveInt(
  value: unknown,
  fallback: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
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

  const [assignableVendors, setAssignableVendors] = useState<AdminUser[]>([]);

  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    cuisine: "",
    location: "",
    totalTables: "10",
    priceLevel: "1",
    ownerId: "",
    imageUrl: "",
    contactPhone: "",
    contactEmail: "",
    description: "",
  });

  const [ownerDraftByRestaurantId, setOwnerDraftByRestaurantId] = useState<Record<string, string>>({});
  const [creatingRestaurant, setCreatingRestaurant] = useState(false);
  const [assigningRestaurantId, setAssigningRestaurantId] = useState<string | null>(null);

  const panelClass =
    "rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]";
  const inputClass =
    "rounded-xl border border-[#d8dbe2] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none placeholder:text-[#8b97a8] focus:border-[#b76a73] focus:ring-2 focus:ring-[rgba(183,106,115,0.18)]";
  const selectClass =
    "rounded-xl border border-[#d8dbe2] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b76a73] focus:ring-2 focus:ring-[rgba(183,106,115,0.18)]";
  const ghostButtonClass =
    "rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-3 py-2 text-sm font-semibold text-[#7b2f3b] hover:bg-[#f3dde1]";

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
  const loadAssignableVendors = useCallback(async () => {
    const data = await listAdminUsers({
      role: "all",
      limit: 300,
      offset: 0,
    });

    const vendors = data.filter((item) => {
      const roleValue = normalizeRole(item.role);
      return roleValue === "vendor" || roleValue === "owner" || roleValue === "manager";
    });

    setAssignableVendors(vendors);
  }, []);

  const loadRestaurants = useCallback(async () => {
    const data = await listAdminRestaurants({
      search: restaurantSearch.trim() || undefined,
      limit: 80,
      offset: 0,
    });

    setRestaurants(data);
    setOwnerDraftByRestaurantId((prev) => {
      const next = { ...prev };
      for (const item of data) {
        next[item.id] = item.ownerId ?? "";
      }
      return next;
    });
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
      jobs.push({ label: "assignable vendors", run: loadAssignableVendors });
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
  }, [activeTab, loadAuditLogs, loadAssignableVendors, loadOverview, loadReservations, loadRestaurants, loadUsers]);
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


  async function handleCreateRestaurant() {
    const name = restaurantForm.name.trim();
    const cuisine = restaurantForm.cuisine.trim();
    const location = restaurantForm.location.trim();

    if (!name || !cuisine || !location) {
      setMessage("Restaurant name, cuisine, and location are required.");
      return;
    }

    try {
      setCreatingRestaurant(true);
      setMessage(null);

      const created = await createAdminRestaurant({
        name,
        cuisine,
        location,
        totalTables: parsePositiveInt(restaurantForm.totalTables, 10, 1, 999),
        priceLevel: parsePositiveInt(restaurantForm.priceLevel, 1, 1, 4),
        ownerId: restaurantForm.ownerId.trim() || null,
        imageUrl: restaurantForm.imageUrl.trim() || undefined,
        contactPhone: restaurantForm.contactPhone.trim() || undefined,
        contactEmail: restaurantForm.contactEmail.trim() || undefined,
        description: restaurantForm.description.trim() || undefined,
      });

      setRestaurants((prev) => [created, ...prev]);
      setOwnerDraftByRestaurantId((prev) => ({
        ...prev,
        [created.id]: created.ownerId ?? "",
      }));

      await loadOverview();

      setRestaurantForm({
        name: "",
        cuisine: "",
        location: "",
        totalTables: "10",
        priceLevel: "1",
        ownerId: "",
        imageUrl: "",
        contactPhone: "",
        contactEmail: "",
        description: "",
      });

      setMessage("Restaurant added successfully.");
    } catch (error: any) {
      setMessage(error?.payload?.message ?? error?.message ?? "Failed to create restaurant.");
    } finally {
      setCreatingRestaurant(false);
    }
  }

  async function handleAssignRestaurantOwner(restaurantId: string) {
    const ownerId = String(ownerDraftByRestaurantId[restaurantId] ?? "").trim() || null;

    try {
      setAssigningRestaurantId(restaurantId);
      setMessage(null);

      const updated = await assignAdminRestaurantOwner(restaurantId, ownerId);

      setRestaurants((prev) =>
        prev.map((item) => (item.id === restaurantId ? updated : item)),
      );

      setOwnerDraftByRestaurantId((prev) => ({
        ...prev,
        [restaurantId]: updated.ownerId ?? "",
      }));

      setMessage(ownerId ? "Restaurant assigned to vendor." : "Restaurant assignment cleared.");
    } catch (error: any) {
      setMessage(error?.payload?.message ?? error?.message ?? "Failed to assign restaurant owner.");
    } finally {
      setAssigningRestaurantId(null);
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
      <div className="inline-flex items-center gap-2 text-[#667085]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking admin access...
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="rounded-3xl border border-[#e5e7eb] bg-white p-6 text-[#475467]">
        Login is required to access admin dashboard.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-3xl border border-[#f3c3cc] bg-[#fff1f3] p-6 text-[#9f1239]">
        You do not have admin access.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 text-[#1f2937]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-5xl text-[#1f2937]">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-[#667085]">Platform overview and management</p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-4 py-2.5 text-sm font-semibold text-[#7b2f3b] hover:bg-[#f3dde1] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh
        </button>
      </header>

      {message && (
        <div className="mt-5 rounded-2xl border border-[#f3c3cc] bg-[#fff1f3] px-4 py-3 text-sm text-[#9f1239]">
          {message}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-1">
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
                  ? "bg-[#f8ecee] text-[#7b2f3b]"
                  : "text-[#667085] hover:bg-[#f3f4f6] hover:text-[#1f2937]"
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
                    <span className="text-sm text-[#667085]">{card.label}</span>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f8ecee] text-[#8b3d4a]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[#1f2937]">{card.value}</div>
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
                <article key={card.label} className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-[#8b97a8]">{card.label}</span>
                    <Icon className="h-4 w-4 text-[#b76a73]" />
                  </div>
                  <div className="mt-2 text-xl font-semibold text-[#1f2937]">{card.value}</div>
                </article>
              );
            })}
          </div>

          <article className={panelClass}>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#8b97a8]">Range preset</p>
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
                <p className="text-xs uppercase tracking-wide text-[#8b97a8]">From</p>
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
                <p className="text-xs uppercase tracking-wide text-[#8b97a8]">To</p>
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

              <div className="pb-1 text-xs text-[#8b97a8]">
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
              <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-sm text-[#5b6374]">
                Range: <span className="font-semibold text-[#1f2937]">{chartData?.from ?? chartFrom}</span> to <span className="font-semibold text-[#1f2937]">{chartData?.to ?? chartTo}</span>
              </div>
              <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-sm text-[#5b6374]">
                Completion Rate: <span className="font-semibold text-[#1f2937]">{(chartData?.summary.completionRate ?? 0).toFixed(2)}%</span>
              </div>
              <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-sm text-[#5b6374]">
                Cancellation Rate: <span className="font-semibold text-[#1f2937]">{(chartData?.summary.cancellationRate ?? 0).toFixed(2)}%</span>
              </div>
              <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-sm text-[#5b6374]">
                Revenue in range: <span className="font-semibold text-[#1f2937]">{toPeso(chartData?.summary.totalRevenueMinor ?? 0)}</span>
              </div>
            </div>

            {chartError && (
              <div className="mt-4 rounded-xl border border-[#f3c3cc] bg-[#fff1f3] px-3 py-2 text-sm text-[#9f1239]">
                {chartError}
              </div>
            )}
          </article>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className={panelClass}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-2xl text-[#1f2937]">Reservations by Day</h3>
                {chartLoading && <Loader2 className="h-4 w-4 animate-spin text-[#667085]" />}
              </div>
              <p className="text-xs text-[#8b97a8]">Line chart of total reservations per selected date.</p>
              <div className="mt-3">
                <ReservationsLineChart points={chartData?.days ?? []} />
              </div>
            </article>

            <article className={panelClass}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-2xl text-[#1f2937]">Completion vs Cancellation</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-[#0f766e]">
                    <span className="h-2 w-2 rounded-full bg-[#10b981]" /> completed
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#be123c]">
                    <span className="h-2 w-2 rounded-full bg-[#fb7185]" /> cancelled/declined
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#8b97a8]">Bar chart comparing completed and cancelled reservations by day.</p>
              <div className="mt-3">
                <CompletionBarChart points={chartData?.days ?? []} />
              </div>
            </article>
          </div>

        </section>
      )}

      {activeTab === "users" && (
        <section className={`mt-5 ${panelClass}`}>
          <h2 className="text-3xl text-[#1f2937]">User Management</h2>

          <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by full name"
              className={`${inputClass} w-full sm:w-auto`}
            />

            <select
              value={userRoleFilter}
              onChange={(event) => setUserRoleFilter(event.target.value)}
              className={`${selectClass} w-full sm:w-auto`}
            >
              <option value="all">All roles</option>
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="admin">Admin</option>
            </select>

            <button type="button" onClick={loadUsers} className={`${ghostButtonClass} w-full sm:w-auto`}>
              Apply
            </button>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {users.length === 0 ? (
              <div className="rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] px-4 py-6 text-center text-sm text-[#667085]">
                No users found.
              </div>
            ) : (
              users.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#1f2937]">{item.fullName || shortId(item.id)}</h3>
                      <p className="mt-0.5 break-words text-xs text-[#667085]">{item.email || "-"}</p>
                      <p className="mt-1 text-[11px] text-[#98a2b3]">Joined {toDateTime(item.createdAt)}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${userRoleTone(
                        item.role,
                      )}`}
                    >
                      {toLabel(item.role)}
                    </span>
                  </div>

                  <label className="mt-3 block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">
                      Account role
                    </span>
                    <select
                      value={roleDraftByUserId[item.id] ?? item.role}
                      onChange={(event) =>
                        setRoleDraftByUserId((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                      className={`${selectClass} mt-1 h-10 w-full text-sm`}
                    >
                      <option value="customer">customer</option>
                      <option value="vendor">vendor</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleUpdateUserRole(item.id)}
                    disabled={updatingUserId === item.id}
                    className="mt-3 w-full rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-3 py-2 text-xs font-semibold text-[#7b2f3b] disabled:opacity-60"
                  >
                    {updatingUserId === item.id ? "Saving..." : "Update role"}
                  </button>
                </article>
              ))
            )}
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
              <table className="min-w-[760px] text-sm text-[#374151]">
                <thead className="bg-[#f8fafc]">
                  <tr className="border-b border-[#e5e7eb] text-left text-xs uppercase tracking-wide text-[#8b97a8]">
                    <th className="px-3 py-2.5">User</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5">Joined</th>
                    <th className="px-3 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-[#8b97a8]">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((item) => (
                      <tr key={item.id} className="border-b border-[#f1f5f9] transition hover:bg-[#fcfdff]">
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            <span className="font-medium text-[#1f2937]">{item.fullName || shortId(item.id)}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[#475467]">{item.email || "-"}</td>
                        <td className="px-3 py-3">
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
                        <td className="px-3 py-3 text-[#667085]">{toDateTime(item.createdAt)}</td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => handleUpdateUserRole(item.id)}
                            disabled={updatingUserId === item.id}
                            className="rounded-lg border border-[#d9c3c8] bg-[#f8ecee] px-2.5 py-1 text-xs font-semibold text-[#7b2f3b] disabled:opacity-60"
                          >
                            {updatingUserId === item.id ? "Saving..." : "Update"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === "restaurants" && (
        <section className="mt-5 space-y-4">
          <article className={panelClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-3xl text-[#1f2937]">Add Restaurant</h2>
                <p className="mt-1 text-sm text-[#8b97a8]">Create restaurant details and optionally assign a vendor manager.</p>
              </div>
              <div className="rounded-full border border-[#e7d5d8] bg-[#f8ecee] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#7b2f3b]">Admin only</div>
            </div>

            <div className="mt-6 grid gap-5 rounded-2xl border border-[#eceff4] bg-[#fbfcfe] p-5 md:grid-cols-2 xl:grid-cols-12">
              <label className="space-y-1.5 xl:col-span-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">Name *</span>
                <input
                  value={restaurantForm.name}
                  onChange={(event) =>
                    setRestaurantForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Restaurant name"
                  className={`${inputClass} h-11 w-full`}
                />
              </label>
              <label className="space-y-1.5 xl:col-span-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">Cuisine *</span>
                <input
                  value={restaurantForm.cuisine}
                  onChange={(event) =>
                    setRestaurantForm((prev) => ({ ...prev, cuisine: event.target.value }))
                  }
                  placeholder="Cuisine"
                  className={`${inputClass} h-11 w-full`}
                />
              </label>
              <label className="space-y-1.5 md:col-span-2 xl:col-span-12">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">Location *</span>
                <input
                  value={restaurantForm.location}
                  onChange={(event) =>
                    setRestaurantForm((prev) => ({ ...prev, location: event.target.value }))
                  }
                  placeholder="Address/location"
                  className={`${inputClass} h-11 w-full`}
                />
              </label>
              <label className="space-y-1.5 xl:col-span-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">Total tables</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={restaurantForm.totalTables}
                  onChange={(event) =>
                    setRestaurantForm((prev) => ({ ...prev, totalTables: event.target.value }))
                  }
                  className={`${inputClass} h-11 w-full`}
                />
              </label>
              <label className="space-y-1.5 xl:col-span-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">Price level</span>
                <select
                  value={restaurantForm.priceLevel}
                  onChange={(event) =>
                    setRestaurantForm((prev) => ({ ...prev, priceLevel: event.target.value }))
                  }
                  className={`${selectClass} h-11 w-full`}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </label>
              <label className="space-y-1.5 xl:col-span-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">Assign vendor</span>
                <select
                  value={restaurantForm.ownerId}
                  onChange={(event) =>
                    setRestaurantForm((prev) => ({ ...prev, ownerId: event.target.value }))
                  }
                  className={`${selectClass} h-11 w-full`}
                >
                  <option value="">Unassigned</option>
                  {assignableVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {(vendor.fullName || vendor.email || shortId(vendor.id)) + " (" + vendor.role + ")"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 xl:col-span-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">Image URL</span>
                <input
                  value={restaurantForm.imageUrl}
                  onChange={(event) =>
                    setRestaurantForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                  }
                  placeholder="https://..."
                  className={`${inputClass} h-11 w-full`}
                />
              </label>
              <label className="space-y-1.5 xl:col-span-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">Contact phone</span>
                <input
                  value={restaurantForm.contactPhone}
                  onChange={(event) =>
                    setRestaurantForm((prev) => ({ ...prev, contactPhone: event.target.value }))
                  }
                  placeholder="09xxxxxxxxx"
                  className={`${inputClass} h-11 w-full`}
                />
              </label>
              <label className="space-y-1.5 xl:col-span-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">Contact email</span>
                <input
                  value={restaurantForm.contactEmail}
                  onChange={(event) =>
                    setRestaurantForm((prev) => ({ ...prev, contactEmail: event.target.value }))
                  }
                  placeholder="restaurant@email.com"
                  className={`${inputClass} h-11 w-full`}
                />
              </label>
              <label className="space-y-1.5 md:col-span-2 xl:col-span-12">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">Description</span>
                <textarea
                  value={restaurantForm.description}
                  onChange={(event) =>
                    setRestaurantForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Short restaurant description"
                  rows={3}
                  className={`${inputClass} min-h-[110px] w-full resize-y py-3`}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleCreateRestaurant}
                disabled={creatingRestaurant}
                className="rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-5 py-2.5 text-sm font-semibold text-[#7b2f3b] shadow-sm transition hover:bg-[#f3dde1] disabled:opacity-60"
              >
                {creatingRestaurant ? "Creating..." : "Create Restaurant"}
              </button>
            </div>
          </article>

          <article className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-3xl text-[#1f2937]">Restaurant Management</h2>
              <div className="text-xs text-[#8b97a8]">Assign restaurant owners from vendor accounts</div>
            </div>

            <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
              <input
                value={restaurantSearch}
                onChange={(event) => setRestaurantSearch(event.target.value)}
                placeholder="Search restaurant name/cuisine/location"
                className={`${inputClass} w-full sm:w-[340px]`}
              />
              <button type="button" onClick={loadRestaurants} className={`${ghostButtonClass} w-full sm:w-auto`}>
                Apply
              </button>
            </div>

            <div className="mt-4 space-y-3 md:hidden">
              {restaurants.length === 0 ? (
                <div className="rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] px-4 py-6 text-center text-sm text-[#667085]">
                  No restaurants found.
                </div>
              ) : (
                restaurants.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-[#1f2937]">{item.name}</h3>
                        <p className="mt-1 break-words text-xs text-[#667085]">
                          {item.cuisine} | {item.location}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Active
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-[#ebedf1] bg-white p-2">
                        <div className="text-[10px] uppercase tracking-wide text-[#98a2b3]">Owner</div>
                        <div className="mt-1 break-words text-xs font-medium text-[#344054]">
                          {item.ownerName || item.ownerEmail || (item.ownerId ? shortId(item.ownerId) : "-")}
                        </div>
                      </div>
                      <div className="rounded-xl border border-[#ebedf1] bg-white p-2">
                        <div className="text-[10px] uppercase tracking-wide text-[#98a2b3]">Performance</div>
                        <div className="mt-1 text-xs font-medium text-[#344054]">
                          {item.totalTables} tables | {item.rating.toFixed(1)} rating
                        </div>
                      </div>
                    </div>

                    <label className="mt-3 block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">
                        Assign vendor
                      </span>
                      <select
                        value={ownerDraftByRestaurantId[item.id] ?? item.ownerId ?? ""}
                        onChange={(event) =>
                          setOwnerDraftByRestaurantId((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                        className={`${selectClass} mt-1 h-10 w-full text-xs`}
                      >
                        <option value="">Unassigned</option>
                        {assignableVendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {(vendor.fullName || vendor.email || shortId(vendor.id)) + " (" + vendor.role + ")"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleAssignRestaurantOwner(item.id)}
                      disabled={assigningRestaurantId === item.id}
                      className="mt-3 w-full rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-3 py-2 text-xs font-semibold text-[#7b2f3b] disabled:opacity-60"
                    >
                      {assigningRestaurantId === item.id ? "Saving..." : "Save assignment"}
                    </button>
                  </article>
                ))
              )}
            </div>

            <div className="mt-4 hidden overflow-x-auto md:block">
              <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
                <table className="min-w-[860px] text-sm text-[#374151]">
                  <thead className="bg-[#f8fafc]">
                    <tr className="border-b border-[#e5e7eb] text-left text-xs uppercase tracking-wide text-[#8b97a8]">
                      <th className="px-3 py-2.5">Restaurant</th>
                      <th className="px-3 py-2.5">Owner</th>
                      <th className="px-3 py-2.5">Assign Vendor</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Tables</th>
                      <th className="px-3 py-2.5">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-[#8b97a8]">
                          No restaurants found.
                        </td>
                      </tr>
                    ) : (
                      restaurants.map((item) => (
                        <tr key={item.id} className="border-b border-[#f1f5f9] align-top transition hover:bg-[#fcfdff]">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-[#1f2937]">{item.name}</div>
                            <div className="mt-0.5 text-xs text-[#8b97a8]">
                              {item.cuisine} | {item.location}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[#475467]">
                            {item.ownerName || item.ownerEmail || (item.ownerId ? shortId(item.ownerId) : "-")}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex min-w-[280px] items-center gap-2">
                              <select
                                value={ownerDraftByRestaurantId[item.id] ?? item.ownerId ?? ""}
                                onChange={(event) =>
                                  setOwnerDraftByRestaurantId((prev) => ({
                                    ...prev,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                className={`${selectClass} min-w-[190px] rounded-lg px-2 py-1 text-xs`}
                              >
                                <option value="">Unassigned</option>
                                {assignableVendors.map((vendor) => (
                                  <option key={vendor.id} value={vendor.id}>
                                    {(vendor.fullName || vendor.email || shortId(vendor.id)) +
                                      " (" +
                                      vendor.role +
                                      ")"}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleAssignRestaurantOwner(item.id)}
                                disabled={assigningRestaurantId === item.id}
                                className="rounded-lg border border-[#d9c3c8] bg-[#f8ecee] px-2.5 py-1 text-xs font-semibold text-[#7b2f3b] disabled:opacity-60"
                              >
                                {assigningRestaurantId === item.id ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              Active
                            </span>
                          </td>
                          <td className="px-3 py-3 text-[#475467]">{item.totalTables}</td>
                          <td className="px-3 py-3 text-[#475467]">{item.rating.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        </section>
      )}
      {activeTab === "reservations" && (
        <section className={`mt-5 ${panelClass}`}>
          <h2 className="text-3xl text-[#1f2937]">All Reservations</h2>

          <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
            <select
              value={reservationStatusFilter}
              onChange={(event) => setReservationStatusFilter(event.target.value)}
              className={`${selectClass} w-full sm:w-auto`}
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
              className={`${selectClass} w-full sm:w-auto`}
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
              className={`${inputClass} w-full sm:w-auto`}
            />

            <button type="button" onClick={loadReservations} className={`${ghostButtonClass} w-full sm:w-auto`}>
              Apply Filters
            </button>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {reservations.length === 0 ? (
              <div className="rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] px-4 py-6 text-center text-sm text-[#667085]">
                No reservations found.
              </div>
            ) : (
              reservations.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-[#8b97a8]">{shortId(item.id)}</div>
                      <div className="mt-1 text-sm font-semibold text-[#1f2937]">
                        {item.restaurant_name || shortId(item.restaurant_id)}
                      </div>
                      <div className="mt-0.5 break-words text-xs text-[#667085]">
                        {item.user_name || item.user_email || shortId(item.user_id)}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${reservationStatusTone(
                        item.status,
                      )}`}
                    >
                      {toLabel(item.status)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-[#ebedf1] bg-white p-2">
                      <div className="text-[10px] uppercase tracking-wide text-[#98a2b3]">Date/Time</div>
                      <div className="mt-1 text-xs font-medium text-[#344054]">
                        {item.date} {item.time}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#ebedf1] bg-white p-2">
                      <div className="text-[10px] uppercase tracking-wide text-[#98a2b3]">Guests</div>
                      <div className="mt-1 text-xs font-medium text-[#344054]">{item.guests}</div>
                    </div>
                    <div className="rounded-xl border border-[#ebedf1] bg-white p-2">
                      <div className="text-[10px] uppercase tracking-wide text-[#98a2b3]">Payment</div>
                      <div className="mt-1">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${paymentStatusTone(
                            item.payment_status || "unpaid",
                          )}`}
                        >
                          {toLabel(item.payment_status || "unpaid")}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#ebedf1] bg-white p-2">
                      <div className="text-[10px] uppercase tracking-wide text-[#98a2b3]">Amount</div>
                      <div className="mt-1 text-xs font-semibold text-[#7b2f3b]">{toPeso(item.payment_amount ?? 0)}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7d8798]">
                        Update status
                      </span>
                      <select
                        value={statusDraftByReservationId[item.id] ?? item.status}
                        onChange={(event) =>
                          setStatusDraftByReservationId((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                        className={`${selectClass} h-10 w-full text-sm`}
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="declined">declined</option>
                        <option value="cancelled">cancelled</option>
                        <option value="completed">completed</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleUpdateReservationStatus(item.id)}
                      disabled={updatingReservationId === item.id}
                      className="w-full rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-3 py-2 text-xs font-semibold text-[#7b2f3b] disabled:opacity-60"
                    >
                      {updatingReservationId === item.id ? "Saving..." : "Update reservation"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
              <table className="min-w-[980px] text-sm text-[#374151]">
                <thead className="bg-[#f8fafc]">
                  <tr className="border-b border-[#e5e7eb] text-left text-xs uppercase tracking-wide text-[#8b97a8]">
                    <th className="px-3 py-2.5">ID</th>
                    <th className="px-3 py-2.5">User</th>
                    <th className="px-3 py-2.5">Restaurant</th>
                    <th className="px-3 py-2.5">Date/Time</th>
                    <th className="px-3 py-2.5">Guests</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Payment</th>
                    <th className="px-3 py-2.5">Amount</th>
                    <th className="px-3 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-sm text-[#8b97a8]">
                        No reservations found.
                      </td>
                    </tr>
                  ) : (
                    reservations.map((item) => (
                      <tr key={item.id} className="border-b border-[#f1f5f9] transition hover:bg-[#fcfdff]">
                        <td className="px-3 py-3 text-[#667085]">{shortId(item.id)}</td>
                        <td className="px-3 py-3 text-[#475467]">
                          {item.user_name || item.user_email || shortId(item.user_id)}
                        </td>
                        <td className="px-3 py-3 text-[#475467]">{item.restaurant_name || shortId(item.restaurant_id)}</td>
                        <td className="px-3 py-3 text-[#475467]">
                          {item.date} {item.time}
                        </td>
                        <td className="px-3 py-3 text-[#475467]">{item.guests}</td>
                        <td className="px-3 py-3">
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
                        <td className="px-3 py-3 text-[#475467]">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${paymentStatusTone(
                              item.payment_status || "unpaid",
                            )}`}
                          >
                            {toLabel(item.payment_status || "unpaid")}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[#475467]">{toPeso(item.payment_amount ?? 0)}</td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => handleUpdateReservationStatus(item.id)}
                            disabled={updatingReservationId === item.id}
                            className="rounded-lg border border-[#d9c3c8] bg-[#f8ecee] px-2.5 py-1 text-xs font-semibold text-[#7b2f3b] disabled:opacity-60"
                          >
                            {updatingReservationId === item.id ? "Saving..." : "Update"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-xs italic text-[#8b97a8]">
            Each completed reservation can be used for commission tracking later.
          </p>
        </section>
      )}

      {activeTab === "audit" && (
        <section className={`mt-5 ${panelClass}`}>
          <h2 className="text-3xl text-[#1f2937]">Admin Audit Logs</h2>

          <div className="mt-4 space-y-3 md:hidden">
            {auditLogs.map((log) => (
              <article
                key={log.id}
                className="rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-[#1f2937]">{log.action}</div>
                  <div className="text-[11px] text-[#8b97a8]">{toDateTime(log.created_at)}</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[#ebedf1] bg-white p-2">
                    <div className="text-[10px] uppercase tracking-wide text-[#98a2b3]">Actor</div>
                    <div className="mt-1 text-xs text-[#344054]">{shortId(log.actor_id)}</div>
                  </div>
                  <div className="rounded-xl border border-[#ebedf1] bg-white p-2">
                    <div className="text-[10px] uppercase tracking-wide text-[#98a2b3]">Target</div>
                    <div className="mt-1 text-xs text-[#344054]">
                      {log.target_type} ({shortId(log.target_id)})
                    </div>
                  </div>
                </div>
                <details className="mt-2 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[#7b2f3b]">
                    View payload JSON
                  </summary>
                  <pre className="max-h-56 overflow-auto border-t border-[#eef1f4] bg-[#f8fafc] p-2 text-[11px] text-[#475467]">
                    {JSON.stringify(log.payload ?? {}, null, 2)}
                  </pre>
                </details>
              </article>
            ))}
            {auditLogs.length === 0 && (
              <div className="rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4 text-sm text-[#667085]">
                No audit logs available.
              </div>
            )}
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
              <table className="min-w-[980px] text-sm text-[#374151]">
                <thead className="bg-[#f8fafc]">
                  <tr className="border-b border-[#e5e7eb] text-left text-xs uppercase tracking-wide text-[#8b97a8]">
                    <th className="px-3 py-2.5">Action</th>
                    <th className="px-3 py-2.5">Actor</th>
                    <th className="px-3 py-2.5">Target</th>
                    <th className="px-3 py-2.5">Created</th>
                    <th className="px-3 py-2.5">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-[#8b97a8]">
                        No audit logs available.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-[#f1f5f9] align-top transition hover:bg-[#fcfdff]">
                        <td className="px-3 py-3 font-semibold text-[#1f2937]">{log.action}</td>
                        <td className="px-3 py-3 text-[#475467]">{shortId(log.actor_id)}</td>
                        <td className="px-3 py-3 text-[#475467]">
                          {log.target_type} ({shortId(log.target_id)})
                        </td>
                        <td className="px-3 py-3 text-[#667085]">{toDateTime(log.created_at)}</td>
                        <td className="px-3 py-3">
                          <details className="w-full overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
                            <summary className="cursor-pointer px-2 py-1.5 text-xs font-semibold text-[#7b2f3b]">
                              View JSON
                            </summary>
                            <pre className="max-h-52 overflow-auto border-t border-[#eef1f4] bg-[#f8fafc] p-2 text-[11px] text-[#475467]">
                              {JSON.stringify(log.payload ?? {}, null, 2)}
                            </pre>
                          </details>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
  }


