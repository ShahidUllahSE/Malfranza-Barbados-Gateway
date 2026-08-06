import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old URL → Booking.com channel (live Beds24 data). */
export const Route = createFileRoute("/_authenticated/admin/beds24")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/channels/booking" });
  },
});
