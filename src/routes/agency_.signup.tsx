import { createFileRoute, redirect } from "@tanstack/react-router";

/** Opens the same site auth modal as guest signup. */
export const Route = createFileRoute("/agency_/signup")({
  beforeLoad: () => {
    throw redirect({
      to: "/",
      search: { auth: "agency-signup", redirect: "/agency" },
    });
  },
  component: () => null,
});
