import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Loader2,
  Plus,
  Store,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createVendorBestSeller,
  deleteVendorBestSeller,
  getVendorRestaurant,
  listVendorRestaurantBestSellers,
  updateVendorBestSeller,
  uploadVendorRestaurantImage,
  VendorBestSeller,
  VendorRestaurant,
} from "../lib/api/vendor.api";
import { ApiError } from "../lib/api/client";
import { useAuth } from "../lib/auth/useAuth";
import VendorPageReveal from "../components/vendor/VendorPageReveal";

type FormState = {
  name: string;
  pricePhp: string;
  imageUrl: string;
  stockQuantity: string;
  soldCount: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  pricePhp: "",
  imageUrl: "",
  stockQuantity: "0",
  soldCount: "0",
  isActive: true,
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const payload = error.payload as { message?: string } | undefined;
    return payload?.message ?? fallback;
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

function toPeso(minor: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
}

function parsePriceMinor(pricePhp: string) {
  const value = Number(String(pricePhp || "").trim());
  if (!Number.isFinite(value)) return null;
  const minor = Math.round(value * 100);
  if (minor <= 0) return null;
  return minor;
}

function parseNonNegativeInt(value: string, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function csvCell(value: string | number | boolean) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
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

export default function VendorBestSellersPage() {
  const { restaurantId = "" } = useParams<{ restaurantId: string }>();
  const { isAuthed, loading: authLoading } = useAuth();

  const [restaurant, setRestaurant] = useState<VendorRestaurant | null>(null);
  const [items, setItems] = useState<VendorBestSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savingCreate, setSavingCreate] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!isAuthed || !restaurantId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setMessage(null);

        const [restaurantData, bestSellerData] = await Promise.all([
          getVendorRestaurant(restaurantId),
          listVendorRestaurantBestSellers(restaurantId),
        ]);

        if (!alive) return;

        setRestaurant(restaurantData);
        setItems(bestSellerData);
      } catch (error) {
        if (!alive) return;
        setMessage(getErrorMessage(error, "Unable to load best sellers."));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [isAuthed, restaurantId]);

  const summary = useMemo(() => {
    const activeCount = items.filter((item) => item.isActive).length;
    const stock = items.reduce((sum, item) => sum + Math.max(0, Number(item.stockQuantity) || 0), 0);
    const sold = items.reduce((sum, item) => sum + Math.max(0, Number(item.soldCount) || 0), 0);
    const estimatedRevenueMinor = items.reduce(
      (sum, item) => sum + (Number(item.priceMinor) || 0) * (Number(item.soldCount) || 0),
      0,
    );

    return {
      activeCount,
      stock,
      sold,
      estimatedRevenueMinor,
    };
  }, [items]);

  async function handleUploadImage(file: File) {
    try {
      setUploadingImage(true);
      setMessage(null);
      const publicUrl = await uploadVendorRestaurantImage(file);
      setForm((prev) => ({
        ...prev,
        imageUrl: publicUrl,
      }));
      setMessage("Image uploaded successfully.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to upload image."));
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await handleUploadImage(file);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const priceMinor = parsePriceMinor(form.pricePhp);
    if (!name) {
      setMessage("Best seller name is required.");
      return;
    }

    if (!priceMinor) {
      setMessage("Price must be greater than 0.");
      return;
    }

    try {
      setSavingCreate(true);
      setMessage(null);

      const created = await createVendorBestSeller(restaurantId, {
        name,
        priceMinor,
        imageUrl: form.imageUrl.trim() || undefined,
        stockQuantity: parseNonNegativeInt(form.stockQuantity, 0),
        soldCount: parseNonNegativeInt(form.soldCount, 0),
        isActive: form.isActive,
      });

      setItems((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      setMessage("Best seller item added.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to create best seller."));
    } finally {
      setSavingCreate(false);
    }
  }

  async function patchItem(item: VendorBestSeller, payload: Record<string, unknown>) {
    try {
      setSavingItemId(item.id);
      setMessage(null);

      const updated = await updateVendorBestSeller(restaurantId, item.id, payload);

      setItems((prev) =>
        prev.map((current) => (current.id === item.id ? updated : current)),
      );
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to update item."));
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleDelete(item: VendorBestSeller) {
    const ok = window.confirm(`Remove ${item.name} from best sellers?`);
    if (!ok) return;

    try {
      setDeletingItemId(item.id);
      setMessage(null);
      await deleteVendorBestSeller(restaurantId, item.id);
      setItems((prev) => prev.filter((current) => current.id !== item.id));
      setMessage("Item removed.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to delete item."));
    } finally {
      setDeletingItemId(null);
    }
  }

  function handleExportInventoryCsv() {
    if (!items.length) {
      setMessage("No best-seller inventory to export.");
      return;
    }

    const headers = [
      "restaurant_id",
      "restaurant_name",
      "item_id",
      "item_name",
      "price_minor",
      "price_php",
      "stock_quantity",
      "sold_count",
      "is_active",
      "estimated_revenue_php",
      "updated_at",
    ];

    const rows = items.map((item) => [
      item.restaurantId,
      item.restaurantName ?? restaurant?.name ?? "",
      item.id,
      item.name,
      item.priceMinor,
      (item.priceMinor / 100).toFixed(2),
      item.stockQuantity,
      item.soldCount,
      item.isActive,
      ((item.priceMinor * item.soldCount) / 100).toFixed(2),
      item.updatedAt ?? "",
    ]);

    downloadCsv(
      `vendor-best-sellers-${restaurantId}-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    );
  }

  if (authLoading) {
    return (
      <div className="relative min-h-[calc(100vh-72px)] w-full bg-[#f3f3f4] text-[#1f2937]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="inline-flex items-center gap-2 text-[#5b6374]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking session...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="relative min-h-[calc(100vh-72px)] w-full bg-[#f3f3f4] text-[#1f2937]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#4b5563]">
            Login is required to manage best sellers.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] w-full bg-[#f3f3f4] text-[#1f2937]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b3d4a]">
              Vendor Portal
            </p>
            <h1 className="mt-2 text-5xl text-[#1f2937]">Best Sellers</h1>
            <p className="mt-1 text-sm text-[#5b6374]">
              Add and maintain menu highlights for {restaurant?.name ?? "your restaurant"}.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/vendor/tables"
              className="inline-flex items-center gap-2 rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-xs font-semibold text-[#4b5563] hover:bg-[#f8fafc]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Tables
            </Link>

            <button
              type="button"
              onClick={handleExportInventoryCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-3 py-2 text-xs font-semibold text-[#7b2f3b] hover:bg-[#f3dde1]"
            >
              <Download className="h-3.5 w-3.5" />
              Export Inventory
            </button>
          </div>
        </header>

        {message && (
          <div className="mt-5 rounded-2xl border border-[#f2cccf] bg-[#fff6f7] px-4 py-3 text-sm text-[#9f1239]">
            {message}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-4">
          <article className="rounded-2xl border border-[#e8e2e3] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.16em] text-[#8b97a8]">Items</div>
            <div className="mt-2 text-3xl font-semibold text-[#1f2937]">{items.length}</div>
          </article>
          <article className="rounded-2xl border border-[#e8e2e3] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.16em] text-[#8b97a8]">Active</div>
            <div className="mt-2 text-3xl font-semibold text-[#1f2937]">{summary.activeCount}</div>
          </article>
          <article className="rounded-2xl border border-[#e8e2e3] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.16em] text-[#8b97a8]">Stock Units</div>
            <div className="mt-2 text-3xl font-semibold text-[#1f2937]">{summary.stock}</div>
          </article>
          <article className="rounded-2xl border border-[#e8e2e3] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <div className="text-xs uppercase tracking-[0.16em] text-[#8b97a8]">Estimated Revenue</div>
            <div className="mt-2 text-3xl font-semibold text-[#7b2f3b]">{toPeso(summary.estimatedRevenueMinor)}</div>
          </article>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <h2 className="text-3xl text-[#1f2937]">Add Best Seller</h2>

            <form className="mt-4 space-y-3" onSubmit={handleCreate}>
              <label className="block text-sm text-[#4b5563]">
                Item Name
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
                  placeholder="Lechon Belly"
                  required
                />
              </label>

              <label className="block text-sm text-[#4b5563]">
                Price (PHP)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.pricePhp}
                  onChange={(event) => setForm((prev) => ({ ...prev, pricePhp: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
                  placeholder="150.00"
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-[#4b5563]">
                  Stock Quantity
                  <input
                    type="number"
                    min={0}
                    value={form.stockQuantity}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, stockQuantity: event.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
                  />
                </label>

                <label className="text-sm text-[#4b5563]">
                  Sold Count
                  <input
                    type="number"
                    min={0}
                    value={form.soldCount}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, soldCount: event.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
                  />
                </label>
              </div>

              <label className="block text-sm text-[#4b5563]">
                Image URL
                <input
                  value={form.imageUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
                  placeholder="https://..."
                />

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById("best-seller-image-upload")?.click()}
                    disabled={uploadingImage}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-3 py-2 text-xs font-semibold text-[#7b2f3b] hover:bg-[#f3dde1] disabled:opacity-60"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {uploadingImage ? "Uploading..." : "Upload Image"}
                  </button>

                  <input
                    id="best-seller-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                </div>
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-[#4b5563]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-[#d1d5db]"
                />
                Active item
              </label>

              <button
                type="submit"
                disabled={savingCreate}
                className="inline-flex items-center gap-2 rounded-xl border border-[#c98d98] bg-[#f8ecee] px-4 py-2.5 text-sm font-semibold text-[#7b2f3b] hover:bg-[#f3dde1] disabled:opacity-60"
              >
                {savingCreate ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Best Seller
                  </>
                )}
              </button>
            </form>
          </article>

          <article className="rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <h2 className="text-3xl text-[#1f2937]">Inventory</h2>

            {loading ? (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#5b6374]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading items...
              </div>
            ) : (
              <VendorPageReveal>
                {items.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4 text-sm text-[#5b6374]">
                No best seller items yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {items.map((item) => {
                  const itemSaving = savingItemId === item.id;
                  const itemDeleting = deletingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-14 w-14 rounded-xl border border-[#e5e7eb] object-cover"
                            />
                          ) : (
                            <div className="grid h-14 w-14 place-items-center rounded-xl border border-[#e5e7eb] bg-white text-[#8b97a8]">
                              <Store className="h-4 w-4" />
                            </div>
                          )}

                          <div>
                            <div className="text-sm font-semibold text-[#1f2937]">{item.name}</div>
                            <div className="text-xs text-[#6b7280]">{toPeso(item.priceMinor)}</div>
                            <div className="mt-1 text-xs text-[#6b7280]">
                              Stock: {item.stockQuantity} | Sold: {item.soldCount}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            item.isActive
                              ? "border-[#b7e4c7] bg-[#ecfdf3] text-[#166534]"
                              : "border-[#e5d5d9] bg-[#f8f4f5] text-[#6b5561]"
                          }`}
                        >
                          {item.isActive ? "active" : "inactive"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={itemSaving}
                          onClick={() => patchItem(item, { isActive: !item.isActive })}
                          className="rounded-lg border border-[#d8dbe2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#f8fafc] disabled:opacity-60"
                        >
                          {itemSaving ? "Saving..." : item.isActive ? "Set Inactive" : "Set Active"}
                        </button>

                        <button
                          type="button"
                          disabled={itemSaving}
                          onClick={() => patchItem(item, { soldCount: item.soldCount + 1 })}
                          className="rounded-lg border border-[#d8dbe2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#f8fafc] disabled:opacity-60"
                        >
                          + Sold
                        </button>

                        <button
                          type="button"
                          disabled={itemSaving}
                          onClick={() => patchItem(item, { stockQuantity: item.stockQuantity + 1 })}
                          className="rounded-lg border border-[#d8dbe2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#f8fafc] disabled:opacity-60"
                        >
                          + Stock
                        </button>

                        <button
                          type="button"
                          disabled={itemSaving || item.stockQuantity <= 0}
                          onClick={() =>
                            patchItem(item, {
                              stockQuantity: Math.max(0, item.stockQuantity - 1),
                            })
                          }
                          className="rounded-lg border border-[#d8dbe2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#f8fafc] disabled:opacity-60"
                        >
                          - Stock
                        </button>

                        <button
                          type="button"
                          disabled={itemDeleting}
                          onClick={() => handleDelete(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#f5c2c7] bg-[#fff1f2] px-2.5 py-1.5 text-xs font-semibold text-[#be123c] hover:bg-[#ffe4e8] disabled:opacity-60"
                        >
                          {itemDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
                )}
              </VendorPageReveal>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}

