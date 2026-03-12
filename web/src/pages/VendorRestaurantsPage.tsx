import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ImagePlus,
  Loader2,
  PencilLine,
  Plus,
  Save,
  Store,
  Upload,
  X,
} from "lucide-react";
import {
  createVendorRestaurant,
  listVendorRestaurants,
  updateVendorRestaurant,
  uploadVendorRestaurantImage,
  VendorRestaurant,
} from "../lib/api/vendor.api";
import { ApiError } from "../lib/api/client";
import { useAuth } from "../lib/auth/useAuth";

type RestaurantFormState = {
  name: string;
  cuisine: string;
  location: string;
  description: string;
  imageUrl: string;
  contactPhone: string;
  contactEmail: string;
  priceLevel: string;
  totalTables: string;
};

const EMPTY_FORM: RestaurantFormState = {
  name: "",
  cuisine: "",
  location: "",
  description: "",
  imageUrl: "",
  contactPhone: "",
  contactEmail: "",
  priceLevel: "1",
  totalTables: "10",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const payload = error.payload as { message?: string } | undefined;
    return payload?.message ?? fallback;
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

function toFormState(restaurant: VendorRestaurant): RestaurantFormState {
  return {
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    location: restaurant.location,
    description: restaurant.description ?? "",
    imageUrl: restaurant.imageUrl ?? "",
    contactPhone: restaurant.contactPhone ?? "",
    contactEmail: restaurant.contactEmail ?? "",
    priceLevel: String(restaurant.priceLevel ?? 1),
    totalTables: String(restaurant.totalTables ?? 10),
  };
}

type FormFieldsProps = {
  state: RestaurantFormState;
  setState: (value: RestaurantFormState) => void;
  imageInputId: string;
  uploadingImage: boolean;
  onUploadImage: (file: File) => Promise<void>;
};

export default function VendorRestaurantsPage() {
  const { isAuthed, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingCreateImage, setUploadingCreateImage] = useState(false);
  const [uploadingEditImageId, setUploadingEditImageId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<VendorRestaurant[]>([]);
  const [createForm, setCreateForm] = useState<RestaurantFormState>(EMPTY_FORM);
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RestaurantFormState>(EMPTY_FORM);

  async function loadRestaurants() {
    try {
      setLoading(true);
      setMessage(null);
      const data = await listVendorRestaurants();
      setRestaurants(data);
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load restaurants."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthed) {
      setLoading(false);
      return;
    }

    loadRestaurants();
  }, [isAuthed]);

  const restaurantCount = useMemo(() => restaurants.length, [restaurants]);

  async function uploadImageForCreate(file: File) {
    try {
      setUploadingCreateImage(true);
      setMessage(null);

      const publicUrl = await uploadVendorRestaurantImage(file);
      setCreateForm((prev) => ({
        ...prev,
        imageUrl: publicUrl,
      }));
      setMessage("Image uploaded successfully.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to upload image."));
    } finally {
      setUploadingCreateImage(false);
    }
  }

  async function uploadImageForEdit(file: File) {
    if (!editingRestaurantId) return;

    try {
      setUploadingEditImageId(editingRestaurantId);
      setMessage(null);

      const publicUrl = await uploadVendorRestaurantImage(file);
      setEditForm((prev) => ({
        ...prev,
        imageUrl: publicUrl,
      }));
      setMessage("Image uploaded successfully.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to upload image."));
    } finally {
      setUploadingEditImageId(null);
    }
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingCreate(true);
      setMessage(null);

      const created = await createVendorRestaurant({
        name: createForm.name.trim(),
        cuisine: createForm.cuisine.trim(),
        location: createForm.location.trim(),
        description: createForm.description.trim(),
        imageUrl: createForm.imageUrl.trim(),
        contactPhone: createForm.contactPhone.trim(),
        contactEmail: createForm.contactEmail.trim(),
        priceLevel: Number(createForm.priceLevel) || 1,
        totalTables: Number(createForm.totalTables) || 10,
      });

      setRestaurants((prev) => [created, ...prev]);
      setCreateForm(EMPTY_FORM);
      setMessage("Restaurant created successfully.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to create restaurant."));
    } finally {
      setSavingCreate(false);
    }
  }

  function startEdit(restaurant: VendorRestaurant) {
    setEditingRestaurantId(restaurant.id);
    setEditForm(toFormState(restaurant));
    setMessage(null);
  }

  function cancelEdit() {
    setEditingRestaurantId(null);
    setUploadingEditImageId(null);
    setEditForm(EMPTY_FORM);
  }

  async function saveEdit(restaurantId: string) {
    try {
      setSavingEdit(true);
      setMessage(null);

      const updated = await updateVendorRestaurant(restaurantId, {
        name: editForm.name.trim(),
        cuisine: editForm.cuisine.trim(),
        location: editForm.location.trim(),
        description: editForm.description.trim(),
        imageUrl: editForm.imageUrl.trim(),
        contactPhone: editForm.contactPhone.trim(),
        contactEmail: editForm.contactEmail.trim(),
        priceLevel: Number(editForm.priceLevel) || 1,
        totalTables: Number(editForm.totalTables) || 10,
      });

      setRestaurants((prev) =>
        prev.map((restaurant) =>
          restaurant.id === restaurantId ? updated : restaurant,
        ),
      );

      setEditingRestaurantId(null);
      setMessage("Restaurant updated.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to update restaurant."));
    } finally {
      setSavingEdit(false);
      setUploadingEditImageId(null);
    }
  }

  async function handleImageFileChange(
    event: ChangeEvent<HTMLInputElement>,
    onUploadImage: (file: File) => Promise<void>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    await onUploadImage(file);
  }

  function renderFormFields({
    state,
    setState,
    imageInputId,
    uploadingImage,
    onUploadImage,
  }: FormFieldsProps) {
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-[#4b5563]">
            Name
            <input
              value={state.name}
              onChange={(event) =>
                setState({ ...state, name: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
              placeholder="Restaurant name"
              required
            />
          </label>

          <label className="text-sm text-[#4b5563]">
            Cuisine
            <input
              value={state.cuisine}
              onChange={(event) =>
                setState({ ...state, cuisine: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
              placeholder="Cuisine"
              required
            />
          </label>

          <label className="text-sm text-[#4b5563]">
            Location
            <input
              value={state.location}
              onChange={(event) =>
                setState({ ...state, location: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
              placeholder="Address"
              required
            />
          </label>

          <label className="text-sm text-[#4b5563]">
            Phone Number
            <input
              value={state.contactPhone}
              onChange={(event) =>
                setState({ ...state, contactPhone: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
              placeholder="09xxxxxxxxx"
            />
          </label>

          <label className="text-sm text-[#4b5563]">
            Contact Email
            <input
              type="email"
              value={state.contactEmail}
              onChange={(event) =>
                setState({ ...state, contactEmail: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
              placeholder="restaurant@email.com"
            />
          </label>

          <label className="text-sm text-[#4b5563]">
            Price Level (1-4)
            <input
              type="number"
              min={1}
              max={4}
              value={state.priceLevel}
              onChange={(event) =>
                setState({ ...state, priceLevel: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
            />
          </label>

          <label className="text-sm text-[#4b5563]">
            Total Tables
            <input
              type="number"
              min={1}
              max={999}
              value={state.totalTables}
              onChange={(event) =>
                setState({ ...state, totalTables: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
            />
          </label>

          <label className="text-sm text-[#4b5563] sm:col-span-2">
            Image URL
            <input
              value={state.imageUrl}
              onChange={(event) =>
                setState({ ...state, imageUrl: event.target.value })
              }
              className="mt-1 w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
              placeholder="https://..."
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => document.getElementById(imageInputId)?.click()}
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

              <span className="text-xs text-[#6b7280]">
                Upload from local file to Supabase Storage (max 8MB).
              </span>
            </div>

            <input
              id={imageInputId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleImageFileChange(event, onUploadImage)}
            />

            {state.imageUrl ? (
              <img
                src={state.imageUrl}
                alt="Restaurant preview"
                className="mt-3 h-28 w-full rounded-xl border border-[#ddd8da] object-cover"
              />
            ) : (
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-[#8b97a8]">
                <ImagePlus className="h-3.5 w-3.5" />
                No image selected
              </div>
            )}
          </label>
        </div>

        <label className="mt-3 block text-sm text-[#4b5563]">
          Description
          <textarea
            value={state.description}
            onChange={(event) =>
              setState({ ...state, description: event.target.value })
            }
            className="mt-1 min-h-[84px] w-full rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#b46d73]"
            placeholder="Restaurant description"
          />
        </label>
      </>
    );
  }

  if (authLoading) {
    return (
      <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
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
      <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#4b5563]">
            Login is required to access vendor restaurants.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 right-1/2 min-h-[calc(100vh-72px)] w-screen -translate-x-1/2 bg-[#f3f3f4] text-[#1f2937]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b3d4a]">
            Vendor Portal
          </p>
          <h1 className="mt-2 text-5xl text-[#1f2937]">Restaurant Management</h1>
          <p className="mt-1 text-sm text-[#5b6374]">
            Add and maintain your restaurants, table capacity, and details.
          </p>
        </header>

        {message && (
          <div className="mt-5 rounded-2xl border border-[#f2cccf] bg-[#fff6f7] px-4 py-3 text-sm text-[#9f1239]">
            {message}
          </div>
        )}

        <section className="mt-6 rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl text-[#1f2937]">Create Restaurant</h2>
            <span className="text-sm text-[#6b7280]">Total: {restaurantCount}</span>
          </div>

          <form className="mt-4" onSubmit={onCreate}>
            {renderFormFields({
              state: createForm,
              setState: setCreateForm,
              imageInputId: "create-restaurant-image",
              uploadingImage: uploadingCreateImage,
              onUploadImage: uploadImageForCreate,
            })}
            <button
              type="submit"
              disabled={savingCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#c98d98] bg-[#f8ecee] px-4 py-2.5 text-sm font-semibold text-[#7b2f3b] hover:bg-[#f3dde1] disabled:opacity-60"
            >
              {savingCreate ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Restaurant
                </>
              )}
            </button>
          </form>
        </section>

        <section className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#5b6374] shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading restaurants...
              </div>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="rounded-3xl border border-[#e8e2e3] bg-white p-6 text-[#6b7280] shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              No restaurants found.
            </div>
          ) : (
            restaurants.map((restaurant) => {
              const isEditing = editingRestaurantId === restaurant.id;

              return (
                <article
                  key={restaurant.id}
                  className="rounded-3xl border border-[#e8e2e3] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-3xl text-[#1f2937]">{restaurant.name}</h3>
                      <p className="text-sm text-[#6b7280]">
                        {restaurant.cuisine} - {restaurant.location}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-[#8b97a8]">
                        Tables available: {restaurant.totalTables}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/vendor/restaurants/${restaurant.id}/slots`}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#d9c3c8] bg-[#f8ecee] px-3 py-2 text-xs font-semibold text-[#7b2f3b] hover:bg-[#f3dde1]"
                      >
                        <Store className="h-3.5 w-3.5" />
                        Manage Slots
                      </Link>

                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(restaurant.id)}
                            disabled={savingEdit}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#c98d98] bg-[#f8ecee] px-3 py-2 text-xs font-semibold text-[#7b2f3b] hover:bg-[#f3dde1] disabled:opacity-60"
                          >
                            {savingEdit ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-xs font-semibold text-[#4b5563] hover:bg-[#f8fafc]"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(restaurant)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#ddd8da] bg-white px-3 py-2 text-xs font-semibold text-[#4b5563] hover:bg-[#f8fafc]"
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-4">
                      {renderFormFields({
                        state: editForm,
                        setState: setEditForm,
                        imageInputId: `edit-restaurant-image-${restaurant.id}`,
                        uploadingImage: uploadingEditImageId === restaurant.id,
                        onUploadImage: uploadImageForEdit,
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3 rounded-2xl border border-[#e5e7eb] bg-[#fcfcfd] p-4 text-sm text-[#4b5563]">
                      <p>{restaurant.description || "No description provided."}</p>
                      <div className="grid gap-2 text-xs text-[#6b7280] sm:grid-cols-2">
                        <div>
                          Phone: {restaurant.contactPhone || "Not provided"}
                        </div>
                        <div>
                          Email: {restaurant.contactEmail || "Not provided"}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
