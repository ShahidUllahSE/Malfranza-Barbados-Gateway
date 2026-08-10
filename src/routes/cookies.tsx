import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies Policy — Malfranza Apartments & Taxi" },
      {
        name: "description",
        content:
          "How Malfranza uses cookies and similar technologies on our website and online booking platform.",
      },
      { property: "og:title", content: "Cookies Policy — Malfranza" },
      {
        property: "og:description",
        content:
          "Learn how we use cookies for booking, analytics, advertising, and essential site features.",
      },
    ],
  }),
  component: CookiesPolicyPage,
});

function CookiesPolicyPage() {
  return (
    <div className="min-h-screen bg-brand-cream/50">
      <section className="border-b border-brand-green-deep bg-brand-green text-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          {/* Document-style heading: GUEST POLICY + page title */}
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-orange sm:text-base">
            Guest Policy
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-brand-cream sm:text-5xl md:text-[3.25rem] md:leading-[1.1]">
            Cookies Policy
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
            This policy explains how Malfranza uses cookies and similar technologies on our website
            and online booking platform. It should be read together with our{" "}
            <Link to="/privacy" className="font-medium text-brand-sage underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="space-y-12">
          <Section number="1" title="What Are Cookies?">
            <p>
              Cookies are small text files placed on your device (computer, tablet, or phone) when
              you visit a website. They help websites function properly, remember your preferences,
              and understand how visitors use the site.
            </p>
            <p>
              Similar technologies such as pixels and local storage may also be used, and are
              covered by this policy.
            </p>
          </Section>

          <Section number="2" title="How We Use Cookies">
            <p>We use cookies for the following purposes:</p>

            <SubSection title="Strictly necessary cookies">
              <p>
                These are essential for the website and booking platform to function. They enable
                core features such as navigating pages, searching availability, completing a
                booking, and processing secure payments. The site cannot work properly without them.
              </p>
            </SubSection>

            <SubSection title="Functional cookies">
              <p>
                These remember choices you make (such as your details during a booking flow or your
                preferences) to give you a smoother experience.
              </p>
            </SubSection>

            <SubSection title="Analytics and performance cookies">
              <p>
                These help us understand how visitors use our website — which pages are visited,
                how long people stay, and where issues occur — so we can improve the site. This
                information is collected in aggregate. We use Google Analytics for this purpose.
              </p>
            </SubSection>

            <SubSection title="Advertising and retargeting cookies">
              <p>
                We use the Meta Pixel (Facebook and Instagram) to measure the performance of our
                advertising and to show relevant ads to people who have visited our website. These
                cookies allow us to understand which ads lead to bookings and to reach potential
                guests with offers that may interest them.
              </p>
            </SubSection>

            <SubSection title="Third-party cookies">
              <p>
                Some cookies are set by third-party services integrated into our platform,
                including:
              </p>
              <ul className="mt-3 list-none space-y-2.5">
                {[
                  {
                    name: "Google Analytics",
                    desc: "to measure website traffic and usage",
                  },
                  {
                    name: "Meta Pixel (Facebook / Instagram)",
                    desc: "to measure and target our advertising",
                  },
                  {
                    name: "PayPal",
                    desc: "to enable secure payment processing",
                  },
                  {
                    name: "Google Maps",
                    desc: "to provide mapping and location search for our taxi and pickup services",
                  },
                ].map((item) => (
                  <li
                    key={item.name}
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm leading-relaxed text-muted-foreground shadow-sm"
                  >
                    <span className="font-semibold text-brand-charcoal">{item.name}</span>
                    <span className="text-muted-foreground"> — {item.desc}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">
                These third parties set their own cookies and are governed by their own privacy and
                cookie policies.
              </p>
            </SubSection>
          </Section>

          <Section number="3" title="Managing Your Cookie Preferences">
            <p>
              When you first visit our website, you may be presented with a cookie banner allowing
              you to accept or manage cookies. You can also control cookies through your browser
              settings, where you can block or delete cookies at any time.
            </p>
            <p>
              Please note that disabling strictly necessary cookies may prevent parts of the website
              — including the booking and payment functions — from working correctly.
            </p>
            <p>Most browsers allow you to:</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground sm:text-base">
              {[
                "View the cookies stored on your device",
                "Delete existing cookies",
                "Block cookies from being set",
                "Set preferences for specific websites",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              Instructions vary by browser; check your browser&apos;s help section for guidance.
            </p>
          </Section>

          <Section number="4" title="Consent">
            <p>
              By continuing to use our website after being informed about cookies, or by accepting
              cookies through our banner, you consent to our use of cookies as described in this
              policy. You may withdraw or change your consent at any time through your browser
              settings or, where available, our cookie preference tool.
            </p>
          </Section>

          <Section number="5" title="Changes to This Policy">
            <p>
              We may update this Cookies Policy from time to time to reflect changes in the
              technologies we use or legal requirements. The updated version will be posted on our
              website with a revised &ldquo;Last updated&rdquo; date.
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
              For questions about our use of cookies:
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
              Prefer another channel?{" "}
              <Link to="/contact" className="font-medium text-brand-sage underline-offset-4 hover:underline">
                Visit our contact page
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
