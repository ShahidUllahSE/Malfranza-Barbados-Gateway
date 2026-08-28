export type Beds24ChannelId = "booking" | "expedia" | "airbnb" | "vrbo" | "direct";

export type Beds24ChannelConfig = {
  id: Beds24ChannelId;
  title: string;
  description: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  channelBlurb: string;
  /** OTA connection steps (done in Beds24 + extranet — not in website code). */
  otaSetup?: {
    title: string;
    note: string;
    steps: string[];
  };
};

export const BEDS24_CHANNELS: Record<Beds24ChannelId, Beds24ChannelConfig> = {
  booking: {
    id: "booking",
    title: "Booking.com",
    description: "Properties and reservations from Beds24 for Booking.com.",
    accentBorder: "border-[#003580]/20",
    accentBg: "bg-[#003580]/[0.04]",
    accentText: "text-[#003580]",
    channelBlurb:
      "Shows all Beds24 properties plus bookings whose source is Booking.com. Connect Booking.com in Beds24 Channel Manager (or import a property with your Hotel ID when extranet login works).",
    otaSetup: {
      title: "Connect Booking.com",
      note: "Booking.com can import an existing listing into Beds24 using your Hotel ID (after Beds24 is selected as channel manager in the Booking.com extranet).",
      steps: [
        "Log in to Booking.com extranet → open the property → Channel Manager → search for Beds24 and connect.",
        "In Beds24: Settings → Channel Manager → Booking.com → Import → enter your Booking.com Hotel ID → Import.",
        "Review imported content, prices, and room mapping under Channel Manager → Booking.com.",
        "Import existing bookings, then activate the connection when mapping looks correct.",
        "Return here and click Refresh — Booking.com reservations will appear under Bookings.",
      ],
    },
  },
  expedia: {
    id: "expedia",
    title: "Expedia",
    description: "Properties and Expedia-sourced reservations from Beds24.",
    accentBorder: "border-[#00355F]/20",
    accentBg: "bg-[#00355F]/[0.04]",
    accentText: "text-[#00355F]",
    channelBlurb:
      "Shows all Beds24 properties plus bookings from Expedia / Hotels.com once the channel is enabled in Beds24 Channel Manager.",
    otaSetup: {
      title: "Connect Expedia",
      note: "Expedia does not import listings into Beds24 like Booking.com. Create the property in Beds24 first (or import from Booking.com), then link your existing Expedia listing.",
      steps: [
        "Log in to Expedia Partner Central (extranet) for the property.",
        "Expedia Connectivity Settings → select Beds24 as channel manager → complete verification if prompted.",
        "In Beds24: Settings → Channel Manager → Expedia → enter your Expedia Hotel ID → Save.",
        "Set Pricing Model (Per Day / Per Occupancy) and Acquisition type to match the details in Expedia’s activation email.",
        "Mapping → Get Code → map each Beds24 room to the Expedia room type ID, then map rate plan IDs.",
        "Tick Bookings for each room → Import existing bookings → enable Inventory and Rates → activate.",
        "Return here and click Refresh — Expedia reservations will appear under Bookings.",
      ],
    },
  },
  airbnb: {
    id: "airbnb",
    title: "Airbnb",
    description: "Properties and Airbnb-sourced reservations from Beds24.",
    accentBorder: "border-[#FF5A5F]/25",
    accentBg: "bg-[#FF5A5F]/[0.06]",
    accentText: "text-[#C13544]",
    channelBlurb:
      "Shows all Beds24 properties plus Airbnb bookings after you connect Airbnb in Beds24 Channel Manager.",
  },
  vrbo: {
    id: "vrbo",
    title: "VRBO",
    description: "Properties and VRBO / HomeAway reservations from Beds24.",
    accentBorder: "border-[#3D5A80]/25",
    accentBg: "bg-[#3D5A80]/[0.06]",
    accentText: "text-[#3D5A80]",
    channelBlurb:
      "Shows all Beds24 properties plus VRBO bookings after the channel is connected in Beds24.",
  },
  direct: {
    id: "direct",
    title: "Direct website",
    description: "Properties and direct / website reservations from Beds24.",
    accentBorder: "border-brand-green/25",
    accentBg: "bg-brand-green/[0.06]",
    accentText: "text-brand-green",
    channelBlurb:
      "Shows all Beds24 properties plus direct, manual, or website bookings (no OTA source on the reservation).",
  },
};
