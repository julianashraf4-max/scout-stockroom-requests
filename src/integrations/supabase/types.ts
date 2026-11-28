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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      administrative_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          note: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          product_id: string
          quantity: number
          user_id?: string
        }
        Update: {
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_shifts: {
        Row: {
          created_at: string
          duty_date: string
          end_time: string | null
          id: string
          leader_id: string
          notes: string | null
          start_time: string | null
        }
        Insert: {
          created_at?: string
          duty_date: string
          end_time?: string | null
          id?: string
          leader_id: string
          notes?: string | null
          start_time?: string | null
        }
        Update: {
          created_at?: string
          duty_date?: string
          end_time?: string | null
          id?: string
          leader_id?: string
          notes?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duty_shifts_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "leaders"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          max_uses: number
          role: Database["public"]["Enums"]["app_role"]
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          max_uses?: number
          role?: Database["public"]["Enums"]["app_role"]
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          max_uses?: number
          role?: Database["public"]["Enums"]["app_role"]
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invitation_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaders: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_current: boolean
          name: string
          phone: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_current?: boolean
          name: string
          phone?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_current?: boolean
          name?: string
          phone?: string | null
          title?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          stock?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      purchase_order_lines: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          note: string | null
          status: string
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          status?: string
          total?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          status?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          borrower_name: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          due_at: string | null
          id: string
          item_id: string
          note: string | null
          picked_up_at: string | null
          pickup_at: string | null
          pickup_date: string | null
          pickup_note: string | null
          quantity: number
          return_date: string | null
          return_note: string | null
          returned_at: string | null
          source: string
          status: string
          user_id: string
        }
        Insert: {
          borrower_name?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          due_at?: string | null
          id?: string
          item_id: string
          note?: string | null
          picked_up_at?: string | null
          pickup_at?: string | null
          pickup_date?: string | null
          pickup_note?: string | null
          quantity: number
          return_date?: string | null
          return_note?: string | null
          returned_at?: string | null
          source?: string
          status?: string
          user_id?: string
        }
        Update: {
          borrower_name?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          due_at?: string | null
          id?: string
          item_id?: string
          note?: string | null
          picked_up_at?: string | null
          pickup_at?: string | null
          pickup_date?: string | null
          pickup_note?: string | null
          quantity?: number
          return_date?: string | null
          return_note?: string | null
          returned_at?: string | null
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_events: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          note: string | null
          request_id: string
        }
        Insert: {
          action: string
          actor_id?: string
          created_at?: string
          id?: string
          note?: string | null
          request_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          note?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: number
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      adjust_equipment: {
        Args: { _delta: number; _item: string }
        Returns: undefined
      }
      advance_request: {
        Args: { _action: string; _note?: string; _request_id: string }
        Returns: undefined
      }
      booking_available: {
        Args: { _end: string; _exclude?: string; _item: string; _start: string }
        Returns: number
      }
      checkout_cart: { Args: { _note?: string }; Returns: string }
      create_invite_code: { Args: { _max_uses?: number }; Returns: string }
      create_role_invite_code: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: string
      }
      decide_order: {
        Args: { _complete: boolean; _order_id: string }
        Returns: undefined
      }
      decide_purchase: {
        Args: { _complete: boolean; _note?: string; _order: string }
        Returns: undefined
      }
      decide_request: {
        Args: { _approve: boolean; _request_id: string }
        Returns: undefined
      }
      get_public_counts: {
        Args: never
        Returns: {
          items_count: number
          products_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      issue_external: {
        Args: {
          _borrower: string
          _due: string
          _item: string
          _note: string
          _quantity: number
        }
        Returns: string
      }
      product_available: { Args: { _product: string }; Returns: number }
      shared_booking_schedule: {
        Args: never
        Returns: {
          due_at: string
          id: string
          item_name: string
          pickup_at: string
          quantity: number
          source: string
          status: string
        }[]
      }
      shop_availability: {
        Args: never
        Returns: {
          available: number
          product_id: string
        }[]
      }
      validate_invite_code: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "keeper" | "member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "keeper", "member"],
    },
  },
} as const
