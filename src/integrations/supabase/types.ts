export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          college_address: string | null;
          college_name: string;
          id: boolean;
          notify_on_assignment: boolean;
          notify_on_critical: boolean;
          notify_on_new_complaint: boolean;
          support_email: string | null;
          theme: string;
          updated_at: string;
        };
        Insert: {
          college_address?: string | null;
          college_name?: string;
          id?: boolean;
          notify_on_assignment?: boolean;
          notify_on_critical?: boolean;
          notify_on_new_complaint?: boolean;
          support_email?: string | null;
          theme?: string;
          updated_at?: string;
        };
        Update: {
          college_address?: string | null;
          college_name?: string;
          id?: boolean;
          notify_on_assignment?: boolean;
          notify_on_critical?: boolean;
          notify_on_new_complaint?: boolean;
          support_email?: string | null;
          theme?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          after_image_url: string | null;
          assigned_date: string;
          before_image_url: string | null;
          complaint_id: string;
          expected_completion_date: string | null;
          id: string;
          notes: string | null;
          priority: Database["public"]["Enums"]["complaint_priority"] | null;
          resolution_image_url: string | null;
          staff_id: string;
        };
        Insert: {
          after_image_url?: string | null;
          assigned_date?: string;
          before_image_url?: string | null;
          complaint_id: string;
          expected_completion_date?: string | null;
          id?: string;
          notes?: string | null;
          priority?: Database["public"]["Enums"]["complaint_priority"] | null;
          resolution_image_url?: string | null;
          staff_id: string;
        };
        Update: {
          after_image_url?: string | null;
          assigned_date?: string;
          before_image_url?: string | null;
          complaint_id?: string;
          expected_completion_date?: string | null;
          id?: string;
          notes?: string | null;
          priority?: Database["public"]["Enums"]["complaint_priority"] | null;
          resolution_image_url?: string | null;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      complaint_followers: {
        Row: {
          complaint_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          complaint_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          complaint_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complaint_followers_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      complaint_notes: {
        Row: {
          author_id: string;
          complaint_id: string;
          created_at: string;
          id: string;
          note: string;
        };
        Insert: {
          author_id: string;
          complaint_id: string;
          created_at?: string;
          id?: string;
          note: string;
        };
        Update: {
          author_id?: string;
          complaint_id?: string;
          created_at?: string;
          id?: string;
          note?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complaint_notes_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      complaint_status_history: {
        Row: {
          changed_by: string | null;
          complaint_id: string;
          created_at: string;
          from_status: Database["public"]["Enums"]["complaint_status"] | null;
          id: string;
          note: string | null;
          to_status: Database["public"]["Enums"]["complaint_status"];
        };
        Insert: {
          changed_by?: string | null;
          complaint_id: string;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["complaint_status"] | null;
          id?: string;
          note?: string | null;
          to_status: Database["public"]["Enums"]["complaint_status"];
        };
        Update: {
          changed_by?: string | null;
          complaint_id?: string;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["complaint_status"] | null;
          id?: string;
          note?: string | null;
          to_status?: Database["public"]["Enums"]["complaint_status"];
        };
        Relationships: [
          {
            foreignKeyName: "complaint_status_history_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      complaints: {
        Row: {
          ai_confidence: number | null;
          ai_reason: string | null;
          ai_suggested_priority: Database["public"]["Enums"]["complaint_priority"] | null;
          building: string | null;
          category: Database["public"]["Enums"]["complaint_category"];
          created_at: string;
          description: string;
          id: string;
          image_url: string | null;
          latitude: number | null;
          longitude: number | null;
          priority: Database["public"]["Enums"]["complaint_priority"];
          room_number: string | null;
          status: Database["public"]["Enums"]["complaint_status"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ai_confidence?: number | null;
          ai_reason?: string | null;
          ai_suggested_priority?: Database["public"]["Enums"]["complaint_priority"] | null;
          building?: string | null;
          category: Database["public"]["Enums"]["complaint_category"];
          created_at?: string;
          description: string;
          id?: string;
          image_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          priority?: Database["public"]["Enums"]["complaint_priority"];
          room_number?: string | null;
          status?: Database["public"]["Enums"]["complaint_status"];
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_confidence?: number | null;
          ai_reason?: string | null;
          ai_suggested_priority?: Database["public"]["Enums"]["complaint_priority"] | null;
          building?: string | null;
          category?: Database["public"]["Enums"]["complaint_category"];
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          priority?: Database["public"]["Enums"]["complaint_priority"];
          room_number?: string | null;
          status?: Database["public"]["Enums"]["complaint_status"];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          read: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          read?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          read?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          last_sign_in_at: string | null;
          name: string;
          phone: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string;
          id: string;
          last_sign_in_at?: string | null;
          name?: string;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          last_sign_in_at?: string | null;
          name?: string;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "student" | "admin" | "staff";
      complaint_category:
        | "electrical"
        | "projector"
        | "fan"
        | "water_leakage"
        | "furniture"
        | "internet"
        | "cleanliness"
        | "other"
        | "washroom";
      complaint_priority: "low" | "medium" | "high" | "critical";
      complaint_status: "pending" | "assigned" | "in_progress" | "resolved" | "closed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "admin", "staff"],
      complaint_category: [
        "electrical",
        "projector",
        "fan",
        "water_leakage",
        "furniture",
        "internet",
        "cleanliness",
        "other",
        "washroom",
      ],
      complaint_priority: ["low", "medium", "high", "critical"],
      complaint_status: ["pending", "assigned", "in_progress", "resolved", "closed"],
    },
  },
} as const;
