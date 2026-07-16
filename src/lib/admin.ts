import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AptBookingStatus = Database["public"]["Enums"]["apt_booking_status"];
export type TaxiStatus = Database["public"]["Enums"]["taxi_status"];
export type EnquiryStatus = Database["public"]["Enums"]["enquiry_status"];

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return !!data;
}

export async function listApartmentBookings() {
  const { data, error } = await supabase
    .from("apartment_bookings")
    .select("*, apartments(name, slug)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateApartmentBookingStatus(id: string, status: AptBookingStatus) {
  const { error } = await supabase
    .from("apartment_bookings")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function listTaxiBookings() {
  const { data, error } = await supabase
    .from("taxi_bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateTaxiBookingStatus(id: string, status: TaxiStatus) {
  const { error } = await supabase.from("taxi_bookings").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function listEnquiries() {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateEnquiryStatus(id: string, status: EnquiryStatus) {
  const { error } = await supabase.from("enquiries").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function listAllApartments() {
  const { data, error } = await supabase
    .from("apartments")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateApartment(id: string, patch: Partial<{
  name: string;
  description: string | null;
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  is_active: boolean;
}>) {
  const { error } = await supabase.from("apartments").update(patch).eq("id", id);
  if (error) throw error;
}
