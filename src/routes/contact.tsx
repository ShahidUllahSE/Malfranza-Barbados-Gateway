import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Phone, MessageCircle, Mail, MapPin, Lock, ChevronRight, ArrowRight,
  Plus, Minus,
} from "lucide-react";
import stayGarden from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_00 PM.png";
import { createEnquiry } from "@/lib/bookings";
import { LocationMap } from "@/components/maps/LocationMap";
import { OISTINS_CENTER } from "@/lib/googleMaps";


export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Malfranza Apartments & Taxi" },
      { name: "description", content: "Get in touch with Malfranza — call, WhatsApp, email or send a message. We reply within hours." },
      { property: "og:title", content: "Contact Malfranza Apartments & Taxi" },
      { property: "og:description", content: "Reach out about apartment stays or taxi service in Barbados." },
      { property: "og:image", content: stayGarden },
    ],
  }),
  component: ContactPage,
});

const PHONE = "+1 (246) 123-4567";
const PHONE_TEL = "+12461234567";
const WHATSAPP_URL = `https://wa.me/12461234567`;
const EMAIL = "info@malfranzaapartments.com";
const ADDRESS = "Near Grantley Adams Intl. Airport (BGI), Oistins, Christ Church, Barbados";
const DIRECTIONS_URL = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent("Oistins, Christ Church, Barbados");

const contactSchema = z.object({
  fullName: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  interest: z.enum(["Apartment Stay", "Taxi Service", "Both", "Other"]),
  date: z.string().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Please add a short message").max(1000),
});

type FormState = {
  fullName: string; email: string; phone: string;
  interest: "Apartment Stay" | "Taxi Service" | "Both" | "Other" | "";
  date: string; message: string;
};

const FAQS = [
  { q: "What time is check-in and check-out?", a: "Check-in is from 3:00 PM and check-out is by 11:00 AM. Early check-in or late check-out may be available — just ask!" },
  { q: "How quickly will I get a response?", a: "We typically respond within a few hours. For urgent assistance, please call or message us on WhatsApp." },
  { q: "Do you offer airport transport?", a: "Yes! Our reliable taxi service is available 24/7. Let us know your flight details and we'll take care of the rest." },
  { q: "How can I make a booking?", a: "You can book directly on our website or contact us to check availability for your preferred dates." },
];

