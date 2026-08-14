import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Malfranza Apartments & Taxi" },
      {
        name: "description",
        content:
          "Terms governing use of the Malfranza website and booking platform, and bookings for apartment stays and taxi services in Barbados.",
      },
      { property: "og:title", content: "Terms & Conditions — Malfranza" },
      {
        property: "og:description",
        content:
          "Read Malfranza’s terms for website use, bookings, deposits, cancellations, guest responsibilities, and governing law.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-brand-cream/50">
      <section className="border-b border-brand-green-deep bg-brand-green text-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-orange sm:text-base">
            Guest Policy
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-brand-cream sm:text-5xl md:text-[3.25rem] md:leading-[1.1]">
            Terms &amp; Conditions
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
            These Terms govern your use of our website and online booking platform, and your booking
            of any apartment stay or taxi service. By accessing our website or making a booking, you
            agree to these Terms.
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="space-y-12">
          <Section number="1" title="About Us">
            <p>
              Malfranza Apartments &amp; Taxi provides apartment accommodation and taxi services in
              Barbados. You can contact us at{" "}
              <a href="mailto:malfranza@gmail.com" className="font-medium text-brand-green hover:underline">
                malfranza@gmail.com
              </a>{" "}
              or{" "}
              <a href="tel:+12462344875" className="font-medium text-brand-green hover:underline">
                1 (246) 234-4875
              </a>
              {" / "}
              <a href="tel:+12462314875" className="font-medium text-brand-green hover:underline">
                1 (246) 231-4875
              </a>
              .
            </p>
          </Section>

          <Section number="2" title="Using Our Website and Booking Platform">
            <p>By using our platform, you confirm that:</p>
            <BulletList
              items={[
                "You are at least 18 years of age and able to enter into a binding contract",
                "The information you provide when booking is accurate and complete",
                "You will use the platform only for lawful purposes and in accordance with these Terms",
              ]}
            />
            <p>
              We grant you a limited, non-exclusive, non-transferable right to use our website for
              the purpose of viewing our services and making genuine bookings.
            </p>
          </Section>

          <Section number="3" title="Bookings and Contract Formation">
            <p>
              All bookings are subject to availability and to our{" "}
              <Link to="/booking-policy" className="font-medium text-brand-green hover:underline">
                Booking Policy
              </Link>
              , which forms part of these Terms. A binding contract is formed only when we issue a
              written confirmation and your required deposit has been received.
            </p>
            <p>
              We reserve the right to refuse or cancel any booking at our discretion, including
              where we suspect fraud, where information provided is inaccurate, or where a booking
              breaches these Terms. If we cancel a confirmed booking through no fault of yours, we
              will refund amounts paid for that booking.
            </p>
          </Section>

          <Section number="4" title="Deposit, Payment, and Cancellation">
            <BulletList
              items={[
                "A deposit of one night's payment is required at the time of booking.",
                "We accept Visa, Mastercard, American Express, and PayPal.",
                "Cancellations: a 50% refund applies if you cancel 7 or more days before check-in; no refund applies within 7 days of check-in or for no-shows. Once checked in, unused nights are not refundable. Full terms are in the Booking Policy and Refund Policy, and are stated in your booking confirmation.",
              ]}
            />
            <p>
              Full deposit, payment, and cancellation terms are set out in our{" "}
              <Link to="/booking-policy" className="font-medium text-brand-green hover:underline">
                Booking Policy
              </Link>
              .
            </p>
          </Section>

          <Section number="5" title="Property Rules">
            <p>
              All guests must comply with our property rules, which include: no meals provided, no
              pets, no smoking inside the apartments, and no parties on the premises. Full rules are
              set out in the{" "}
              <Link to="/booking-policy" className="font-medium text-brand-green hover:underline">
                Booking Policy
              </Link>
              . Breach of these rules may result in additional charges, forfeiture of your deposit,
              or termination of your stay without refund.
            </p>
          </Section>

          <Section number="6" title="Taxi and Airport Pickup Services">
            <p>
              Taxi and airport pickup services are provided subject to availability and confirmation.
              Where you add airport pickup to a stay booking, any bundle discount shown at checkout
              applies to that combined booking. We will use reasonable efforts to provide transport
              at the agreed time, but are not liable for delays caused by circumstances beyond our
              reasonable control (including traffic, weather, or flight schedule changes).
            </p>
          </Section>

          <Section number="7" title="Pricing">
            <p>
              All prices are displayed on our platform and confirmed at the time of booking. We make
              reasonable efforts to ensure pricing is accurate. In the event of an obvious pricing
              error, we reserve the right to cancel the affected booking and offer you the
              opportunity to rebook at the correct price or receive a full refund.
            </p>
          </Section>

          <Section number="8" title="Guest Responsibilities and Liability">
            <p>You are responsible for:</p>
            <BulletList
              items={[
                "Taking reasonable care of the apartment and its contents during your stay",
                "Any damage caused by you or members of your party beyond fair wear and tear",
                "The conduct of all members of your party",
              ]}
            />
            <p>
              We reserve the right to recover the cost of any damage, excessive cleaning, or breach
              of the property rules from you, including from your deposit.
            </p>
          </Section>

          <Section number="9" title="Our Liability">
            <p>To the fullest extent permitted by law:</p>
            <BulletList
              items={[
                "We provide our accommodation and services with reasonable care and skill.",
                "We are not liable for loss or damage to your personal belongings during your stay, except where caused by our negligence.",
                "We are not liable for any indirect, incidental, or consequential loss.",
                "Nothing in these Terms excludes or limits our liability where it would be unlawful to do so, including liability for death or personal injury caused by our negligence.",
              ]}
            />
          </Section>

          <Section number="10" title="Property Amenities">
            <p>
              The property is outfitted with solar electricity and is serviced by Starlink internet.
              While we make reasonable efforts to maintain these amenities, we do not guarantee
              uninterrupted service, as availability may be affected by weather or factors beyond our
              control.
            </p>
          </Section>

          <Section number="11" title="Intellectual Property">
            <p>
              All content on our website — including text, images, logos, branding, and design — is
              owned by or licensed to Malfranza and is protected by applicable intellectual property
              laws. You may not copy, reproduce, or use our content without our written permission.
            </p>
          </Section>

          <Section number="12" title="Third-Party Links and Services">
            <p>
              Our platform integrates and may link to third-party services (such as PayPal and Google
              Maps). We are not responsible for the content, policies, or practices of third-party
              services. Your use of those services is governed by their own terms.
            </p>
          </Section>

          <Section number="13" title="Privacy and Cookies">
            <p>
              Your use of our platform is also governed by our{" "}
              <Link to="/privacy" className="font-medium text-brand-green hover:underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link to="/cookies" className="font-medium text-brand-green hover:underline">
                Cookies Policy
              </Link>
              , which explain how we handle your personal information.
            </p>
          </Section>

          <Section number="14" title="Indemnity">
            <p>
              You agree to indemnify and hold Malfranza harmless from any claims, losses, or expenses
              arising from your breach of these Terms, your misuse of the platform, or your breach of
              any applicable law.
            </p>
          </Section>

          <Section number="15" title="Force Majeure">
            <p>
              We are not liable for any failure or delay in performing our obligations where this is
              caused by circumstances beyond our reasonable control, including natural disasters,
              extreme weather, power or internet failures, government action, or other events of
              force majeure.
            </p>
          </Section>

          <Section number="16" title="Changes to These Terms">
            <p>
              We may update these Terms from time to time. The version in effect at the time of your
              booking applies to that booking. Continued use of our platform after changes are posted
              constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section number="17" title="Governing Law and Jurisdiction">
            <p>
              These Terms are governed by the laws of Barbados, and any disputes arising from them
              or from your use of our platform are subject to the exclusive jurisdiction of the
              courts of Barbados.
            </p>
          </Section>

          <Section number="18" title="Contact Us">
            <p className="font-semibold text-brand-charcoal">
              Malfranza Apartments &amp; Taxi Barbados
            </p>
            <ul className="mt-3 space-y-3">
              <li>
                <a
                  href="mailto:malfranza@gmail.com"
                  className="inline-flex items-center gap-2 font-medium text-brand-green hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  malfranza@gmail.com
                </a>
              </li>
              <li className="flex flex-wrap items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                <span>
                  <a href="tel:+12462344875" className="font-medium text-brand-green hover:underline">
                    1 (246) 234-4875
                  </a>
                  <span className="text-muted-foreground"> / </span>
                  <a href="tel:+12462314875" className="font-medium text-brand-green hover:underline">
                    1 (246) 231-4875
                  </a>
                </span>
              </li>
            </ul>
            <p className="mt-4">
              Related policies:{" "}
              <Link to="/booking-policy" className="font-medium text-brand-green hover:underline">
                Booking
              </Link>
              {" · "}
              <Link to="/privacy" className="font-medium text-brand-green hover:underline">
                Privacy
              </Link>
              {" · "}
              <Link to="/cookies" className="font-medium text-brand-green hover:underline">
                Cookies
              </Link>
              {" · "}
              <Link to="/contact" className="font-medium text-brand-green hover:underline">
                Contact
              </Link>
              .
            </p>
          </Section>
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
