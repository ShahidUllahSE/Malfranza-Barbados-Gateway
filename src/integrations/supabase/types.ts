export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      apartment_bookings: {
        Row: {
          apartment_id: string
          booking_reference: string
          check_in: string
          check_out: string
          created_at: string
          guest_email: string
          guest_name: string
          guest_phone: string
          guests: number
          id: string
          nights: number
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          service_fee: number | null
          special_requests: string | null
          status: Database["public"]["Enums"]["apt_booking_status"]
          stay_subtotal: number | null
          taxi_addon: boolean
          taxi_date: string | null
          taxi_distance_km: number | null
          taxi_dropoff: string | null
          taxi_fare: number
          taxi_notes: string | null
          taxi_passengers: number | null
          taxi_pickup: string | null
          taxi_time: string | null
          total_amount: number
        }
        Insert: {
          apartment_id: string
          booking_reference?: string
          check_in: string
          check_out: string
          created_at?: string
          guest_email: string
          guest_name: string
          guest_phone: string
          guests?: number
          id?: string
          nights: number
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          service_fee?: number | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["apt_booking_status"]
          stay_subtotal?: number | null
          taxi_addon?: boolean
          taxi_date?: string | null
          taxi_distance_km?: number | null
          taxi_dropoff?: string | null
          taxi_fare?: number
          taxi_notes?: string | null
          taxi_passengers?: number | null
          taxi_pickup?: string | null
          taxi_time?: string | null
          total_amount: number
        }
        Update: {
          apartment_id?: string
          booking_reference?: string
          check_in?: string
          check_out?: string
          created_at?: string
          guest_email?: string
          guest_name?: string
          guest_phone?: string
          guests?: number
          id?: string
          nights?: number
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          service_fee?: number | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["apt_booking_status"]
          stay_subtotal?: number | null
          taxi_addon?: boolean
          taxi_date?: string | null
          taxi_distance_km?: number | null
          taxi_dropoff?: string | null
          taxi_fare?: number
          taxi_notes?: string | null
          taxi_passengers?: number | null
          taxi_pickup?: string | null
          taxi_time?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "apartment_bookings_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
        ]
      }
      apartments: {
        Row: {
          amenities: string[]
          bathrooms: number
          bedrooms: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_guests: number
          name: string
          photos: string[]
          price_per_night: number
          size_sqm: number | null
          slug: string
          subtitle: string | null
        }
        Insert: {
          amenities?: string[]
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_guests?: number
          name: string
          photos?: string[]
          price_per_night: number
          size_sqm?: number | null
          slug: string
          subtitle?: string | null
        }
        Update: {
          amenities?: string[]
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_guests?: number
          name?: string
          photos?: string[]
          price_per_night?: number
          size_sqm?: number | null
          slug?: string
          subtitle?: string | null
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          interested_in: string
          message: string
          name: string
          phone: string | null
          preferred_dates: string | null
          reference: string
          status: Database["public"]["Enums"]["enquiry_status"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          interested_in: string
          message: string
          name: string
          phone?: string | null
          preferred_dates?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["enquiry_status"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          interested_in?: string
          message?: string
          name?: string
          phone?: string | null
          preferred_dates?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["enquiry_status"]
        }
        Relationships: []
      }
      taxi_bookings: {
        Row: {
          booking_reference: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          dropoff_location: string
          estimated_fare: number | null
          id: string
          notes: string | null
          passengers: number
          pickup_date: string
          pickup_location: string
          pickup_time: string
          service_type: string
          status: Database["public"]["Enums"]["taxi_status"]
        }
        Insert: {
          booking_reference?: string
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          dropoff_location: string
          estimated_fare?: number | null
          id?: string
          notes?: string | null
          passengers?: number
          pickup_date: string
          pickup_location: string
          pickup_time: string
          service_type: string
          status?: Database["public"]["Enums"]["taxi_status"]
        }
        Update: {
          booking_reference?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          dropoff_location?: string
          estimated_fare?: number | null
          id?: string
          notes?: string | null
          passengers?: number
          pickup_date?: string
          pickup_location?: string
          pickup_time?: string
          service_type?: string
          status?: Database["public"]["Enums"]["taxi_status"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_apartment_availability: {
        Args: { _apartment_id: string; _check_in: string; _check_out: string }
        Returns: boolean
      }
      create_public_apartment_booking: {
        Args: { payload: Json }
        Returns: string
      }
      create_public_taxi_booking: { Args: { payload: Json }; Returns: string }
      generate_booking_reference: { Args: never; Returns: string }
      get_public_booking: {
        Args: { _reference: string }
        Returns: {
          apartment_name: string
          booking_reference: string
          check_in: string
          check_out: string
          created_at: string
          guests: number
          nights: number
          status: string
          taxi_addon: boolean
          taxi_date: string
          taxi_dropoff: string
          taxi_pickup: string
          taxi_time: string
          total_amount: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
      apt_booking_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
      enquiry_status: "new" | "responded" | "closed"
      payment_status: "unpaid" | "paid" | "refunded"
      taxi_status: "pending" | "confirmed" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
      apt_booking_status: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
      ],
      enquiry_status: ["new", "responded", "closed"],
      payment_status: ["unpaid", "paid", "refunded"],
      taxi_status: ["pending", "confirmed", "completed", "cancelled"],
    },
  },
} as const
