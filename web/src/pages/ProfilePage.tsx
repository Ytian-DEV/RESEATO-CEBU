import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Mail,
  PencilLine,
  Phone,
  Shield,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth/useAuth";

type ProfileRow = {
  id: string;
  full_name?: string | null;
  role?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
};

type PersonalInfo = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  memberSince: string;
  avatarUrl: string;
};

type EditForm = {
  fullName: string;
  phone: string;
};

const AVATAR_BUCKET = "profile-photos";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

function capitalize(value: string) {
  if (!value) return "";
  return value[0].toUpperCase() + value.slice(1).toLowerCase();
}

function formatDate(dateRaw: string) {
  const dt = new Date(dateRaw);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toInitials(fullName: string, email: string) {
  const parts = fullName
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return email.slice(0, 2).toUpperCase() || "CU";
}

function deriveFromMetadata(user: {
  email?: string | null;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstName =
    typeof metadata.first_name === "string" ? metadata.first_name : "";
  const lastName =
    typeof metadata.last_name === "string" ? metadata.last_name : "";
  const role = typeof metadata.role === "string" ? metadata.role : "customer";
  const phone = typeof metadata.phone === "string" ? metadata.phone : "";
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : "";

  const fullName =
    `${firstName} ${lastName}`.trim() ||
    (typeof metadata.full_name === "string" ? metadata.full_name : "") ||
    (user.email ? user.email.split("@")[0] : "Customer");

  return { fullName, role, phone, avatarUrl };
}

async function upsertProfileWithFallback(payload: Record<string, unknown>) {
  let current = { ...payload };

  for (let i = 0; i < 4; i += 1) {
    const result = await supabase
      .from("profiles")
      .upsert(current, { onConflict: "id" })
      .select("*")
      .single();

    if (!result.error) return result;

    const msg = result.error.message.toLowerCase();
    let changed = false;

    if (msg.includes("phone") && "phone" in current) {
      delete (current as Record<string, unknown>).phone;
      changed = true;
    }

    if (msg.includes("avatar_url") && "avatar_url" in current) {
      delete (current as Record<string, unknown>).avatar_url;
      changed = true;
    }

    if (!changed) return result;
  }

  return supabase
    .from("profiles")
    .upsert(current, { onConflict: "id" })
    .select("*")
    .single();
}

function InfoRow(props: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#ece8e9] bg-[#fafafa] p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#e0cfd4] bg-[#f8ecee] text-[#8b3d4a]">
          {props.icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            {props.label}
          </div>
          <div className="truncate text-sm font-medium text-[#1f2937]">
            {props.value || "Not provided"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading, isAuthed } = useAuth();
  const [details, setDetails] = useState<PersonalInfo | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({
    fullName: "",
    phone: "",
  });

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!user) return;

      setMessage(null);

      const fallback = deriveFromMetadata(user);
      const fallbackDetails: PersonalInfo = {
        fullName: fallback.fullName,
        email: user.email ?? "",
        phone: fallback.phone,
        role: capitalize(fallback.role),
        memberSince: formatDate(user.created_at || ""),
        avatarUrl: fallback.avatarUrl,
      };

      if (alive) {
        setDetails(fallbackDetails);
        setForm({
          fullName: fallbackDetails.fullName,
          phone: fallbackDetails.phone,
        });
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        if (!alive) return;
        setMessage("Using account metadata. Profile table access failed.");
        return;
      }

      let profile = data as ProfileRow | null;

      if (!profile) {
        const createAttempt = await upsertProfileWithFallback({
          id: user.id,
          full_name: fallback.fullName,
          phone: fallback.phone || null,
          avatar_url: fallback.avatarUrl || null,
        });

        if (createAttempt.error) {
          if (!alive) return;
          setMessage("Profile row not found. Showing account metadata.");
          return;
        }

        profile = createAttempt.data as ProfileRow;
      }

      if (!alive || !profile) return;

      const merged: PersonalInfo = {
        fullName: profile.full_name?.trim() || fallback.fullName,
        email: user.email ?? "",
        phone: profile.phone?.trim() || fallback.phone,
        role: capitalize(profile.role?.trim() || fallback.role),
        memberSince: formatDate(profile.created_at || user.created_at || ""),
        avatarUrl: profile.avatar_url?.trim() || fallback.avatarUrl,
      };

      setDetails(merged);
      setForm({
        fullName: merged.fullName,
        phone: merged.phone,
      });
    }

    load();

    return () => {
      alive = false;
    };
  }, [user]);

  const initials = useMemo(() => {
    if (!details) return "CU";
    return toInitials(details.fullName, details.email);
  }, [details]);

  function openAvatarPicker() {
    avatarInputRef.current?.click();
  }

  async function onAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !user || !details) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setMessage("Please use JPG, PNG, or WEBP image files.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setMessage("Profile photo is too large. Max size is 5MB.");
      event.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase
        .storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase
        .storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);

      const avatarUrl = publicData.publicUrl;

      const profileAttempt = await upsertProfileWithFallback({
        id: user.id,
        full_name: details.fullName,
        phone: details.phone || null,
        avatar_url: avatarUrl,
      });

      let profileWarning: string | null = null;
      if (profileAttempt.error) {
        profileWarning = "Photo uploaded, but profile row could not store avatar_url.";
      }

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          avatar_url: avatarUrl,
        },
      });

      if (authError) throw authError;

      setDetails((prev) =>
        prev
          ? {
              ...prev,
              avatarUrl,
            }
          : prev,
      );

      setMessage(profileWarning ?? "Profile photo updated.");
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to upload profile photo.");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!user || !details) return;

    setSaving(true);
    setMessage(null);

    const cleanName = form.fullName.trim();
    const cleanPhone = form.phone.trim();

    let profileWarning: string | null = null;

    try {
      const upsert = await upsertProfileWithFallback({
        id: user.id,
        full_name: cleanName,
        phone: cleanPhone || null,
        avatar_url: details.avatarUrl || null,
      });

      const updatedProfile = upsert.error ? null : (upsert.data as ProfileRow);

      if (upsert.error) {
        profileWarning = "Profile table update failed. Saved to auth metadata only.";
      }

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const nameParts = cleanName
        .split(" ")
        .map((p) => p.trim())
        .filter(Boolean);
      const firstName = nameParts[0] ?? "";
      const lastName = nameParts.slice(1).join(" ");

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          full_name: cleanName,
          first_name: firstName,
          last_name: lastName,
          phone: cleanPhone,
          avatar_url: details.avatarUrl,
        },
      });

      if (authError) throw authError;

      const merged: PersonalInfo = {
        fullName: updatedProfile?.full_name?.trim() || cleanName,
        email: user.email ?? "",
        phone: updatedProfile?.phone?.trim() || cleanPhone,
        role: capitalize(updatedProfile?.role?.trim() || details.role),
        memberSince: details.memberSince,
        avatarUrl: updatedProfile?.avatar_url?.trim() || details.avatarUrl,
      };

      setDetails(merged);
      setForm({
        fullName: merged.fullName,
        phone: merged.phone,
      });
      setEditOpen(false);
      setMessage(profileWarning ?? "Profile updated.");
    } catch (err: any) {
      setMessage(err?.message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-10 text-[#6b7280]">Loading profile...</div>;
  }

  if (!isAuthed || !user) {
    return (
      <div className="py-12">
        <div className="rounded-2xl border border-[#e8e2e3] bg-white p-6 text-[#4b5563]">
          <p>You need to log in to view your profile.</p>
          <Link
            to="/log-in-sign-up"
            className="mt-4 inline-flex rounded-xl border border-[#d8c0c6] bg-[#f8ecee] px-4 py-2 text-sm text-[#7b2f3b] hover:bg-[#f2dde2]"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!details) {
    return <div className="py-10 text-[#6b7280]">Loading profile...</div>;
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] w-full bg-[#f3f3f4] text-[#1f2937]">
      <section className="mx-auto max-w-5xl px-6 py-8">
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <article className="rounded-3xl border border-[#e8e2e3] bg-white p-8 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <div className="mx-auto grid w-fit place-items-center">
              <div className="relative">
                {details.avatarUrl ? (
                  <img
                    src={details.avatarUrl}
                    alt="Profile"
                    className="h-40 w-40 rounded-full border border-[#e8e2e3] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="grid h-40 w-40 place-items-center rounded-full bg-[#f8ecee] text-6xl font-semibold tracking-wide text-[#8b3d4a]">
                    {initials}
                  </div>
                )}

                <button
                  type="button"
                  onClick={openAvatarPicker}
                  disabled={uploadingAvatar}
                  className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full border border-[#d8c0c6] bg-[#8b3d4a] text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
                  aria-label="Change profile photo"
                >
                  <Camera className="h-4 w-4" />
                </button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onAvatarSelected}
                />
              </div>
            </div>

            <div className="mt-7 text-center">
              <h1 className="text-4xl font-semibold text-[#1f2937]">{details.fullName}</h1>
              <p className="mt-2 text-2xl text-[#8b3d4a]">{details.role} Account</p>
              {uploadingAvatar && (
                <p className="mt-2 text-sm text-[#6b7280]">Uploading photo...</p>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-[#e8e2e3] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-4xl font-semibold text-[#1f2937]">Personal Information</h2>

              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#d8c0c6] bg-[#f8ecee] px-3 py-2 text-sm font-medium text-[#7b2f3b] transition hover:bg-[#f2dde2]"
              >
                <PencilLine className="h-4 w-4" />
                Edit Details
              </button>
            </div>

            <div className="space-y-3">
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Email Address"
                value={details.email}
              />
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="Phone Number"
                value={details.phone}
              />
              <InfoRow
                icon={<Shield className="h-4 w-4" />}
                label="Account Role"
                value={details.role}
              />
              <InfoRow
                icon={<CalendarDays className="h-4 w-4" />}
                label="Member Since"
                value={details.memberSince}
              />
            </div>
          </article>
        </div>
      </section>

      {editOpen && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/35 px-4">
          <form
            onSubmit={onSave}
            className="w-full max-w-lg rounded-3xl border border-[#e8e2e3] bg-white p-6 shadow-[0_24px_52px_rgba(15,23,42,0.18)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-3xl font-semibold text-[#1f2937]">Edit Profile</h3>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Update your personal account details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-full border border-[#e8e2e3] p-2 text-[#6b7280] hover:text-[#7b2f3b]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Full Name
                </div>
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-[#ddd8da] bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#b46d73]"
                  placeholder="Your full name"
                  required
                />
              </label>

              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Phone Number
                </div>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-[#ddd8da] bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#b46d73]"
                  placeholder="09XXXXXXXXX"
                />
              </label>

              <label className="block">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Account Role
                </div>
                <input
                  value={details.role}
                  readOnly
                  className="mt-2 w-full rounded-xl border border-[#ddd8da] bg-[#f9fafb] px-4 py-3 text-sm text-[#6b7280] outline-none"
                />
                <p className="mt-1 text-xs text-[#6b7280]">
                  Account role is managed by admin.
                </p>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-xl border border-[#e8e2e3] bg-white px-4 py-2 text-sm text-[#6b7280] transition hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#8b3e46] px-4 py-2 text-sm font-medium text-white transition hover:brightness-105 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

