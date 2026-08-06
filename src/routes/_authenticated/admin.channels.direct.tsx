import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/channels/direct")({
  component: DirectPage,
});

function DirectPage() {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Direct website"
        description="Not connected yet — Booking.com already shows live Beds24 data as the reference."
      />
      <AdminPanel title="Coming next" description="Demo note for your client meeting">
        <p className="text-sm leading-relaxed text-brand-charcoal/85">
          Optional feed for website or direct reservations. Booking.com is live today; this channel
          can be added next with the same structure.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Open <strong className="font-medium text-brand-charcoal">Channels → Booking.com</strong> for
          the live feed.
        </p>
      </AdminPanel>
    </div>
  );
}