function ContactPage() {
  const [form, setForm] = useState<FormState>({
    fullName: "", email: "", phone: "", interest: "", date: "", message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const ref = await createEnquiry({
        name: result.data.fullName,
        email: result.data.email,
        phone: result.data.phone || undefined,
        interestedIn: result.data.interest,
        preferredDates: result.data.date || undefined,
        message: result.data.message,
      });
      toast.success(`Message sent — reference ${ref}`);
      setForm({ fullName: "", email: "", phone: "", interest: "", date: "", message: "" });

    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 pt-10 md:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-10 items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand-cream px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-green">
              Contact
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-[1.05]">
              We're here to help you book with confidence.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl">
              Have a question or ready to book? Reach out and we'll take care of the rest.
            </p>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-card">
            <img src={stayGarden} alt="Tropical garden" className="w-full h-full object-cover aspect-[5/4]" />
          </div>
        </div>
      </section>

      {/* CONTACT METHOD CARDS */}
      <section className="mx-auto max-w-7xl px-6 mt-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MethodCard icon={Phone} title="Call Us" primary={PHONE} note="Mon – Sun, 7am – 9pm" href={`tel:${PHONE_TEL}`} />
          <MethodCard icon={MessageCircle} title="WhatsApp" primary={PHONE} note="Quick replies" href={WHATSAPP_URL} external />
          <MethodCard icon={Mail} title="Email Us" primary={EMAIL} note="We reply within hours" href={`mailto:${EMAIL}`} />
          <MethodCard
            icon={MapPin}
            title="Our Location"
            primary="Near Grantley Adams Intl. Airport"
            note="Oistins, Christ Church, Barbados"
            link={{ href: DIRECTIONS_URL, label: "Get Directions" }}
          />
        </div>
      </section>

      {/* TWO-COLUMN */}
      <section className="mx-auto max-w-7xl px-6 mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-white p-6 md:p-8 shadow-card">
            <h2 className="text-2xl font-bold">Send us a message</h2>
            <p className="text-sm text-muted-foreground mt-1">We'd love to hear from you.</p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name" required error={errors.fullName}>
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} maxLength={100} className="input" placeholder="Jane Doe" />
              </Field>
              <Field label="Email Address" required error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} className="input" placeholder="you@example.com" />
              </Field>
              <Field label="Phone Number" error={errors.phone}>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} className="input" placeholder="+1 246 000 0000" />
              </Field>
              <Field label="I'm Interested In" required error={errors.interest}>
                <select value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value as FormState["interest"] })} className="input">
                  <option value="" disabled>Select an option</option>
                  <option>Apartment Stay</option>
                  <option>Taxi Service</option>
                  <option>Both</option>
                  <option>Other</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Stay Dates or Transport Request" error={errors.date}>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Message" required error={errors.message}>
                  <textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={1000} className="input resize-none" placeholder="Tell us about your trip or question…" />
                </Field>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-brand-green px-6 py-3.5 font-semibold text-white hover:opacity-95 transition disabled:opacity-60">
              {submitting ? "Sending…" : "Send Message"}
            </button>

            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Your information is secure and will only be used to respond to your inquiry.
            </p>

            <style>{`
              .input {
                width: 100%;
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 10px 14px;
                font-size: 14px;
                background: white;
                outline: none;
                transition: border-color 0.15s;
              }
              .input:focus { border-color: var(--brand-green); }
            `}</style>
          </form>

          {/* Map */}
          <div className="rounded-2xl overflow-hidden border border-border bg-white shadow-card relative min-h-[420px]">
            <LocationMap center={OISTINS_CENTER} zoom={15} className="absolute inset-0 h-full w-full" />

            {/* Overlay card */}
            <div className="absolute left-4 right-4 bottom-4 pointer-events-none">
              <div className="rounded-2xl bg-white p-5 shadow-card pointer-events-auto">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-cream shrink-0">
                    <MapPin className="h-5 w-5 text-brand-green" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-brand-green">Malfranza Apartments</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{ADDRESS}</p>
                    <a
                      href={DIRECTIONS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange hover:underline"
                    >
                      Get Directions <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-6 my-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Before you arrive</h2>
            <p className="mt-2 text-muted-foreground">Quick answers to common questions from our guests.</p>
          </div>
          <a href="#faqs" className="inline-flex items-center gap-1 text-brand-green font-semibold hover:underline">
            View All FAQs <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        <div id="faqs" className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAQS.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} defaultOpen={i === 0} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({
  label, required, error, children,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-brand-charcoal mb-1.5">
        {label}{required && <span className="text-brand-orange"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function MethodCard({
  icon: Icon, title, primary, note, href, external, link,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; primary: string; note: string;
  href?: string; external?: boolean;
  link?: { href: string; label: string };
}) {
  const content = (
    <>
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-sage/25">
        <Icon className="h-5 w-5 text-brand-green" />
      </div>
      <h3 className="mt-4 font-bold text-brand-green">{title}</h3>
      <p className="mt-1 text-sm font-medium text-brand-charcoal break-words">{primary}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      {link && (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange hover:underline"
        >
          {link.label} <ArrowRight className="h-3.5 w-3.5" />
        </a>
      )}
    </>
  );
  const className = "block rounded-2xl border border-border bg-white p-6 shadow-card hover:shadow-[var(--shadow-card-hover)] transition";
  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={className}>
        {content}
      </a>
    );
  }
  return <div className={className}>{content}</div>;
}

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-semibold text-brand-green">{q}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-cream shrink-0">
          {open ? <Minus className="h-4 w-4 text-brand-green" /> : <Plus className="h-4 w-4 text-brand-green" />}
        </span>
      </button>
      {open && <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
}
