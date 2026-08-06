import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminBits";

const CHANNEL_META: Record<
  string,
  { title: string; blurb: string }
> = {
  airbnb: {
    title: "Airbnb",
    blurb: "Same pattern as Booking.com — property list and reservations will load here once Airbnb is connected in Beds24 Channel Manager.",
  },
  expedia: {
    title: "Expedia",
    blurb: "Reserved for Expedia bookings. We will wire this the same way as Booking.com when you enable the channel in Beds24.",
  },
  vrbo: {
    title: "VRBO",
    blurb: "Reserved for VRBO. Live inventory and bookings will appear here after channel connection — same layout as Booking.com.",
  },
  direct: {
    title: "Direct website",
    blurb: "Optional feed for website or direct reservations. Booking.com is live today; this channel can be added next.",
  },
};

function ChannelComingSoonPage({ channelKey }: { channelKey: string }) {
  const meta = CHANNEL_META[channelKey] ?? {
    title: "Channel",
    blurb: "This channel will use the same layout as Booking.com once connected.",
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={meta.title}
        description="Not connected yet — Booking.com already shows live Beds24 data as the reference."
      />
      <AdminPanel title="Coming next" description="Demo note for your client meeting">
        <p className="text-sm leading-relaxed text-brand-charcoal/85">{meta.blurb}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Open <strong className="font-medium text-brand-charcoal">Channels → Booking.com</strong> to
          see the real property and booking feed.
        </p>
      </AdminPanel>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin/channels/airbnb")({
  component: () => <ChannelComingSoonPage channelKey="airbnb" />,
});
