import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // TEMPORARY: Auth guard disabled while previewing the admin UI.
  // beforeLoad: async () => {
  //   const { data, error } = await supabase.auth.getUser();
  //   if (error || !data.user) {
  //     throw redirect({ to: "/auth" });
  //   }
  //   return { user: data.user };
  // },
  component: () => <Outlet />,
});
