import { createFileRoute } from "@tanstack/react-router";
import {
  Wifi, Snowflake, ChefHat, Tv, Bath, Car, WashingMachine, Route as RouteIcon,
  KeyRound, ShoppingBag, CheckCircle2, Sparkles, Zap, MapPin,
  Refrigerator, Microwave, Coffee, Shirt, Flame, CookingPot,
} from "lucide-react";
import amenitiesHero from "@/assets/AmmenitiesPage.png";
import stay1br from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_34 PM.png";
import stayBathroom from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_13 PM.png";
import stayGarden from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_00 PM.png";
import stayKitchen from "@/assets/ChatGPT Image Jul 2, 2026, 10_49_20 PM.png";
import { StarlinkBadge } from "@/components/StarlinkBadge";

export const Route = createFileRoute("/amenities")({
  head: () => ({
    meta: [
      { title: "Amenities — Malfranza Apartments & Taxi" },
      { name: "description", content: "Everything you need for a comfortable stay in Barbados — Starlink internet, AC, full kitchen, Smart TV, parking, laundry and more." },
      { property: "og:title", content: "Amenities — Malfranza Apartments" },
      { property: "og:description", content: "Thoughtfully equipped apartments with modern amenities for an easy, relaxing stay." },
      { property: "og:image", content: amenitiesHero },
    ],
  }),
  component: AmenitiesPage,
});

const AMENITIES = [
  { icon: Wifi, title: "High Speed Starlink Internet", body: "Fast, reliable Starlink Wi-Fi throughout the apartment — ready for work or streaming.", featured: true },
  { icon: Snowflake, title: "Air Conditioning", body: "Stay cool and comfortable with air conditioning in every bedroom and living area." },
  { icon: ChefHat, title: "Kitchen", body: "A fully equipped self-catering kitchen with cookware and everything you need to make meals at home." },
  { icon: Tv, title: "Smart TV", body: "Enjoy your favorite shows and apps on a large high-definition Smart TV." },
  { icon: Refrigerator, title: "Fridge", body: "A full-size refrigerator so you can keep groceries, drinks, and leftovers fresh." },
  { icon: Microwave, title: "Microwave", body: "Heat up meals quickly after a day at the beach or a night out in Oistins." },
  { icon: Coffee, title: "Kettle", body: "An electric kettle for tea, instant coffee, and a quick hot drink whenever you like." },
  { icon: Coffee, title: "Coffee Machine", body: "Start the morning with coffee in your apartment — no café run required." },
  { icon: CookingPot, title: "Toaster", body: "A toaster for easy breakfasts before you head out for the day." },
  { icon: Shirt, title: "Iron", body: "An iron so you can keep clothes fresh for dinners, events, or work days." },
  { icon: Flame, title: "Fire Extinguisher", body: "A fire extinguisher is provided in every apartment for your peace of mind." },
  { icon: WashingMachine, title: "Washing Machine", body: "In-unit washer in one-bedroom apartments — handy for longer stays. Two-bedroom suites do not include a washer." },
  { icon: Bath, title: "Private Bathroom", body: "Clean, modern bathrooms with hot water and essential toiletries." },
  { icon: Car, title: "Free Parking", body: "Complimentary on-site parking for a hassle-free and secure stay." },
  { icon: RouteIcon, title: "Easy Highway Access", body: "Quick access to the ABC Highway to reach any part of the island with ease." },
  { icon: KeyRound, title: "Self Check-In", body: "Flexible self check-in with secure key access at your convenience." },
  { icon: ShoppingBag, title: "Nearby Shops", body: "Supermarkets, gas stations, restaurants, and services just minutes away." },
];

const VALUES = [
  { icon: Sparkles, title: "Comfort You Deserve", body: "Relax in thoughtfully designed spaces with quality furnishings, fresh linens, and all the essentials for a restful stay." },
  { icon: Zap, title: "Convenience That Matters", body: "From self check-in to in-unit laundry and free parking, we make every part of your stay simple and stress-free." },
  { icon: MapPin, title: "A Great Location", body: "Centrally located with easy highway access and close to everything you need on the beautiful island of Barbados." },
];

const STRIP = [
  { src: stay1br, alt: "Bedroom" },
  { src: stayGarden, alt: "Tropical garden" },
  { src: stayKitchen, alt: "Kitchen and dining" },
  { src: stayBathroom, alt: "Bathroom" },
];

function AmenitiesPage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 md:pt-16 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-10 items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand-cream px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-green">
              Amenities
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.05]">
              Everything you need for a comfortable stay.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl">
              Our apartments are thoughtfully equipped with modern amenities and essentials
              to make your stay in Barbados easy, relaxing, and enjoyable.
            </p>
            <div className="mt-5">
              <StarlinkBadge />
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-card">
            <img
              src={amenitiesHero}
              alt="Apartment living area with kitchen and seating"
              className="w-full h-full object-cover aspect-[5/4]"
            />
          </div>
        </div>
      </section>

      {/* AMENITY GRID */}
      <section className="mx-auto max-w-7xl px-4 mt-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {AMENITIES.map(({ icon: Icon, title, body, featured }) => (
            <article
              key={title}
              className={
                featured
                  ? "rounded-2xl border-2 border-brand-green/35 bg-brand-cream/50 p-6 shadow-card sm:col-span-2 lg:col-span-3"
                  : "rounded-2xl border border-border bg-white p-6 shadow-card hover:shadow-[var(--shadow-card-hover)] transition"
              }
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-sage/25">
                <Icon className="h-5 w-5 text-brand-green" />
              </div>
              <h3 className="mt-4 font-bold text-brand-green">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-brand-green px-4 py-4 text-center text-white lg:rounded-full lg:px-6">
          <span className="inline-flex flex-wrap items-center justify-center gap-2 text-sm font-medium sm:text-base">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-orange" />
            Safe, clean, and well-maintained spaces with everything you need to feel at home.
          </span>
        </div>
      </section>

      {/* THREE-VALUE STRIP */}
      <section className="mt-20">
        <div className="bg-brand-cream py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {VALUES.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-green">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-brand-green">{title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PHOTO STRIP */}
      <section className="mx-auto max-w-7xl px-4 my-16 sm:px-6 sm:my-20 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {STRIP.map((img) => (
            <div key={img.alt} className="rounded-2xl overflow-hidden aspect-square shadow-card">
              <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
