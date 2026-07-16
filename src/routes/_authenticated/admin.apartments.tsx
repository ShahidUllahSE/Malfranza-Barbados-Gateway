import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listAllApartments, updateApartment } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/apartments")({
  component: ApartmentsPage,
});

function ApartmentsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "apartments-all"], queryFn: listAllApartments });
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Apartments</h1>
        <p className="text-sm text-muted-foreground">Manage your rental units.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(q.data ?? []).map((a) => (
          <ApartmentCard
            key={a.id}
            apt={a}
            editing={editingId === a.id}
            onEdit={() => setEditingId(a.id)}
            onCancel={() => setEditingId(null)}
            onSaved={() => {
              setEditingId(null);
              qc.invalidateQueries({ queryKey: ["admin", "apartments-all"] });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ApartmentCard({
  apt,
  editing,
  onEdit,
  onCancel,
  onSaved,
}: {
  apt: any;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(apt.name);
  const [description, setDescription] = useState(apt.description ?? "");
  const [price, setPrice] = useState(String(apt.price_per_night));
  const [maxGuests, setMaxGuests] = useState(String(apt.max_guests));
  const [amenities, setAmenities] = useState((apt.amenities ?? []).join(", "));

  const toggle = useMutation({
    mutationFn: () => updateApartment(apt.id, { is_active: !apt.is_active }),
    onSuccess: () => {
      toast.success(apt.is_active ? "Deactivated" : "Activated");
      onSaved();
    },
  });

  const save = useMutation({
    mutationFn: () =>
      updateApartment(apt.id, {
        name,
        description: description || null,
        price_per_night: Number(price),
        max_guests: Number(maxGuests),
        amenities: amenities.split(",").map((s: string) => s.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      toast.success("Apartment updated");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <div className="rounded-2xl bg-white shadow-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-brand-charcoal truncate">{apt.name}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                apt.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
              }`}
            >
              {apt.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            ${apt.price_per_night}/night · {apt.max_guests} guests · {apt.bedrooms} bed
          </div>
        </div>
        <button
          onClick={() => toggle.mutate()}
          className="text-xs font-semibold text-brand-green hover:underline shrink-0"
        >
          {apt.is_active ? "Deactivate" : "Activate"}
        </button>
      </div>

      {!editing ? (
        <>
          <p className="text-sm text-muted-foreground line-clamp-3">{apt.description}</p>
          <button
            onClick={onEdit}
            className="w-full rounded-lg bg-brand-green text-white px-3 py-2 text-sm font-semibold hover:opacity-90"
          >
            Edit
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <FormField label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
            />
          </FormField>
          <FormField label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Price / night">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Max guests">
              <input
                type="number"
                value={maxGuests}
                onChange={(e) => setMaxGuests(e.target.value)}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
              />
            </FormField>
          </div>
          <FormField label="Amenities (comma-separated)">
            <input
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
            />
          </FormField>
          <div className="flex gap-2">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex-1 rounded-lg bg-brand-green text-white px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={onCancel}
              className="rounded-lg bg-slate-100 text-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-brand-charcoal mb-1">{label}</div>
      {children}
    </label>
  );
}
