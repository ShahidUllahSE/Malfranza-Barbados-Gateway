import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { UserAuthProvider } from "../context/UserAuthContext";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "Malfranza Apartments & Taxi — Stay comfortably. Move easily." },
      {
        name: "description",
        content:
          "Affordable one- and two-bedroom apartment stays and reliable taxi service in Barbados. Airport transfers, daily rides, and comfortable stays you can trust.",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const chromeless = pathname.startsWith("/admin") || pathname.startsWith("/driver");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reveal = (el: HTMLElement) => {
      el.classList.add("is-revealed");
    };

    const inViewport = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // Treat anything intersecting the viewport (with a small buffer) as visible.
      return rect.top < vh + 40 && rect.bottom > -40;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll<HTMLElement>("main section").forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            reveal(e.target as HTMLElement);
            io.unobserve(e.target);
          }
        }
      },
      // Generous margins so first-paint / tall heroes aren't missed.
      { threshold: 0.01, rootMargin: "40px 0px 40px 0px" },
    );

    const attach = () => {
      document.querySelectorAll<HTMLElement>("main section:not(.reveal-init)").forEach((el) => {
        el.classList.add("reveal", "reveal-init");
        // Above-the-fold content must show on first paint — IO alone can miss it.
        if (inViewport(el)) {
          reveal(el);
          return;
        }
        io.observe(el);
      });
    };

    attach();
    // Sections often appear after route loaders resolve; re-check on DOM changes.
    const mo = new MutationObserver(() => {
      requestAnimationFrame(attach);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Safety net for anything still invisible but on screen after layout settles.
    const safetyId = window.setTimeout(() => {
      document
        .querySelectorAll<HTMLElement>("main section.reveal:not(.is-revealed)")
        .forEach((el) => {
          if (inViewport(el)) {
            reveal(el);
            io.unobserve(el);
          }
        });
    }, 150);

    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(safetyId);
    };
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <UserAuthProvider>
        <HeadContent />
        <Toaster position="top-center" richColors closeButton />
        {chromeless ? (
          <Outlet />
        ) : (
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <SiteHeader />
            <main className="flex-1">
              <Outlet />
            </main>
            <SiteFooter />
          </div>
        )}
      </UserAuthProvider>
    </QueryClientProvider>
  );
}
