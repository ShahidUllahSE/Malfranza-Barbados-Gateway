import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listApartmentBookings, listTaxiBookings } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const b = useQuery({ queryKey: ["admin", "apt-bookings"], queryFn: listApartmentBookings });
  const t = useQuery({ queryKey: ["admin", "taxi-bookings"], queryFn: listTaxiBookings });

  const bookings = b.data ?? [];
  const active = bookings.filter((x) => x.status !== "cancelled");
  const revenue = active.reduce((sum, x) => sum + Number(x.total_amount), 0);
  const nights = active.reduce((sum, x) => sum + x.nights, 0);
  const taxis = (t.data ?? []).filter((x) => x.status !== "cancelled").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-charcoal">Reports</h1>
        <p className="text-sm text-muted-foreground">All-time performance snapshot.</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Metric label="Total bookings" value={active.length} />
        <Metric label="Total nights" value={nights} />
        <Metric label="Gross revenue" value={`$${revenue.toFixed(2)}`} />
        <Metric label="Taxi trips" value={taxis} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white shadow-card p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-display font-bold text-brand-charcoal mt-1">{value}</div>
    </div>
  );
}
