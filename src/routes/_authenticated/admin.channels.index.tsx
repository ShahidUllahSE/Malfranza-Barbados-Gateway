import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/channels/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/channels/booking" });
  },
});
