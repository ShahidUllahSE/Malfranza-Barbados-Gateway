import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Car,
  MessageSquare,
  BarChart3,
  Settings as SettingsIcon,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Users,
} from "lucide-react";
import { getCurrentAdmin } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { useUserAuth } from "@/context/UserAuthContext";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Malfranza" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { to: "/admin/apartments", label: "Apartments", icon: BedDouble },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/admin/taxi", label: "Taxi Trips", icon: Car },
  { to: "/admin/drivers", label: "Drivers", icon: Users },
  { to: "/admin/enquiries", label: "Enquiries", icon: MessageSquare },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

function AdminLayout() {
  const navigate = useNavigate();
  const { signOut: clearAuthSession } = useUserAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");
  const [email, setEmail] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    getCurrentAdmin()
      .then((admin) => {
        setEmail(admin.email);
        setStatus("ok");
      })
      .catch(() => setStatus("denied"));
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  function signOut() {
    clearAuthSession();
    navigate({ to: "/", search: { auth: "signin" } });
  }

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading admin…</p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl p-8 shadow-card">
          <h1 className="text-xl font-display font-bold text-brand-charcoal">Access restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account isn't authorized for the admin dashboard. Please contact the site owner.
          </p>
          <button
            onClick={signOut}
            className="mt-6 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-brand-green-foreground hover:opacity-90"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-brand-green text-white">
        <SidebarContent pathname={pathname} onSignOut={signOut} email={email} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-brand-green text-white flex items-center justify-between px-4 h-14">
        <Link to="/admin" className="flex items-center gap-2">
          <Logo className="h-7 w-auto" />
          <span className="font-display font-bold">Admin</span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          className="p-2"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-14">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-72 h-full bg-brand-green text-white flex flex-col">
            <SidebarContent pathname={pathname} onSignOut={signOut} email={email} />
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarContent({
  pathname,
  onSignOut,
  email,
}: {
  pathname: string;
  onSignOut: () => void;
  email: string;
}) {
  return (
    <>
      <div className="p-5 border-b border-white/10 hidden lg:block">
        <Link to="/admin" className="flex items-center gap-2">
          <Logo className="h-9 w-auto" />
          <span className="font-display font-bold text-lg">Admin</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as string}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 text-xs text-white/70 truncate">{email}</div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/90 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );
}
