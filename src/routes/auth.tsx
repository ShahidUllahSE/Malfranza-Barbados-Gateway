import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
  setup: z.coerce.boolean().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

/** Legacy /auth URLs open the site auth modal on the homepage. */
export const Route = createFileRoute("/auth")({
  validateSearch: (search) => authSearchSchema.parse(search),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/",
      search: {
        auth: search.setup ? "setup" : (search.mode ?? "signin"),
        ...(search.redirect && search.redirect.startsWith("/")
          ? { redirect: search.redirect }
          : {}),
      },
    });
  },
});
