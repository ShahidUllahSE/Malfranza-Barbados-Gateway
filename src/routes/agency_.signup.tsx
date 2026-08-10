import { createFileRoute, redirect } from "@tanstack/react-router";

/** Public agency self-signup removed — agents are created in Admin → Travel agencies. */
export const Route = createFileRoute("/agency_/signup")({
  beforeLoad: () => {
    throw redirect({ to: "/agency" });
  },
  component: () => null,
});
