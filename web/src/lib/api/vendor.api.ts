import { api } from "./client";
import { supabase } from "../supabase";
import { env } from "../config/env";

export type VendorOverview = {
  restaurantCount: number;
  reservationCount: number;
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
  paidCount: number;
  totalPaidAmountMinor: number;
};

export type VendorRestaurant = {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  rating: number;
  priceLevel: number;
  description: string | null;
  imageUrl: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  ownerId: string | null;
  totalTables: number;
  createdAt: string | null;
};

export type VendorRestaurantInput = {
  name: string;
  cuisine: string;
  location: string;
  description?: string;
  imageUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  rating?: number;
  priceLevel?: number;
  totalTables?: number;
};

export type VendorSlotConfig = {
  time: string;
  maxTables: number;
  isActive: boolean;
};

export type VendorSlotsResponse = {
  restaurantId: string;
  dayOfWeek: number;
  slots: VendorSlotConfig[];
  defaultMaxTables: number;
  source: "configured" | "empty" | string;
};

export type VendorReservation = {
  id: string;
  restaurant_id: string;
  user_id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: string;
  created_at: string;
  payment_status?: string | null;
  payment_amount?: number | null;
  payment_provider?: string | null;
  payment_paid_at?: string | null;
  payment_reference?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  decline_reason?: string | null;
  restaurant?: {
    id: string;
    name: string;
    cuisine?: string | null;
    location?: string | null;
  } | null;
};

function inferImageExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName;
  }

  const fromMime = String(file.type || "").toLowerCase();
  if (fromMime === "image/png") return "png";
  if (fromMime === "image/webp") return "webp";
  if (fromMime === "image/gif") return "gif";
  return "jpg";
}

function getImageBucketCandidates() {
  const configured = String(env.RESTAURANT_IMAGE_BUCKET || "").trim();

  const candidates = [
    configured,
    "restaurant-images",
    "restaurants_img",
    "restaurant_img",
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}

function isBucketNotFoundError(error: unknown) {
  const message = String((error as { message?: string })?.message ?? "").toLowerCase();
  const code = String((error as { code?: string })?.code ?? "").toLowerCase();

  return (
    message.includes("bucket") && message.includes("not found")
  ) || code === "404";
}

export async function uploadVendorRestaurantImage(file: File) {
  const mime = String(file.type || "").toLowerCase();
  if (!mime.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const maxSizeBytes = 8 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error("Image must be 8MB or smaller.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    throw new Error("Login required to upload image.");
  }

  const extension = inferImageExtension(file);
  const randomId = Math.random().toString(36).slice(2, 10);
  const filePath = `${userId}/${Date.now()}-${randomId}.${extension}`;

  const buckets = getImageBucketCandidates();
  let lastError: Error | null = null;

  for (const bucket of buckets) {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: mime || undefined,
      });

    if (uploadError) {
      if (isBucketNotFoundError(uploadError)) {
        lastError = new Error(uploadError.message);
        continue;
      }

      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (!data?.publicUrl) {
      throw new Error("Unable to generate image URL.");
    }

    return data.publicUrl;
  }

  if (lastError) {
    throw new Error(
      `Bucket not found. Checked buckets: ${buckets.join(", ")}. Set REACT_APP_RESTAURANT_IMAGE_BUCKET if needed.`,
    );
  }

  throw new Error("Image upload failed.");
}

export function getVendorOverview() {
  return api<VendorOverview>("/vendor/overview");
}

export function listVendorRestaurants() {
  return api<VendorRestaurant[]>("/vendor/restaurants");
}

export function createVendorRestaurant(payload: VendorRestaurantInput) {
  return api<VendorRestaurant>("/vendor/restaurants", {
    method: "POST",
    body: payload,
  });
}

export function updateVendorRestaurant(
  restaurantId: string,
  payload: Partial<VendorRestaurantInput>,
) {
  return api<VendorRestaurant>(`/vendor/restaurants/${restaurantId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function getVendorRestaurant(restaurantId: string) {
  return api<VendorRestaurant>(`/vendor/restaurants/${restaurantId}`);
}

export function getVendorRestaurantSlots(restaurantId: string, dayOfWeek: number) {
  return api<VendorSlotsResponse>(
    `/vendor/restaurants/${restaurantId}/slots?dayOfWeek=${dayOfWeek}`,
  );
}

export function saveVendorRestaurantSlots(
  restaurantId: string,
  dayOfWeek: number,
  slots: VendorSlotConfig[],
) {
  return api<VendorSlotsResponse>(`/vendor/restaurants/${restaurantId}/slots`, {
    method: "PUT",
    body: {
      dayOfWeek,
      slots,
    },
  });
}

export function listVendorReservations(params?: {
  restaurantId?: string;
  status?: string;
  date?: string;
}) {
  const search = new URLSearchParams();

  if (params?.restaurantId) search.set("restaurantId", params.restaurantId);
  if (params?.status) search.set("status", params.status);
  if (params?.date) search.set("date", params.date);

  const query = search.toString();
  const path = query ? `/vendor/reservations?${query}` : "/vendor/reservations";

  return api<VendorReservation[]>(path);
}

export function decideVendorReservation(
  reservationId: string,
  action: "approve" | "decline",
  reason?: string,
) {
  return api<{ reservation: VendorReservation; message: string }>(
    `/vendor/reservations/${reservationId}/decision`,
    {
      method: "POST",
      body: {
        action,
        reason,
      },
    },
  );
}


