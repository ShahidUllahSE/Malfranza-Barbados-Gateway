import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import {
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
} from "@/lib/admin-notifications";

function typeLabel(type: AdminNotification["type"], title?: string) {
  const t = String(title ?? "").toLowerCase();
  if (t.includes("booking.com")) return "Booking.com";
  if (t.includes("expedia")) return "Expedia";
  if (type === "taxi_booking") return "Taxi";
  if (type === "stay_booking") return "Stay";
  if (type === "enquiry") return "Enquiry";
  if (type === "refund_request") return "Refund";
  if (type === "agency_signup") return "Agency";
  return "Alert";
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function isRecent(iso: string, withinMs: number) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return false;
  return Date.now() - then <= withinMs;
}

function notifyBrowser(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/malfranza-logo.png" });
  } catch {
    // Ignore unsupported / blocked environments.
  }
}

export function AdminNotificationBell({ tone = "light" }: { tone?: "light" | "dark" }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const toastedIdsRef = useRef<Set<string>>(new Set());

  const q = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => listAdminNotifications(30),
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
  });

  const unread = q.data?.unreadCount ?? 0;
  const items = q.data?.items ?? [];

  // Toast + optional desktop alert when a new booking/enquiry appears (live or recent unread).
  useEffect(() => {
    if (!q.data) return;
    const nextIds = new Set(q.data.items.map((item) => item.id));
    const firstLoad = knownIdsRef.current === null;

    const fresh = firstLoad
      ? q.data.items.filter(
          (item) =>
            !item.read &&
            isRecent(item.createdAt, 45 * 60_000) &&
            (item.type === "stay_booking" || item.type === "taxi_booking"),
        )
      : q.data.items.filter((item) => !knownIdsRef.current!.has(item.id));

    for (const item of fresh) {
      if (toastedIdsRef.current.has(item.id)) continue;
      toastedIdsRef.current.add(item.id);

      const isBooking = item.type === "stay_booking" || item.type === "taxi_booking";
      toast.success(item.title, {
        description: item.body,
        duration: 12_000,
        action: {
          label: "Open",
          onClick: () => {
            void openItem(item);
          },
        },
      });
      if (isBooking) {
        notifyBrowser(item.title, item.body);
      }
    }

    knownIdsRef.current = nextIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function openItem(item: AdminNotification) {
    if (!item.read) {
      await markAdminNotificationRead(item.id).catch(() => undefined);
      await qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
    }
    setOpen(false);
    navigate({ to: item.href as never });
  }

  async function markAll() {
    await markAllAdminNotificationsRead().catch(() => undefined);
    await qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
  }

  async function enableDesktopAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Desktop alerts are not supported in this browser");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      toast.success("Desktop booking alerts enabled");
    } else {
      toast.error("Desktop alert permission denied");
    }
  }

  const btnCls =
    tone === "dark"
      ? "relative rounded-lg p-2 text-white/90 hover:bg-white/10"
      : "relative rounded-lg p-2 text-brand-charcoal hover:bg-slate-100";

  const desktopEnabled =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={btnCls}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <p className="text-sm font-semibold text-brand-charcoal">Notifications</p>
            <div className="flex items-center gap-2">
              {!desktopEnabled && (
                <button
                  type="button"
                  onClick={() => void enableDesktopAlerts()}
                  className="text-[11px] font-semibold text-brand-charcoal/70 hover:text-brand-green hover:underline"
                >
                  Enable desktop
                </button>
              )}
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAll()}
                  className="text-xs font-semibold text-brand-green hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openItem(item)}
                  className={`flex w-full flex-col gap-0.5 border-b border-slate-50 px-3 py-2.5 text-left hover:bg-brand-cream/60 ${
                    item.read ? "bg-white" : "bg-brand-cream/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-green">
                      {typeLabel(item.type, item.title)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-brand-charcoal">{item.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
