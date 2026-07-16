import { Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Facebook, Instagram, MessageCircle } from "lucide-react";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-brand-green text-white/90">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-4 lg:px-8">
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
              <a href="tel:+12468234567" className="hover:text-white">+1 (246) 823-4567</a>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-sage" />
              <a href="mailto:info@malfranzaapartments.com" className="hover:text-white">
                info@malfranzaapartments.com
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-sage" />
              <span>Oistins, Christ Church<br />Barbados</span>
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
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Let's Connect</h4>
          <a
            href="https://wa.me/12468234567"
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
            <a href="https://wa.me/12468234567" aria-label="WhatsApp" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-white/60 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Malfranza Apartments & Taxi. All rights reserved.</p>
          <p>Clean stays. Reliable service. Local hospitality.</p>
        </div>
      </div>
    </footer>
  );
}
