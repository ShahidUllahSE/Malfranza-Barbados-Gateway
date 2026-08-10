import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Malfranza Apartments & Taxi" },
      {
        name: "description",
        content:
          "How Malfranza collects, uses, and protects your personal information under the Data Protection Act, 2019 of Barbados.",
      },
      { property: "og:title", content: "Privacy Policy — Malfranza" },
      {
        property: "og:description",
        content:
          "Learn what personal data we collect for stays and taxi bookings, and the rights you have under Barbadian law.",
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-brand-cream/50">
      <section className="border-b border-brand-green-deep bg-brand-green text-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          {/* Document-style heading: GUEST POLICY + page title */}
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-orange sm:text-base">
            Guest Policy
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-brand-cream sm:text-5xl md:text-[3.25rem] md:leading-[1.1]">
            Privacy Policy
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
            We are committed to protecting your privacy. This policy explains what personal
            information we collect, how we use it, who we share it with, and the rights you have.
            We handle personal data in accordance with the Data Protection Act, 2019 of Barbados.
            By using our website and booking platform, you consent to the practices described in
            this policy.
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="space-y-12">
          <Section number="1" title="Who We Are">
            <p>
              Malfranza Apartments &amp; Taxi is a provider of apartment accommodation and taxi
              services based in Barbados. For the purposes of the Data Protection Act, 2019, we are
              the data controller responsible for your personal data.
            </p>
            <p>
              Contact:{" "}
              <a href="mailto:malfranza@gmail.com" className="font-medium text-brand-green hover:underline">
                malfranza@gmail.com
              </a>
              {" · "}
              <a href="tel:+12462344875" className="font-medium text-brand-green hover:underline">
                1 (246) 234-4875
              </a>
              {" / "}
              <a href="tel:+12462314875" className="font-medium text-brand-green hover:underline">
                1 (246) 231-4875
              </a>
            </p>
          </Section>

          <Section number="2" title="Information We Collect">
            <p>We collect the following categories of personal information:</p>

            <SubSection title="Information you provide when booking">
              <BulletList
                items={[
                  "Full name",
                  "Email address",
                  "Phone number",
                  "Booking details (dates, apartment selected, number of guests, taxi/airport pickup requests)",
                  "Any special requests or notes you provide",
                ]}
              />
            </SubSection>

            <SubSection title="Payment information">
              <p>
                Payments are processed by our third-party payment providers (PayPal and card
                processors). We do not store your full card number on our systems. Payment providers
                process your card or account details directly under their own security standards.
              </p>
            </SubSection>

            <SubSection title="Information collected automatically">
              <p>
                Technical data such as IP address, browser type, device information, and pages
                visited, collected through cookies and similar technologies (see our{" "}
                <Link to="/cookies" className="font-medium text-brand-green hover:underline">
                  Cookies Policy
                </Link>
                ).
              </p>
            </SubSection>

            <SubSection title="Location data">
              <p>
                When you use the pickup location search for our taxi service, location information
                you enter is used to arrange your transport.
              </p>
            </SubSection>
          </Section>

          <Section number="3" title="How We Use Your Information">
            <p>We use your personal information to:</p>
            <BulletList
              items={[
                "Process and confirm your bookings and deposits",
                "Communicate with you about your reservation",
                "Arrange taxi and airport pickup services",
                "Process payments and refunds",
                "Respond to your enquiries and provide customer support",
                "Send you booking-related notifications",
                "Maintain our records and manage our business operations",
                "Comply with our legal and regulatory obligations",
                "Improve our website and services",
              ]}
            />

            <SubSection title="Marketing and promotional communications">
              <p>
                Where you have given us your consent, we also use your name and email address to
                send you marketing communications — including special offers, seasonal promotions,
                and invitations to book with us again. We may also use your email address to show
                you relevant advertising through third-party advertising platforms (known as
                retargeting or audience matching).
              </p>
              <p>
                Marketing is always optional and consent-based. You can withdraw your consent and
                unsubscribe at any time by using the unsubscribe link in any marketing email, or by
                contacting us at{" "}
                <a href="mailto:malfranza@gmail.com" className="font-medium text-brand-green hover:underline">
                  malfranza@gmail.com
                </a>
                . Withdrawing marketing consent does not affect our ability to send you essential
                messages about a booking you have made.
              </p>
            </SubSection>
          </Section>

          <Section number="4" title="Legal Basis for Processing">
            <p>
              We process your personal data on the following bases under the Data Protection Act,
              2019:
            </p>
            <BulletList
              items={[
                "Performance of a contract — to fulfil your booking and provide the services you request",
                "Consent — where you have given consent (for example, for cookies or marketing)",
                "Legal obligation — where we are required to process data by law",
                "Legitimate interests — to operate and improve our business, where this does not override your rights",
              ]}
            />
          </Section>

          <Section number="5" title="How We Share Your Information">
            <p>We do not sell your personal information. We share it only as necessary:</p>
            <BulletList
              items={[
                "Payment processors (PayPal, card processors) — to process your payments",
                "Taxi/driver personnel — to arrange your requested transport",
                "Technology service providers — who host our platform and provide supporting services under confidentiality obligations",
                "Booking channels — where your booking originates from a third-party platform (such as Booking.com or Expedia), information is shared as needed to fulfil that booking",
                "Legal and regulatory authorities — where required by law",
              ]}
            />
          </Section>

          <Section number="6" title="Third-Party Services">
            <p>
              Our platform integrates the following third-party services, each with its own privacy
              practices:
            </p>
            <ul className="mt-3 list-none space-y-2.5">
              {[
                { name: "PayPal", desc: "payment processing" },
                { name: "Google Maps", desc: "location and mapping services" },
                { name: "Starlink", desc: "internet connectivity at the property" },
                {
                  name: "Booking channel partners",
                  desc: "such as Booking.com, Expedia, Hotels.com where applicable",
                },
              ].map((item) => (
                <li
                  key={item.name}
                  className="rounded-xl border border-border bg-white px-4 py-3 text-sm leading-relaxed text-muted-foreground shadow-sm"
                >
                  <span className="font-semibold text-brand-charcoal">{item.name}</span>
                  <span> — {item.desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              We encourage you to review the privacy policies of these providers.
            </p>
          </Section>

          <Section number="7" title="Data Retention">
            <p>
              We retain your personal information for as long as necessary to fulfil your booking,
              provide our services, resolve disputes, and enforce our agreements. Where the law sets
              a retention period, we follow it.
            </p>
            <p>
              Guest booking and transaction records are kept for the period required by Barbadian
              law, including the record-keeping obligations that apply to accounting and tax
              records, and are retained in accordance with the Data Protection Act, 2019 of
              Barbados. Where you have consented to marketing, we keep your contact details until
              you withdraw that consent. When your information is no longer required for these
              purposes, we securely delete or anonymise it.
            </p>
          </Section>

          <Section number="8" title="Data Security">
            <p>
              We take reasonable technical and organisational measures to protect your personal
              information against unauthorised access, loss, or misuse. Our booking platform uses
              secure connections, and access to guest data is restricted to authorised personnel
              through a secure admin login. However, no method of transmission over the internet is
              completely secure, and we cannot guarantee absolute security.
            </p>
          </Section>

          <Section number="9" title="Your Rights">
            <p>Under the Data Protection Act, 2019 of Barbados, you have the right to:</p>
            <BulletList
              items={[
                "Access the personal data we hold about you",
                "Correct inaccurate or incomplete data",
                "Request deletion of your data, where applicable",
                "Object to or restrict certain processing",
                "Withdraw consent where processing is based on consent",
                "Lodge a complaint with the Data Protection Commissioner of Barbados",
              ]}
            />
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:malfranza@gmail.com" className="font-medium text-brand-green hover:underline">
                malfranza@gmail.com
              </a>
              .
            </p>
          </Section>

          <Section number="10" title="Cookies">
            <p>
              Our website uses cookies and similar technologies. Please see our separate{" "}
              <Link to="/cookies" className="font-medium text-brand-green hover:underline">
                Cookies Policy
              </Link>{" "}
              for details.
            </p>
          </Section>

          <Section number="11" title="Children's Privacy">
            <p>
              While guests of all ages are welcome to stay with us, our online booking platform is
              intended to be used by adults aged 18 and over. We do not knowingly collect personal
              information directly from children through our website.
            </p>
          </Section>

          <Section number="12" title="International Transfers">
            <p>
              Some of our third-party service providers may process data outside Barbados. Where
              this occurs, we take steps to ensure your data is treated in accordance with
              applicable data protection standards.
            </p>
          </Section>

          <Section number="13" title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. The updated version will be
              posted on our website with a revised &ldquo;Last updated&rdquo; date.
            </p>
          </Section>

          <div className="rounded-2xl border border-brand-green/15 bg-brand-green px-6 py-8 text-white sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">
              Guest Policy
            </p>
            <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-brand-cream sm:text-2xl">
              Contact us
            </h2>
            <p className="mt-2 text-sm text-white/75">
              For any questions about this Privacy Policy or your personal data:
            </p>
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
              Also see our{" "}
              <Link to="/cookies" className="font-medium text-brand-sage underline-offset-4 hover:underline">
                Cookies Policy
              </Link>
              {" · "}
              <Link to="/contact" className="font-medium text-brand-sage underline-offset-4 hover:underline">
                Contact page
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

function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 border-l-2 border-brand-orange/50 pl-4 sm:pl-5">
      <h3 className="text-base font-semibold text-brand-charcoal sm:text-lg">{title}</h3>
      <div className="mt-2 space-y-3">{children}</div>
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
