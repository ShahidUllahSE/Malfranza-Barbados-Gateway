import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/booking-policy")({
  head: () => ({
    meta: [
      { title: "Booking Policy — Malfranza Apartments & Taxi" },
      {
        name: "description",
        content:
          "Terms for reserving an apartment stay or taxi service with Malfranza — deposits, cancellation, property rules, and check-in.",
      },
      { property: "og:title", content: "Booking Policy — Malfranza" },
      {
        property: "og:description",
        content:
          "Deposit, payment methods, free cancellation up to 48 hours, property rules, and check-in times at Malfranza.",
      },
    ],
  }),
  component: BookingPolicyPage,
});

function BookingPolicyPage() {
  return (
    <div className="min-h-screen bg-brand-cream/50">
      <section className="border-b border-brand-green-deep bg-brand-green text-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-orange sm:text-base">
            Guest Policy
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-brand-cream sm:text-5xl md:text-[3.25rem] md:leading-[1.1]">
            Booking Policy
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
            This policy explains the terms that apply when you reserve an apartment stay or taxi
            service with Malfranza through our website and online booking platform. By making a
            booking, you agree to this policy.
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="space-y-12">
          <Section number="1" title="Making a Booking">
            <p>
              Bookings can be made through our online booking platform, by email at{" "}
              <a href="mailto:malfranza@gmail.com" className="font-medium text-brand-green hover:underline">
                malfranza@gmail.com
              </a>
              , or by phone at{" "}
              <a href="tel:+12462344875" className="font-medium text-brand-green hover:underline">
                1 (246) 234-4875
              </a>{" "}
              or{" "}
              <a href="tel:+12462314875" className="font-medium text-brand-green hover:underline">
                1 (246) 231-4875
              </a>
              . A booking is confirmed only once you receive a written confirmation from us and your
              required deposit has been received.
            </p>
          </Section>

          <Section number="2" title="Deposit">
            <p>
              A deposit equal to one night&apos;s payment is required at the time of booking to
              secure your reservation. Your reservation is not guaranteed until the deposit has
              been received and confirmed.
            </p>
          </Section>

          <Section number="3" title="Payment Methods">
            <p>We accept the following payment methods:</p>
            <BulletList
              items={[
                "Credit cards: Visa, Mastercard, and American Express",
                "PayPal",
              ]}
            />
            <p>
              Payments made through our online platform are processed securely. The balance of your
              booking is due as advised in your booking confirmation.
            </p>
            <p>
              All rates are quoted in US dollars (USD) per room, per night. Rates vary by room type
              and season. Seasonal (summer/peak) rates apply during our peak period and are shown at
              the time of booking. The rate applicable to your stay is always displayed and
              confirmed before you pay.
            </p>
          </Section>

          <Section number="4" title="Cancellations">
            <p>
              Free cancellation up to 48 hours before check-in. If you cancel more than 48 hours
              before your check-in date, you will not be charged and any deposit paid is refunded in
              full.
            </p>
            <p>
              Cancellations within 48 hours of check-in forfeit a deposit equal to one night&apos;s
              payment. No-shows are treated as a cancellation within 48 hours.
            </p>
            <p>
              The cancellation terms applicable to your reservation are also stated in your booking
              confirmation.
            </p>
          </Section>

          <Section number="5" title="Property Rules">
            <p>
              To ensure a comfortable and safe stay for all guests, the following rules apply to all
              apartments and the premises:
            </p>
            <BulletList
              items={[
                "Meals are not provided. Malfranza does not offer meal service.",
                "No pets are allowed on the premises.",
                "No smoking is permitted inside the apartments.",
                "No parties are permitted on the premises.",
              ]}
            />
            <p>
              Breach of these rules may result in additional charges, forfeiture of your deposit, or
              termination of your stay without refund, at our discretion.
            </p>
          </Section>

          <Section number="6" title="Children">
            <p>
              There is no age limit for children. Guests of all ages are welcome.
            </p>
          </Section>

          <Section number="7" title="Parking">
            <p>
              Free parking is available for guests travelling with their own transportation.
            </p>
          </Section>

          <Section number="8" title="Taxi & Airport Pickup Service">
            <p>
              Malfranza offers a taxi service, including airport pickups that can be added to your
              apartment booking. When you add airport pickup to a stay booking through our platform,
              a bundle discount may apply as shown at checkout. Taxi bookings are subject to driver
              availability and confirmation.
            </p>
          </Section>

          <Section number="9" title="Amenities">
            <p>Our apartments are outfitted with the following:</p>
            <BulletList
              items={[
                "Solar electricity — the property is powered by a solar energy system",
                "Starlink high-speed internet — the property is serviced by Starlink satellite internet connection",
              ]}
            />
          </Section>

          <Section number="10" title="Check-In & Check-Out">
            <ul className="mt-1 space-y-2 text-sm text-muted-foreground sm:text-base">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" />
                <span>
                  <strong className="font-semibold text-brand-charcoal">Check-in:</strong> from
                  3:00 PM
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" />
                <span>
                  <strong className="font-semibold text-brand-charcoal">Check-out:</strong> by
                  11:00 AM
                </span>
              </li>
            </ul>
            <p>
              Early check-in and late check-out may be available on request and are subject to
              availability. A fee of US $35 applies to early check-in or late check-out.
            </p>
          </Section>

          <Section number="11" title="Changes to This Policy">
            <p>
              We may update this Booking Policy from time to time. The version in effect at the time
              of your booking applies to that booking. Should any additional terms or information
              arise, we will advise you accordingly.
            </p>
          </Section>

          <div className="rounded-2xl border border-brand-green/15 bg-brand-green px-6 py-8 text-white sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">
              Guest Policy
            </p>
            <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-brand-cream sm:text-2xl">
              Contact us
            </h2>
            <p className="mt-4 font-semibold text-brand-sage">
              Malfranza Apartments &amp; Taxi Barbados
            </p>
            <ul className="mt-4 space-y-3 text-sm sm:text-base">
              <li>
                <a
                  href="mailto:malfranza@gmail.com"
                  className="inline-flex items-center gap-2 text-white/90 transition hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0 text-brand-sage" />
                  malfranza@gmail.com
                </a>
              </li>
              <li className="flex flex-wrap items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-sage" />
                <span className="text-white/90">
                  <a href="tel:+12462344875" className="hover:text-white">
                    1 (246) 234-4875
                  </a>
                  <span className="text-white/50"> / </span>
                  <a href="tel:+12462314875" className="hover:text-white">
                    1 (246) 231-4875
                  </a>
                </span>
              </li>
            </ul>
            <p className="mt-6 text-sm text-white/70">
              Also see{" "}
              <Link to="/privacy" className="font-medium text-brand-sage underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              {" · "}
              <Link to="/cookies" className="font-medium text-brand-sage underline-offset-4 hover:underline">
                Cookies Policy
              </Link>
              {" · "}
              <Link to="/contact" className="font-medium text-brand-sage underline-offset-4 hover:underline">
                Contact
              </Link>
              .
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  // Use div (not section) so global scroll-reveal on `main section` cannot leave
  // long policy pages with invisible lower content (opacity 0).
  return (
    <div className="scroll-mt-24">
      <div className="flex items-start gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold tracking-tight text-brand-green sm:text-2xl">
            {title}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm text-muted-foreground sm:text-base">
      {items.map((line) => (
        <li key={line} className="flex items-start gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
