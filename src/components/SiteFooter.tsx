import { Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Facebook, Instagram, MessageCircle } from "lucide-react";
import { Logo } from "./Logo";
import { useUserAuth } from "@/context/UserAuthContext";

export function SiteFooter() {
  const { session, openAuthModal } = useUserAuth();
  const isAgency = session?.kind === "agency";

  return (
    <footer className="mt-16 bg-brand-green text-white/90 sm:mt-20 lg:mt-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-1">
          <div className="inline-flex rounded-xl bg-white p-3">
            <Logo className="h-14 w-auto" />
          </div>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75">
            Comfortable stays and reliable taxi service in Barbados. Trusted, local, and easy to book.
          </p>
          <p className="mt-6 text-sm font-semibold text-brand-sage">
            Stay comfortably. Move easily.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Contact Us</h4>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-sage" />
              <a href="tel:+12462344875" className="hover:text-white">+1 (246) 234-4875</a>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-sage" />
              <a href="mailto:info@malfranzarentals.com" className="break-all hover:text-white">
                info@malfranzarentals.com
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-sage" />
              <span>Haggatt Hall, St. Michael<br />Barbados</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Quick Links</h4>
          <ul className="mt-5 space-y-3 text-sm">
            <li><Link to="/stays" className="text-white/80 hover:text-white">Stays</Link></li>
            <li><Link to="/taxi" className="text-white/80 hover:text-white">Taxi Service</Link></li>
            <li><Link to="/amenities" className="text-white/80 hover:text-white">Amenities</Link></li>
            <li><Link to="/contact" className="text-white/80 hover:text-white">Contact</Link></li>
            <li><Link to="/agency" className="text-white/80 hover:text-white">Travel agent portal</Link></li>
            <li><Link to="/agency/signup" className="text-white/80 hover:text-white">Travel agent signup</Link></li>
            <li><Link to="/privacy" className="text-white/80 hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/booking-policy" className="text-white/80 hover:text-white">Booking Policy</Link></li>
            <li><Link to="/terms" className="text-white/80 hover:text-white">Terms &amp; Conditions</Link></li>
            <li><Link to="/cookies" className="text-white/80 hover:text-white">Cookies Policy</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Let's Connect</h4>
          <a
            href="https://wa.me/12462344875"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <MessageCircle className="h-5 w-5 text-brand-sage" />
            <span>Chat on WhatsApp</span>
          </a>
          <div className="mt-5 flex items-center gap-3">
            <a href="#" aria-label="Facebook" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Instagram" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="https://wa.me/12462344875" aria-label="WhatsApp" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white/10 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
                  Travel agents
                </h4>
                <p className="mt-2 text-sm text-white/80">
                  Create your own agency account, verify your email, then use the same site Sign in
                  to open your portal and get a booking code.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {isAgency ? (
                  <Link
                    to="/agency"
                    className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-green hover:bg-white/90"
                  >
                    Open agency portal
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/agency/signup"
                      className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-green hover:bg-white/90"
                    >
                      Create travel agent account
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        openAuthModal({
                          mode: "signin",
                          redirectTo: "/agency",
                          reason: "Sign in with your travel agent email and password.",
                        })
                      }
                      className="inline-flex items-center justify-center rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-white/60 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Malfranza Apartments & Taxi. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/privacy" className="hover:text-white">
              Privacy Policy
            </Link>
            <span className="hidden text-white/30 sm:inline" aria-hidden>
              ·
            </span>
            <Link to="/booking-policy" className="hover:text-white">
              Booking Policy
            </Link>
            <span className="hidden text-white/30 sm:inline" aria-hidden>
              ·
            </span>
            <Link to="/terms" className="hover:text-white">
              Terms &amp; Conditions
            </Link>
            <span className="hidden text-white/30 sm:inline" aria-hidden>
              ·
            </span>
            <Link to="/cookies" className="hover:text-white">
              Cookies Policy
            </Link>
            <span className="hidden text-white/30 sm:inline" aria-hidden>
              ·
            </span>
            <p className="text-center sm:text-left">Clean stays. Reliable service. Local hospitality.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
