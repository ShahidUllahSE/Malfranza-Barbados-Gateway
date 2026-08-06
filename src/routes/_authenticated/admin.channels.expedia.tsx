import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/channels/expedia")({
  component: ExpediaPage,
});

function ExpediaPage() {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Expedia"
        description="Not connected yet — Booking.com already shows live Beds24 data as the reference."
      />
      <AdminPanel title="Coming next" description="Demo note for your client meeting">
        <p className="text-sm leading-relaxed text-brand-charcoal/85">
          Reserved for Expedia bookings. We will wire this the same way as Booking.com when you
          enable the channel in Beds24 Channel Manager.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Open <strong className="font-medium text-brand-charcoal">Channels → Booking.com</strong> for
          the live feed.
        </p>
      </AdminPanel>
    </div>
  );
}
