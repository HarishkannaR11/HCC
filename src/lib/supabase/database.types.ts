export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      answer_key_items: {
        Row: {
          chart_id: string;
          created_at: string;
          hcc_category_id: number | null;
          icd10_code: string;
          id: string;
          is_required: boolean;
          rationale: string | null;
          supporting_excerpt: string | null;
          trap_type: Database["public"]["Enums"]["trap_type"];
        };
        ComputedFields: never;
        Insert: {
          chart_id: string;
          created_at?: string;
          hcc_category_id?: number | null;
          icd10_code: string;
          id?: string;
          is_required?: boolean;
          rationale?: string | null;
          supporting_excerpt?: string | null;
          trap_type?: Database["public"]["Enums"]["trap_type"];
        };
        Update: {
          chart_id?: string;
          created_at?: string;
          hcc_category_id?: number | null;
          icd10_code?: string;
          id?: string;
          is_required?: boolean;
          rationale?: string | null;
          supporting_excerpt?: string | null;
          trap_type?: Database["public"]["Enums"]["trap_type"];
        };
        Relationships: [
          {
            foreignKeyName: "answer_key_items_chart_id_fkey";
            columns: ["chart_id"];
            isOneToOne: false;
            referencedRelation: "charts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answer_key_items_hcc_category_id_fkey";
            columns: ["hcc_category_id"];
            isOneToOne: false;
            referencedRelation: "hcc_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      attempt_codes: {
        Row: {
          attempt_id: string;
          icd10_code: string;
          id: string;
          supporting_excerpt: string | null;
          user_rationale: string | null;
        };
        ComputedFields: never;
        Insert: {
          attempt_id: string;
          icd10_code: string;
          id?: string;
          supporting_excerpt?: string | null;
          user_rationale?: string | null;
        };
        Update: {
          attempt_id?: string;
          icd10_code?: string;
          id?: string;
          supporting_excerpt?: string | null;
          user_rationale?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attempt_codes_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
        ];
      };
      attempt_results: {
        Row: {
          attempt_id: string;
          captured: string[];
          created_at: string;
          missed: string[];
          over_coded: string[];
          precision: number;
          raf_delta: number;
          raf_key: number;
          raf_user: number;
          recall: number;
          score_pct: number;
        };
        ComputedFields: never;
        Insert: {
          attempt_id: string;
          captured?: string[];
          created_at?: string;
          missed?: string[];
          over_coded?: string[];
          precision: number;
          raf_delta: number;
          raf_key: number;
          raf_user: number;
          recall: number;
          score_pct: number;
        };
        Update: {
          attempt_id?: string;
          captured?: string[];
          created_at?: string;
          missed?: string[];
          over_coded?: string[];
          precision?: number;
          raf_delta?: number;
          raf_key?: number;
          raf_user?: number;
          recall?: number;
          score_pct?: number;
        };
        Relationships: [
          {
            foreignKeyName: "attempt_results_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: true;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
        ];
      };
      attempts: {
        Row: {
          chart_id: string;
          duration_seconds: number | null;
          id: string;
          mode: Database["public"]["Enums"]["attempt_mode"];
          started_at: string;
          submitted_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          chart_id: string;
          duration_seconds?: number | null;
          id?: string;
          mode?: Database["public"]["Enums"]["attempt_mode"];
          started_at?: string;
          submitted_at?: string | null;
          user_id?: string;
        };
        Update: {
          chart_id?: string;
          duration_seconds?: number | null;
          id?: string;
          mode?: Database["public"]["Enums"]["attempt_mode"];
          started_at?: string;
          submitted_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_chart_id_fkey";
            columns: ["chart_id"];
            isOneToOne: false;
            referencedRelation: "charts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      chart_sections: {
        Row: {
          chart_id: string;
          content: string;
          id: string;
          section_type: Database["public"]["Enums"]["section_type"];
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          chart_id: string;
          content: string;
          id?: string;
          section_type: Database["public"]["Enums"]["section_type"];
          sort_order: number;
        };
        Update: {
          chart_id?: string;
          content?: string;
          id?: string;
          section_type?: Database["public"]["Enums"]["section_type"];
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "chart_sections_chart_id_fkey";
            columns: ["chart_id"];
            isOneToOne: false;
            referencedRelation: "charts";
            referencedColumns: ["id"];
          },
        ];
      };
      charts: {
        Row: {
          created_at: string;
          created_by: string | null;
          difficulty: number;
          encounter_date: string;
          facility_name: string;
          id: string;
          is_synthetic: boolean;
          patient_dob: string;
          patient_mrn: string;
          patient_name: string;
          patient_sex: Database["public"]["Enums"]["patient_sex"];
          payment_year: number;
          provider_name: string;
          specialty: string;
          status: Database["public"]["Enums"]["chart_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          difficulty: number;
          encounter_date: string;
          facility_name: string;
          id?: string;
          is_synthetic?: boolean;
          patient_dob: string;
          patient_mrn: string;
          patient_name: string;
          patient_sex: Database["public"]["Enums"]["patient_sex"];
          payment_year: number;
          provider_name: string;
          specialty: string;
          status?: Database["public"]["Enums"]["chart_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          difficulty?: number;
          encounter_date?: string;
          facility_name?: string;
          id?: string;
          is_synthetic?: boolean;
          patient_dob?: string;
          patient_mrn?: string;
          patient_name?: string;
          patient_sex?: Database["public"]["Enums"]["patient_sex"];
          payment_year?: number;
          provider_name?: string;
          specialty?: string;
          status?: Database["public"]["Enums"]["chart_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "charts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "charts_payment_year_fkey";
            columns: ["payment_year"];
            isOneToOne: false;
            referencedRelation: "payment_years";
            referencedColumns: ["year"];
          },
        ];
      };
      daily_activity: {
        Row: {
          activity_date: string;
          charts_completed: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          activity_date: string;
          charts_completed?: number;
          user_id: string;
        };
        Update: {
          activity_date?: string;
          charts_completed?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_activity_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      distractors: {
        Row: {
          chart_id: string;
          created_at: string;
          icd10_code: string;
          id: string;
          trap_type: Database["public"]["Enums"]["trap_type"];
          why_wrong: string;
        };
        ComputedFields: never;
        Insert: {
          chart_id: string;
          created_at?: string;
          icd10_code: string;
          id?: string;
          trap_type?: Database["public"]["Enums"]["trap_type"];
          why_wrong: string;
        };
        Update: {
          chart_id?: string;
          created_at?: string;
          icd10_code?: string;
          id?: string;
          trap_type?: Database["public"]["Enums"]["trap_type"];
          why_wrong?: string;
        };
        Relationships: [
          {
            foreignKeyName: "distractors_chart_id_fkey";
            columns: ["chart_id"];
            isOneToOne: false;
            referencedRelation: "charts";
            referencedColumns: ["id"];
          },
        ];
      };
      hcc_categories: {
        Row: {
          hcc_code: string;
          hierarchy_group: string;
          hierarchy_rank: number;
          id: number;
          label: string;
          payment_year: number;
          raf_community_nondual: number;
        };
        ComputedFields: never;
        Insert: {
          hcc_code: string;
          hierarchy_group: string;
          hierarchy_rank: number;
          id?: never;
          label: string;
          payment_year: number;
          raf_community_nondual: number;
        };
        Update: {
          hcc_code?: string;
          hierarchy_group?: string;
          hierarchy_rank?: number;
          id?: never;
          label?: string;
          payment_year?: number;
          raf_community_nondual?: number;
        };
        Relationships: [
          {
            foreignKeyName: "hcc_categories_payment_year_fkey";
            columns: ["payment_year"];
            isOneToOne: false;
            referencedRelation: "payment_years";
            referencedColumns: ["year"];
          },
        ];
      };
      hcc_hierarchy: {
        Row: {
          child_hcc_id: number;
          parent_hcc_id: number;
          payment_year: number;
        };
        ComputedFields: never;
        Insert: {
          child_hcc_id: number;
          parent_hcc_id: number;
          payment_year: number;
        };
        Update: {
          child_hcc_id?: number;
          parent_hcc_id?: number;
          payment_year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "hcc_hierarchy_payment_year_child_hcc_id_fkey";
            columns: ["payment_year", "child_hcc_id"];
            isOneToOne: false;
            referencedRelation: "hcc_categories";
            referencedColumns: ["payment_year", "id"];
          },
          {
            foreignKeyName: "hcc_hierarchy_payment_year_parent_hcc_id_fkey";
            columns: ["payment_year", "parent_hcc_id"];
            isOneToOne: false;
            referencedRelation: "hcc_categories";
            referencedColumns: ["payment_year", "id"];
          },
        ];
      };
      icd_hcc_map: {
        Row: {
          age_edit: string | null;
          hcc_category_id: number;
          icd10_code_id: number;
          mce_age_condition: string | null;
          payment_year: number;
          sex_edit: string | null;
        };
        ComputedFields: never;
        Insert: {
          age_edit?: string | null;
          hcc_category_id: number;
          icd10_code_id: number;
          mce_age_condition?: string | null;
          payment_year: number;
          sex_edit?: string | null;
        };
        Update: {
          age_edit?: string | null;
          hcc_category_id?: number;
          icd10_code_id?: number;
          mce_age_condition?: string | null;
          payment_year?: number;
          sex_edit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "icd_hcc_map_payment_year_hcc_category_id_fkey";
            columns: ["payment_year", "hcc_category_id"];
            isOneToOne: false;
            referencedRelation: "hcc_categories";
            referencedColumns: ["payment_year", "id"];
          },
          {
            foreignKeyName: "icd_hcc_map_payment_year_icd10_code_id_fkey";
            columns: ["payment_year", "icd10_code_id"];
            isOneToOne: false;
            referencedRelation: "icd10_codes";
            referencedColumns: ["payment_year", "id"];
          },
        ];
      };
      icd10_codes: {
        Row: {
          code: string;
          description: string;
          id: number;
          is_billable: boolean;
          payment_year: number;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          description: string;
          id?: never;
          is_billable: boolean;
          payment_year: number;
        };
        Update: {
          code?: string;
          description?: string;
          id?: never;
          is_billable?: boolean;
          payment_year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "icd10_codes_payment_year_fkey";
            columns: ["payment_year"];
            isOneToOne: false;
            referencedRelation: "payment_years";
            referencedColumns: ["year"];
          },
        ];
      };
      payment_years: {
        Row: {
          hcc_model_version: string;
          is_active: boolean;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          hcc_model_version: string;
          is_active?: boolean;
          year: number;
        };
        Update: {
          hcc_model_version?: string;
          is_active?: boolean;
          year?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          current_period_end: string | null;
          plan: string;
          provider: string;
          provider_customer_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          current_period_end?: string | null;
          plan: string;
          provider: string;
          provider_customer_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          current_period_end?: string | null;
          plan?: string;
          provider?: string;
          provider_customer_id?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      icd10_dotted: { Args: { raw: string }; Returns: string };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      show_limit: { Args: Record<PropertyKey, never>; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
    };
    Enums: {
      app_role: "learner" | "admin";
      attempt_mode: "practice" | "timed" | "audit";
      chart_status: "draft" | "published";
      patient_sex: "male" | "female";
      section_type:
        | "hpi"
        | "ros"
        | "physical_exam"
        | "medications"
        | "labs"
        | "assessment_plan"
        | "signature";
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "paused"
        | "cancelled"
        | "expired";
      trap_type:
        | "status_vs_history"
        | "unsupported_linkage"
        | "missing_acuity"
        | "no_treatment_documented"
        | "unspecified_when_specific_exists"
        | "signature_or_date_missing"
        | "none";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
      app_role: ["learner", "admin"],
      attempt_mode: ["practice", "timed", "audit"],
      chart_status: ["draft", "published"],
      patient_sex: ["male", "female"],
      section_type: [
        "hpi",
        "ros",
        "physical_exam",
        "medications",
        "labs",
        "assessment_plan",
        "signature",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "paused",
        "cancelled",
        "expired",
      ],
      trap_type: [
        "status_vs_history",
        "unsupported_linkage",
        "missing_acuity",
        "no_treatment_documented",
        "unspecified_when_specific_exists",
        "signature_or_date_missing",
        "none",
      ],
    },
  },
} as const;
