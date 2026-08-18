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
  Cable,
  PanelLeftClose,
  PanelLeft,
  Building2,
  CircleDollarSign,
  UserRound,
} from "lucide-react";
import { getCurrentAdmin } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
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

type NavLink = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
type NavGroup = {
  label: string;
  icon: typeof LayoutDashboard;
  children: { to: string; label: string }[];
};
type NavEntry = NavLink | NavGroup;

function isNavGroup(item: NavEntry): item is NavGroup {
  return "children" in item;
}

const NAV: NavEntry[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { to: "/admin/refunds", label: "Refunds", icon: CircleDollarSign },
  { to: "/admin/agencies", label: "Agencies", icon: Building2 },
  { to: "/admin/apartments", label: "Apartments", icon: BedDouble },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/admin/taxi", label: "Taxi Trips", icon: Car },
  { to: "/admin/drivers", label: "Drivers", icon: Users },
  { to: "/admin/users", label: "Users", icon: UserRound },
  { to: "/admin/enquiries", label: "Enquiries", icon: MessageSquare },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  {
    label: "Channels",
    icon: Cable,
    children: [
      { to: "/admin/channels/booking", label: "Booking.com" },
      { to: "/admin/channels/airbnb", label: "Airbnb" },
      { to: "/admin/channels/expedia", label: "Expedia" },
      { to: "/admin/channels/vrbo", label: "VRBO" },
      { to: "/admin/channels/direct", label: "Direct website" },
    ],
  },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

function AdminLayout() {
  const navigate = useNavigate();
  const { signOut: clearAuthSession } = useUserAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");
  const [email, setEmail] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("mfz.adminSidebarCollapsed") === "1";
  });

  useEffect(() => {
    getCurrentAdmin()
      .then((admin) => {
        setEmail(admin.email);
        setStatus("ok");
      })
      .catch(() => setStatus("denied"));
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    localStorage.setItem("mfz.adminSidebarCollapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  function signOut() {
    clearAuthSession();
    navigate({ to: "/", search: { auth: "signin" } });
  }

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-brand-cream p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="mfz-shimmer h-10 w-48 rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="mfz-shimmer h-24 rounded-2xl" />
            ))}
          </div>
          <div className="mfz-shimmer h-64 rounded-2xl" />
        </div>
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
      {/* Sidebar — collapsible on desktop so tables can expand */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col bg-brand-green text-white transition-[width] duration-200 ${
          sidebarCollapsed ? "w-[4.25rem]" : "w-64"
        }`}
      >
        <SidebarContent
          pathname={pathname}
          onSignOut={signOut}
          email={email}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-brand-green text-white flex items-center justify-between px-4 h-14">
        <Link to="/admin" className="flex items-center gap-2">
          <Logo className="h-7 w-auto" />
          <span className="font-display font-bold">Admin</span>
        </Link>
        <div className="flex items-center gap-1">
          <AdminNotificationBell tone="dark" />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="p-2"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-14">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-72 h-full bg-brand-green text-white flex flex-col">
            <SidebarContent
              pathname={pathname}
              onSignOut={signOut}
              email={email}
              collapsed={false}
            />
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="hidden lg:flex items-center justify-end border-b border-slate-200/80 bg-white/70 px-6 py-2.5 backdrop-blur">
          <AdminNotificationBell />
        </div>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[100rem] mx-auto">
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
  collapsed = false,
  onToggleCollapse,
}: {
  pathname: string;
  onSignOut: () => void;
  email: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const channelsOpen = pathname.startsWith("/admin/channels") || pathname.startsWith("/admin/beds24");

  return (
    <>
      <div className={`border-b border-white/10 hidden lg:flex items-center ${collapsed ? "justify-center p-3" : "justify-between p-5"}`}>
        {!collapsed && (
          <Link to="/admin" className="flex items-center gap-2 min-w-0">
            <Logo className="h-9 w-auto shrink-0" />
            <span className="font-display font-bold text-lg">Admin</span>
          </Link>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            title={collapsed ? "Expand menu" : "Collapse menu"}
            aria-label={collapsed ? "Expand side menu" : "Collapse side menu"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map((item) => {
          if (isNavGroup(item)) {
            const Icon = item.icon;
            const groupActive = item.children.some((c) => pathname.startsWith(c.to));
            if (collapsed) {
              return (
                <Link
                  key={item.label}
                  to={item.children[0]!.to as never}
                  title={item.label}
                  className={`flex items-center justify-center rounded-lg p-2.5 transition ${
                    groupActive || channelsOpen
                      ? "bg-white/15 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            }
            return (
              <div key={item.label} className="pt-1">
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    groupActive || channelsOpen ? "text-white" : "text-white/80"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </div>
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/15 pl-3">
                  {item.children.map((child) => {
                    const active = pathname.startsWith(child.to);
                    return (
                      <Link
                        key={child.to}
                        to={child.to as never}
                        className={`block rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                          active
                            ? "bg-white/15 text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as string}
              title={item.label}
              className={`flex items-center rounded-lg text-sm font-medium transition ${
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              } ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
      <div className={`p-3 border-t border-white/10 ${collapsed ? "flex flex-col items-center" : ""}`}>
        {!collapsed && <div className="px-3 py-2 text-xs text-white/70 truncate w-full">{email}</div>}
        <button
          onClick={onSignOut}
          title="Sign out"
          className={`flex items-center gap-2 rounded-lg text-sm text-white/90 hover:bg-white/10 ${
            collapsed ? "p-2.5" : "w-full px-3 py-2"
          }`}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </>
  );
}
