import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentAdmin } from "@/lib/api";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    try {
      const admin = await getCurrentAdmin();
      return { admin };
    } catch {
      throw redirect({
        to: "/",
        search: { auth: "signin", redirect: "/admin" },
      });
    }
  },
  component: () => <Outlet />,
});
