import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  X,
  LogOut,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
} from "lucide-react";
import { Logo } from "./Logo";
import { useUserAuth } from "@/context/UserAuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { to: "/stays", label: "Stays" },
  { to: "/taxi", label: "Taxi Service" },
  { to: "/amenities", label: "Amenities" },
  { to: "/my-bookings", label: "My Bookings" },
  { to: "/contact", label: "Contact" },
] as const;

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, admin, session, signOut, openAuthModal } = useUserAuth();
  const isStaff = session?.kind === "admin";
  const isDriver = session?.kind === "driver";
  const displayName = isStaff
    ? admin?.email?.split("@")[0] ?? "Staff"
    : isDriver
      ? session.driver.name
      : user?.name ?? "";
  const displayEmail = isStaff
    ? admin?.email ?? ""
    : isDriver
      ? session.driver.email
      : user?.email ?? "";
  const signedIn = !!session;

  function handleBookNow() {
    setOpen(false);
    if (user) {
      navigate({ to: "/book" });
      return;
    }
    openAuthModal({
      mode: "signin",
      reason: "Sign in to book a stay. Your booking will appear under My Bookings.",
      redirectTo: "/book",
    });
  }

  function handleSignOut() {
    signOut();
    setOpen(false);
  }

  function openMyBookingsAuth() {
    openAuthModal({
      mode: "signin",
      reason: "Sign in to see your stays and taxi bookings.",
      redirectTo: "/my-bookings",
    });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:h-24 lg:px-8">
        <Link to="/" className="flex items-center" aria-label="Malfranza home">
          <Logo className="h-12 w-auto sm:h-16 lg:h-20" />
        </Link>

        <nav className="hidden items-center gap-3 md:flex lg:gap-6 xl:gap-9">
          {navLinks.map((link) =>
            link.to === "/my-bookings" && !user ? (
              <button
                key={link.to}
                type="button"
                onClick={openMyBookingsAuth}
                className="cursor-pointer text-sm font-medium text-brand-charcoal transition-colors hover:text-brand-green lg:text-[15px]"
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-brand-charcoal transition-colors hover:text-brand-green lg:text-[15px]"
                activeProps={{ className: "text-brand-green font-semibold" }}
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {signedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden h-10 cursor-pointer items-center gap-2 rounded-full border border-transparent pl-1 pr-2 text-left transition-colors hover:border-border hover:bg-brand-cream/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/30 md:inline-flex lg:pr-3"
                  aria-label="Account menu"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green text-xs font-semibold text-white">
                    {userInitials(displayName)}
                  </span>
                  <span className="hidden max-w-[6rem] truncate text-sm font-medium text-brand-charcoal lg:inline">
                    {displayName.split(" ")[0]}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:inline" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                <DropdownMenuLabel className="px-2 py-2 font-normal">
                  <p className="truncate text-sm font-semibold text-brand-charcoal">{displayName}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{displayEmail}</p>
                  {isStaff ? (
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-brand-green">
                      {admin?.role ?? "staff"}
                    </p>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isStaff ? (
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2 py-2">
                    <Link to="/admin" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4 text-brand-green" />
                      Admin dashboard
                    </Link>
                  </DropdownMenuItem>
                ) : isDriver ? (
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2 py-2">
                    <Link to="/driver" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4 text-brand-green" />
                      Driver portal
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2 py-2">
                    <Link to="/my-bookings" className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-brand-green" />
                      My Bookings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleSignOut();
                  }}
                  className="cursor-pointer rounded-lg px-2 py-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("signin")}
              className="hidden cursor-pointer text-sm font-medium text-brand-charcoal transition-colors hover:text-brand-green md:inline-flex"
            >
              Sign in
            </button>
          )}

          <button
            type="button"
            onClick={handleBookNow}
            className="hidden h-10 cursor-pointer items-center justify-center rounded-xl bg-brand-orange px-4 text-sm font-semibold text-brand-orange-foreground shadow-sm transition-all hover:brightness-105 hover:shadow-md md:inline-flex lg:px-5"
          >
            Book Now
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-brand-green md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {signedIn && (
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-brand-cream/70 px-3 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-semibold text-white">
                  {userInitials(displayName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-charcoal">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
                </div>
              </div>
            )}

            {navLinks.map((link) =>
              link.to === "/my-bookings" && !user ? (
                <button
                  key={link.to}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openMyBookingsAuth();
                  }}
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-left text-base font-medium text-brand-charcoal hover:bg-brand-cream"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-base font-medium text-brand-charcoal hover:bg-brand-cream"
                >
                  {link.label}
                </Link>
              ),
            )}

            {isStaff && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-base font-medium text-brand-charcoal hover:bg-brand-cream"
              >
                Admin dashboard
              </Link>
            )}

            {isDriver && (
              <Link
                to="/driver"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-base font-medium text-brand-charcoal hover:bg-brand-cream"
              >
                Driver portal
              </Link>
            )}

            {signedIn ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="cursor-pointer rounded-lg px-3 py-2.5 text-left text-base font-medium text-destructive hover:bg-brand-cream"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openAuthModal("signin");
                }}
                className="cursor-pointer rounded-lg px-3 py-2.5 text-left text-base font-medium text-brand-charcoal hover:bg-brand-cream"
              >
                Sign in
              </button>
            )}

            <button
              type="button"
              onClick={handleBookNow}
              className="mt-2 cursor-pointer rounded-xl bg-brand-orange px-4 py-3 text-center text-sm font-semibold text-brand-orange-foreground"
            >
              Book Now
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
