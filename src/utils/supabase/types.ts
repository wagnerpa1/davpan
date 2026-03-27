export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      child_profiles: {
        Row: {
          id: string;
          parent_id: string | null;
          full_name: string;
          birthdate: string;
          created_at: string | null;
          medical_notes: string | null;
          image_consent: boolean | null;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          full_name: string;
          birthdate: string;
          created_at?: string | null;
          medical_notes?: string | null;
          image_consent?: boolean | null;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          full_name?: string;
          birthdate?: string;
          created_at?: string | null;
          medical_notes?: string | null;
          image_consent?: boolean | null;
        };
      };
      documents: {
        Row: {
          id: string;
          title: string;
          file_url: string;
          category: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          file_url: string;
          category?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          file_url?: string;
          category?: string | null;
          created_at?: string | null;
        };
      };
      material_inventory: {
        Row: {
          id: string;
          material_type_id: string | null;
          size: string | null;
          quantity_total: number;
          quantity_available: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          material_type_id?: string | null;
          size?: string | null;
          quantity_total: number;
          quantity_available: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          material_type_id?: string | null;
          size?: string | null;
          quantity_total?: number;
          quantity_available?: number;
          created_at?: string | null;
        };
      };
      material_pricing: {
        Row: {
          id: string;
          material_type_id: string | null;
          price_day: number | null;
          price_extra_day: number | null;
          price_week: number | null;
        };
        Insert: {
          id?: string;
          material_type_id?: string | null;
          price_day?: number | null;
          price_extra_day?: number | null;
          price_week?: number | null;
        };
        Update: {
          id?: string;
          material_type_id?: string | null;
          price_day?: number | null;
          price_extra_day?: number | null;
          price_week?: number | null;
        };
      };
      material_reservations: {
        Row: {
          id: string;
          tour_id: string | null;
          material_inventory_id: string | null;
          user_id: string | null;
          child_profile_id: string | null;
          quantity: number | null;
          status: string | null;
          loan_date: string | null;
          return_date: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tour_id?: string | null;
          material_inventory_id?: string | null;
          user_id?: string | null;
          child_profile_id?: string | null;
          quantity?: number | null;
          status?: string | null;
          loan_date?: string | null;
          return_date?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tour_id?: string | null;
          material_inventory_id?: string | null;
          user_id?: string | null;
          child_profile_id?: string | null;
          quantity?: number | null;
          status?: string | null;
          loan_date?: string | null;
          return_date?: string | null;
          created_at?: string | null;
        };
      };
      material_types: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string | null;
          created_at?: string | null;
        };
      };
      materials: {
        Row: {
          id: string;
          name: string;
          total_quantity: number;
          size: string | null;
          price_day: number | null;
          price_extraday: number | null;
          price_week: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          total_quantity: number;
          size?: string | null;
          price_day?: number | null;
          price_extraday?: number | null;
          price_week?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          total_quantity?: number;
          size?: string | null;
          price_day?: number | null;
          price_extraday?: number | null;
          price_week?: number | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          birthdate: string | null;
          medical_notes: string | null;
          emergency_phone: string | null;
          role: "member" | "guide" | "admin" | "parent" | null;
          image_consent: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          birthdate?: string | null;
          medical_notes?: string | null;
          emergency_phone?: string | null;
          role?: "member" | "guide" | "admin" | "parent" | null;
          image_consent?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          birthdate?: string | null;
          medical_notes?: string | null;
          emergency_phone?: string | null;
          role?: "member" | "guide" | "admin" | "parent" | null;
          image_consent?: boolean | null;
          created_at?: string | null;
        };
      };
      report_images: {
        Row: {
          id: string;
          report_id: string | null;
          image_url: string;
        };
        Insert: {
          id?: string;
          report_id?: string | null;
          image_url: string;
        };
        Update: {
          id?: string;
          report_id?: string | null;
          image_url?: string;
        };
      };
      resource_bookings: {
        Row: {
          id: string;
          resource_id: string | null;
          tour_id: string | null;
          start_date: string | null;
          end_date: string | null;
          status: string | null;
          created_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          resource_id?: string | null;
          tour_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          resource_id?: string | null;
          tour_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
      };
      resources: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: string | null;
          capacity: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          type?: string | null;
          capacity?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          type?: string | null;
          capacity?: number | null;
          created_at?: string | null;
        };
      };
      tour_groups: {
        Row: {
          id: string;
          group_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_name?: string | null;
          created_at?: string;
        };
      };
      tour_guides: {
        Row: {
          id: string;
          tour_id: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          tour_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          tour_id?: string | null;
          user_id?: string | null;
        };
      };
      tour_material_requirements: {
        Row: {
          id: string;
          tour_id: string | null;
          material_type_id: string | null;
        };
        Insert: {
          id?: string;
          tour_id?: string | null;
          material_type_id?: string | null;
        };
        Update: {
          id?: string;
          tour_id?: string | null;
          material_type_id?: string | null;
        };
      };
      tour_participants: {
        Row: {
          id: string;
          tour_id: string | null;
          user_id: string | null;
          child_profile_id: string | null;
          status: "pending" | "confirmed" | "waitlist" | "cancelled" | null;
          age_override: boolean | null;
          created_at: string | null;
          waitlist_position: number | null;
        };
        Insert: {
          id?: string;
          tour_id?: string | null;
          user_id?: string | null;
          child_profile_id?: string | null;
          status?: "pending" | "confirmed" | "waitlist" | "cancelled" | null;
          age_override?: boolean | null;
          created_at?: string | null;
          waitlist_position?: number | null;
        };
        Update: {
          id?: string;
          tour_id?: string | null;
          user_id?: string | null;
          child_profile_id?: string | null;
          status?: "pending" | "confirmed" | "waitlist" | "cancelled" | null;
          age_override?: boolean | null;
          created_at?: string | null;
          waitlist_position?: number | null;
        };
      };
      tour_reports: {
        Row: {
          id: string;
          tour_id: string | null;
          title: string | null;
          report_text: string | null;
          created_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          tour_id?: string | null;
          title?: string | null;
          report_text?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          tour_id?: string | null;
          title?: string | null;
          report_text?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
      };
      tours: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string | null;
          difficulty: string | null;
          target_area: string | null;
          requirements: string | null;
          meeting_point: string | null;
          meeting_time: string | null;
          start_date: string;
          end_date: string | null;
          elevation: number | null;
          distance: number | null;
          duration_hours: number | null;
          cost_info: string | null;
          max_participants: number | null;
          status: "planning" | "open" | "full" | "completed" | null;
          created_by: string | null;
          created_at: string | null;
          min_age: number | null;
          group: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category?: string | null;
          difficulty?: string | null;
          target_area?: string | null;
          requirements?: string | null;
          meeting_point?: string | null;
          meeting_time?: string | null;
          start_date: string;
          end_date?: string | null;
          elevation?: number | null;
          distance?: number | null;
          duration_hours?: number | null;
          cost_info?: string | null;
          max_participants?: number | null;
          status?: "planning" | "open" | "full" | "completed" | null;
          created_by?: string | null;
          created_at?: string | null;
          min_age?: number | null;
          group?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          difficulty?: string | null;
          target_area?: string | null;
          requirements?: string | null;
          meeting_point?: string | null;
          meeting_time?: string | null;
          start_date?: string;
          end_date?: string | null;
          elevation?: number | null;
          distance?: number | null;
          duration_hours?: number | null;
          cost_info?: string | null;
          max_participants?: number | null;
          status?: "planning" | "open" | "full" | "completed" | null;
          created_by?: string | null;
          created_at?: string | null;
          min_age?: number | null;
          group?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
