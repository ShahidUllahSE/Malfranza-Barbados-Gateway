import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createApartment,
  deleteApartment,
  listAllApartments,
  listApartmentBookings,
  updateApartment,
  uploadApartmentImage,
  type ApartmentUnitInput,
} from "@/lib/admin";
import { Drawer } from "./admin.bookings";

export const Route = createFileRoute("/_authenticated/admin/apartments")({
  component: ApartmentsPage,
});

type AptType = "one-bedroom" | "two-bedroom" | "three-bedroom";

type AdminApartment = {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string;
  type: AptType;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number | null;
  amenities: string[];
  photos: string[];
  is_active: boolean;
  units: ApartmentUnitInput[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function ApartmentsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "apartments-all"], queryFn: listAllApartments });
  const bookingsQ = useQuery({ queryKey: ["admin", "bookings"], queryFn: listApartmentBookings });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminApartment | null>(null);
  const [deleting, setDeleting] = useState<AdminApartment | null>(null);

  const apartments = (q.data ?? []) as AdminApartment[];

  const occupancyByApt = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const blocking = new Set(["pending", "confirmed", "checked_in"]);
    const map: Record<string, { label: string; until?: string; guest?: string }> = {};
    for (const b of bookingsQ.data ?? []) {
      if (!blocking.has(b.status)) continue;
      const aptId = String(b.apartment_id);
      if (b.check_in <= today && b.check_out > today) {
        map[aptId] = {
          label: "Booked now",
          until: b.check_out,
          guest: b.guest_name,
        };
        continue;
      }
      if (b.check_in > today && (!map[aptId] || map[aptId].label !== "Booked now")) {
        const existing = map[aptId];
        if (!existing || (existing.until && b.check_in < existing.until)) {
          map[aptId] = {
            label: "Upcoming booking",
            until: b.check_in,
            guest: b.guest_name,
          };
        }
      }
    }
    return map;
  }, [bookingsQ.data]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin", "apartments-all"] });
    qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
  }

  const toggle = useMutation({
    mutationFn: (apt: AdminApartment) =>
      updateApartment(apt.id, { is_active: !apt.is_active }),
    onSuccess: (_data, apt) => {
      toast.success(apt.is_active ? "Apartment deactivated" : "Apartment activated");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteApartment(id),
    onSuccess: () => {
      toast.success("Apartment deleted");
      setDeleting(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Apartments</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, activate, or delete rental listings. Active bookings cannot be deleted.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-green px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add apartment
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {apartments.map((a) => (
          <ApartmentCard
            key={a.id}
            apt={a}
            occupancy={occupancyByApt[a.id]}
            toggling={toggle.isPending}
            onToggle={() => toggle.mutate(a)}
            onEdit={() => setEditing(a)}
            onDelete={() => setDeleting(a)}
          />
        ))}
        {!q.isLoading && apartments.length === 0 && (
          <div className="md:col-span-2 rounded-2xl bg-white p-8 text-center shadow-card">
            <p className="text-sm text-muted-foreground">No apartments yet. Add your first unit.</p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add apartment
            </button>
          </div>
        )}
      </div>

      {creating && (
        <Drawer onClose={() => setCreating(false)}>
          <h2 className="text-xl font-display font-bold text-brand-charcoal">Add apartment</h2>
          <p className="mb-4 text-sm text-muted-foreground">Create a new stay listing for the public site.</p>
          <ApartmentForm
            mode="create"
            onCancel={() => setCreating(false)}
            onDone={() => {
              setCreating(false);
              refresh();
            }}
          />
        </Drawer>
      )}

      {editing && (
        <Drawer onClose={() => setEditing(null)}>
          <h2 className="text-xl font-display font-bold text-brand-charcoal">Edit apartment</h2>
          <p className="mb-4 text-sm text-muted-foreground">Update listing details, photos, and bookable units.</p>
          <ApartmentForm
            mode="edit"
            initial={editing}
            onCancel={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              refresh();
            }}
          />
        </Drawer>
      )}

      {deleting && (
        <Drawer onClose={() => !remove.isPending && setDeleting(null)}>
          <h2 className="text-xl font-display font-bold text-brand-charcoal">Delete apartment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Permanently remove <span className="font-semibold text-brand-charcoal">{deleting.name}</span>
            {deleting.subtitle ? ` (${deleting.subtitle})` : ""}. This cannot be undone.
          </p>
          <p className="mt-2 text-sm text-amber-800">
            If this apartment has active bookings, delete will be blocked — deactivate it instead.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate(deleting.id)}
              className="flex-1 cursor-pointer rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {remove.isPending ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
              className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function ApartmentCard({
  apt,
  occupancy,
  toggling,
  onToggle,
  onEdit,
  onDelete,
}: {
  apt: AdminApartment;
  occupancy?: { label: string; until?: string; guest?: string };
  toggling: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display font-bold text-brand-charcoal">{apt.name}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                apt.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
              }`}
            >
              {apt.is_active ? "Active" : "Inactive"}
            </span>
            {occupancy && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                {occupancy.label}
                {occupancy.until ? ` · ${occupancy.until}` : ""}
              </span>
            )}
            {!occupancy && apt.is_active && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                Available
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {apt.subtitle ? `${apt.subtitle} · ` : ""}
            ${apt.price_per_night}/night · {apt.max_guests} guests · {apt.bedrooms} bed
            {apt.bedrooms > 1 ? "s" : ""}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">/{apt.slug}</div>
          {(apt.units?.length ?? 0) > 0 && (
            <div className="mt-1 text-xs font-medium text-brand-green">
              {apt.units.length} independently bookable units
            </div>
          )}
          {occupancy?.guest && (
            <div className="mt-1 text-xs text-muted-foreground">Guest: {occupancy.guest}</div>
          )}
        </div>
        <button
          type="button"
          disabled={toggling}
          onClick={onToggle}
          className="shrink-0 cursor-pointer text-xs font-semibold text-brand-green hover:underline disabled:opacity-60"
        >
          {apt.is_active ? "Deactivate" : "Activate"}
        </button>
      </div>

      {apt.photos?.[0] && (
        <img
          src={apt.photos[0]}
          alt=""
          className="aspect-[16/9] w-full rounded-xl object-cover"
        />
      )}

      <p className="line-clamp-3 text-sm text-muted-foreground">{apt.description}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

function ApartmentForm({
  mode,
  initial,
  onCancel,
  onDone,
}: {
  mode: "create" | "edit";
  initial?: AdminApartment;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<AptType>(initial?.type ?? "one-bedroom");
  const [price, setPrice] = useState(String(initial?.price_per_night ?? 110));
  const [maxGuests, setMaxGuests] = useState(String(initial?.max_guests ?? 2));
  const [bedrooms, setBedrooms] = useState(String(initial?.bedrooms ?? 1));
  const [bathrooms, setBathrooms] = useState(String(initial?.bathrooms ?? 1));
  const [sizeSqM, setSizeSqM] = useState(
    initial?.size_sqm != null ? String(initial.size_sqm) : "",
  );
  const [amenities, setAmenities] = useState(
    (initial?.amenities ?? ["Wi‑Fi", "Air conditioning", "Kitchen"]).join(", "),
  );
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [units, setUnits] = useState<ApartmentUnitInput[]>(initial?.units ?? []);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  useEffect(() => {
    if (mode === "edit") return;
    if (type === "one-bedroom") {
      setBedrooms("1");
      setMaxGuests((g) => (Number(g) < 2 ? "2" : g));
    } else if (type === "two-bedroom") {
      setBedrooms("2");
      setMaxGuests((g) => (Number(g) < 4 ? "4" : g));
    } else {
      setBedrooms("3");
      setMaxGuests((g) => (Number(g) < 6 ? "6" : g));
    }
  }, [type, mode]);

  const upload = useMutation({
    mutationFn: uploadApartmentImage,
    onSuccess: (image) => {
      setPhotos((current) => [...current, image.url]);
      toast.success("Image uploaded");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        slug: slugify(slug || name),
        subtitle: subtitle.trim() || undefined,
        description: description.trim(),
        type,
        price_per_night: Number(price),
        max_guests: Number(maxGuests),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        size_sqm: sizeSqM ? Number(sizeSqM) : undefined,
        amenities: amenities.split(",").map((s) => s.trim()).filter(Boolean),
        photos,
        is_active: isActive,
        units,
      };

      if (mode === "create") {
        await createApartment(payload);
        return;
      }

      await updateApartment(initial!.id, {
        ...payload,
        subtitle: subtitle.trim() || null,
        size_sqm: sizeSqM ? Number(sizeSqM) : null,
      });
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Apartment created" : "Apartment updated");
      onDone();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : mode === "create" ? "Create failed" : "Update failed"),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (description.trim().length < 10) {
          toast.error("Description must be at least 10 characters");
          return;
        }
        save.mutate();
      }}
    >
      <FormField label="Name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
          placeholder="Tropical Escape"
        />
      </FormField>
      <FormField label="URL slug">
        <input
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm font-mono"
          placeholder="tropical-escape"
        />
      </FormField>
      <FormField label="Subtitle (optional)">
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
          placeholder="Quiet garden-view stay"
        />
      </FormField>
      <FormField label="Description">
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
          placeholder="Describe the apartment for guests…"
        />
      </FormField>
      <FormField label="Type">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AptType)}
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
        >
          <option value="one-bedroom">One-bedroom</option>
          <option value="two-bedroom">Two-bedroom</option>
          <option value="three-bedroom">Three-bedroom</option>
        </select>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Price / night">
          <input
            required
            type="number"
            min={0}
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
          />
        </FormField>
        <FormField label="Max guests">
          <input
            required
            type="number"
            min={1}
            max={20}
            value={maxGuests}
            onChange={(e) => setMaxGuests(e.target.value)}
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
          />
        </FormField>
        <FormField label="Bedrooms">
          <input
            required
            type="number"
            min={1}
            max={10}
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
          />
        </FormField>
        <FormField label="Bathrooms">
          <input
            required
            type="number"
            min={1}
            max={10}
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
          />
        </FormField>
      </div>
      <FormField label="Size m² (optional)">
        <input
          type="number"
          min={1}
          value={sizeSqM}
          onChange={(e) => setSizeSqM(e.target.value)}
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Amenities (comma-separated)">
        <input
          value={amenities}
          onChange={(e) => setAmenities(e.target.value)}
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
        />
      </FormField>
      <FormField label="Photos">
        <div className="space-y-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
              event.currentTarget.value = "";
            }}
            className="block w-full cursor-pointer text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo) => (
              <div key={photo} className="relative overflow-hidden rounded-lg border">
                <img src={photo} alt="" className="aspect-video w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((current) => current.filter((item) => item !== photo))}
                  className="absolute right-1 top-1 cursor-pointer rounded bg-black/70 px-1.5 py-0.5 text-xs text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </FormField>
      <UnitEditor units={units} onChange={setUnits} />
      {mode === "edit" && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-charcoal">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Listed as active on the public site
        </label>
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={save.isPending}
          className="flex-1 cursor-pointer rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {save.isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create apartment"
              : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-brand-charcoal">{label}</div>
      {children}
    </label>
  );
}

function UnitEditor({
  units,
  onChange,
}: {
  units: ApartmentUnitInput[];
  onChange: (units: ApartmentUnitInput[]) => void;
}) {
  function update(index: number, patch: Partial<ApartmentUnitInput>) {
    onChange(units.map((unit, i) => (i === index ? { ...unit, ...patch } : unit)));
  }

  return (
    <div className="rounded-xl border border-brand-sage/40 bg-brand-sage/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-brand-charcoal">Bookable units</div>
          <p className="text-xs text-muted-foreground">
            Optional. Add a 2-bedroom unit and a separate 1-bedroom unit so they book independently.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...units,
              {
                name: `Unit ${units.length + 1}`,
                description: "",
                bedrooms: 1,
                bathrooms: 1,
                maxGuests: 2,
                pricePerNight: 110,
                isActive: true,
              },
            ])
          }
          className="shrink-0 cursor-pointer rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white"
        >
          Add unit
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {units.map((unit, index) => (
          <div key={unit._id ?? index} className="rounded-lg border bg-white p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <FormField label="Unit name">
                <input
                  required
                  value={unit.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                  placeholder="Two-Bedroom Unit"
                />
              </FormField>
              <FormField label="Price / night">
                <input
                  type="number"
                  min={0}
                  value={unit.pricePerNight}
                  onChange={(e) => update(index, { pricePerNight: Number(e.target.value) })}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                />
              </FormField>
              <FormField label="Bedrooms booked together">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={unit.bedrooms}
                  onChange={(e) => update(index, { bedrooms: Number(e.target.value) })}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                />
              </FormField>
              <FormField label="Bathrooms">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={unit.bathrooms}
                  onChange={(e) => update(index, { bathrooms: Number(e.target.value) })}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                />
              </FormField>
              <FormField label="Max guests">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={unit.maxGuests}
                  onChange={(e) => update(index, { maxGuests: Number(e.target.value) })}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                />
              </FormField>
              <label className="flex cursor-pointer items-end gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={unit.isActive}
                  onChange={(e) => update(index, { isActive: e.target.checked })}
                />
                Available for booking
              </label>
            </div>
            <FormField label="Unit description (optional)">
              <input
                value={unit.description ?? ""}
                onChange={(e) => update(index, { description: e.target.value })}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm"
                placeholder="These two bedrooms are always booked together."
              />
            </FormField>
            <button
              type="button"
              onClick={() => onChange(units.filter((_, i) => i !== index))}
              className="mt-2 cursor-pointer text-xs font-semibold text-red-600 hover:underline"
            >
              Remove unit
            </button>
          </div>
        ))}
        {units.length === 0 && (
          <p className="rounded-lg bg-white px-3 py-2 text-xs text-muted-foreground">
            No units: this apartment continues to book as one complete apartment.
          </p>
        )}
      </div>
    </div>
  );
}
