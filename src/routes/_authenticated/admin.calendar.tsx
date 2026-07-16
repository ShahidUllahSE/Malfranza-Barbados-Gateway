import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listApartmentBookings, listAllApartments } from "@/lib/admin";
import { BookingsCalendar } from "@/components/admin/AdminBits";

export const Route = createFileRoute("/_authenticated/admin/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const b = useQuery({ queryKey: ["admin", "apt-bookings"], queryFn: listApartmentBookings });
  const a = useQuery({ queryKey: ["admin", "apartments-all"], queryFn: listAllApartments });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Calendar</h1>
        <p className="text-sm text-muted-foreground">Monthly view of apartment bookings.</p>
      </div>
      <div className="rounded-2xl bg-white shadow-card p-4 sm:p-6">
        <BookingsCalendar apartments={a.data ?? []} bookings={b.data ?? []} />
      </div>
    </div>
  );
}
