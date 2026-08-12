import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Car, Home } from "lucide-react";
import { listApartmentBookings, listAllApartments, listTaxiBookings } from "@/lib/admin";
import { listDrivers } from "@/lib/drivers";
import {
  BookingsCalendar,
  TaxiScheduleCalendar,
  AdminPageHeader,
  Shimmer,
} from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const [tab, setTab] = useState<"stays" | "taxi">("stays");
  const b = useQuery({ queryKey: ["admin", "apt-bookings"], queryFn: listApartmentBookings });
  const a = useQuery({ queryKey: ["admin", "apartments-all"], queryFn: listAllApartments });
  const t = useQuery({ queryKey: ["admin", "taxi-bookings"], queryFn: listTaxiBookings });
  const d = useQuery({ queryKey: ["admin", "drivers"], queryFn: listDrivers });
  const staysLoading = b.isLoading || a.isLoading;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Calendar"
        description="Stay occupancy and taxi vehicle schedule in one place."
        meta={
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-green ring-1 ring-brand-sage/30 shadow-sm">
            <CalendarDays className="h-3.5 w-3.5" />
            Monthly board
          </div>
        }
      />

      <div className="inline-flex rounded-xl border border-border bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("stays")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
            tab === "stays" ? "bg-brand-green text-white" : "text-brand-charcoal hover:bg-slate-50"
          }`}
        >
          <Home className="h-3.5 w-3.5" /> Stays
        </button>
        <button
          type="button"
          onClick={() => setTab("taxi")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
            tab === "taxi" ? "bg-brand-green text-white" : "text-brand-charcoal hover:bg-slate-50"
          }`}
        >
          <Car className="h-3.5 w-3.5" /> Taxi
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-white p-4 shadow-card sm:p-6">
        {tab === "stays" ? (
          staysLoading ? (
            <div className="space-y-4">
              <Shimmer className="h-10 w-56" />
              <Shimmer className="h-64 w-full rounded-2xl" />
            </div>
          ) : (
            <BookingsCalendar apartments={a.data ?? []} bookings={b.data ?? []} />
          )
        ) : (
          <TaxiScheduleCalendar
            trips={t.data ?? []}
            drivers={(d.data ?? []).filter((driver) => driver.isActive)}
            loading={t.isLoading || d.isLoading}
          />
        )}
      </div>
    </div>
  );
}
