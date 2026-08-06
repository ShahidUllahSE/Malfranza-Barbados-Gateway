import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { listApartmentBookings, listAllApartments } from "@/lib/admin";
import { BookingsCalendar, AdminPageHeader, Shimmer } from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const b = useQuery({ queryKey: ["admin", "apt-bookings"], queryFn: listApartmentBookings });
  const a = useQuery({ queryKey: ["admin", "apartments-all"], queryFn: listAllApartments });
  const loading = b.isLoading || a.isLoading;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Calendar"
        description="See which apartments are free or booked across the month."
        meta={
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-green ring-1 ring-brand-sage/30 shadow-sm">
            <CalendarDays className="h-3.5 w-3.5" />
            Monthly occupancy
          </div>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-white p-4 shadow-card sm:p-6">
        {loading ? (
          <div className="space-y-4">
            <Shimmer className="h-10 w-56" />
            <div className="grid grid-cols-3 gap-3">
              <Shimmer className="h-16 rounded-xl" />
              <Shimmer className="h-16 rounded-xl" />
              <Shimmer className="h-16 rounded-xl" />
            </div>
            <Shimmer className="h-64 w-full rounded-2xl" />
          </div>
        ) : (
          <BookingsCalendar apartments={a.data ?? []} bookings={b.data ?? []} />
        )}
      </div>
    </div>
  );
}
