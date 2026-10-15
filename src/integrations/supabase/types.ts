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
      activity_logs: {
        Row: {
          action: string
          business_id: string | null
          created_at: string
          entity: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          business_id?: string | null
          created_at?: string
          entity?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string | null
          created_at?: string
          entity?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      agreements: {
        Row: {
          borrower_id: string | null
          business_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          loan_id: string | null
          signed_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          borrower_id?: string | null
          business_id: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id?: string | null
          signed_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          borrower_id?: string | null
          business_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id?: string | null
          signed_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreements_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          archived_at: string | null
          audience_type: string
          category: string
          created_at: string
          created_by: string
          id: string
          message: string
          published_at: string | null
          status: string
          target_business_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          audience_type: string
          category: string
          created_at?: string
          created_by?: string
          id?: string
          message: string
          published_at?: string | null
          status?: string
          target_business_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          audience_type?: string
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          published_at?: string | null
          status?: string
          target_business_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_target_business_id_fkey"
            columns: ["target_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_recipients: {
        Row: {
          announcement_id: string
          business_id: string
          created_at: string
          read_at: string | null
        }
        Insert: {
          announcement_id: string
          business_id: string
          created_at?: string
          read_at?: string | null
        }
        Update: {
          announcement_id?: string
          business_id?: string
          created_at?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_recipients_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_recipients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      borrower_consents: {
        Row: {
          borrower_id: string
          business_id: string
          created_at: string
          granted_at: string | null
          id: string
          method: string
          network_borrower_id: string | null
          recorded_by: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["consent_status"]
          updated_at: string
        }
        Insert: {
          borrower_id: string
          business_id: string
          created_at?: string
          granted_at?: string | null
          id?: string
          method?: string
          network_borrower_id?: string | null
          recorded_by?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          updated_at?: string
        }
        Update: {
          borrower_id?: string
          business_id?: string
          created_at?: string
          granted_at?: string | null
          id?: string
          method?: string
          network_borrower_id?: string | null
          recorded_by?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrower_consents_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: true
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrower_consents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrower_consents_network_borrower_id_fkey"
            columns: ["network_borrower_id"]
            isOneToOne: false
            referencedRelation: "network_borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      borrowers: {
        Row: {
          address: string
          business_id: string
          created_at: string
          created_by: string | null
          email: string
          employment: string
          full_name: string
          home_address: string
          id: string
          id_number: string
          monthly_income: number
          network_borrower_id: string | null
          notes: string
          other_address: string
          phone: string
          updated_at: string
          work_address: string
        }
        Insert: {
          address?: string
          business_id: string
          created_at?: string
          created_by?: string | null
          email?: string
          employment?: string
          full_name: string
          home_address?: string
          id?: string
          id_number?: string
          monthly_income?: number
          network_borrower_id?: string | null
          notes?: string
          other_address?: string
          phone?: string
          updated_at?: string
          work_address?: string
        }
        Update: {
          address?: string
          business_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          employment?: string
          full_name?: string
          home_address?: string
          id?: string
          id_number?: string
          monthly_income?: number
          network_borrower_id?: string | null
          notes?: string
          other_address?: string
          phone?: string
          updated_at?: string
          work_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrowers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowers_network_borrower_id_fkey"
            columns: ["network_borrower_id"]
            isOneToOne: false
            referencedRelation: "network_borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string
          default_interest_rate: number
          id: string
          location: string
          name: string
          owner_id: string
          package: string
          reliability_network_enabled: boolean
          status: Database["public"]["Enums"]["business_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_interest_rate?: number
          id?: string
          location?: string
          name: string
          owner_id: string
          package?: string
          reliability_network_enabled?: boolean
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_interest_rate?: number
          id?: string
          location?: string
          name?: string
          owner_id?: string
          package?: string
          reliability_network_enabled?: boolean
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string
        }
        Relationships: []
      }
      capital_entries: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["capital_entry_type"]
          id: string
          note: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["capital_entry_type"]
          id?: string
          note?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["capital_entry_type"]
          id?: string
          note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_repayments: {
        Row: {
          amount_due: number
          amount_paid: number
          business_id: string
          created_at: string
          due_date: string
          id: string
          installment_number: number
          loan_id: string
          paid_date: string | null
          status: Database["public"]["Enums"]["repayment_status"]
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          business_id: string
          created_at?: string
          due_date: string
          id?: string
          installment_number?: number
          loan_id: string
          paid_date?: string | null
          status?: Database["public"]["Enums"]["repayment_status"]
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          business_id?: string
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          loan_id?: string
          paid_date?: string | null
          status?: Database["public"]["Enums"]["repayment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          borrower_id: string
          business_id: string
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          installment_amount: number
          installments_count: number
          interest_rate: number
          loan_term_months: number
          notes: string
          principal_amount: number
          repayment_frequency: Database["public"]["Enums"]["repayment_frequency"]
          start_date: string
          status: Database["public"]["Enums"]["loan_status"]
          total_interest: number
          total_repayable: number
          updated_at: string
        }
        Insert: {
          borrower_id: string
          business_id: string
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          installment_amount?: number
          installments_count?: number
          interest_rate?: number
          loan_term_months?: number
          notes?: string
          principal_amount: number
          repayment_frequency?: Database["public"]["Enums"]["repayment_frequency"]
          start_date?: string
          status?: Database["public"]["Enums"]["loan_status"]
          total_interest?: number
          total_repayable?: number
          updated_at?: string
        }
        Update: {
          borrower_id?: string
          business_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          installment_amount?: number
          installments_count?: number
          interest_rate?: number
          loan_term_months?: number
          notes?: string
          principal_amount?: number
          repayment_frequency?: Database["public"]["Enums"]["repayment_frequency"]
          start_date?: string
          status?: Database["public"]["Enums"]["loan_status"]
          total_interest?: number
          total_repayable?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      network_borrowers: {
        Row: {
          created_at: string
          id: string
          identifier_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          business_id: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string
          business_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          business_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          loan_id: string
          notes: string
          payment_date: string
          reference: string
          repayment_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id: string
          notes?: string
          payment_date?: string
          reference?: string
          repayment_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id?: string
          notes?: string
          payment_date?: string
          reference?: string
          repayment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_repayment_id_fkey"
            columns: ["repayment_id"]
            isOneToOne: false
            referencedRelation: "loan_repayments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reliability_searches: {
        Row: {
          business_id: string
          created_at: string
          id: string
          network_borrower_id: string | null
          purpose: string
          result_type: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          network_borrower_id?: string | null
          purpose?: string
          result_type?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          network_borrower_id?: string | null
          purpose?: string
          result_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reliability_searches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_searches_network_borrower_id_fkey"
            columns: ["network_borrower_id"]
            isOneToOne: false
            referencedRelation: "network_borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string
          business_id: string
          created_at: string
          id: string
          message: string
          priority: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string
          business_id: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string
          business_id?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
      admin_archive_announcement: {
        Args: { _announcement_id: string }
        Returns: undefined
      }
      admin_publish_announcement: {
        Args: { _announcement_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_business_member: {
        Args: { _business_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_business_member: { Args: { _business_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "system_admin" | "business_owner" | "staff"
      business_status:
        | "pending"
        | "approved"
        | "active"
        | "suspended"
        | "rejected"
      capital_entry_type: "initial" | "injection" | "withdrawal"
      consent_status: "pending" | "granted" | "denied" | "revoked"
      loan_status: "active" | "completed" | "defaulted" | "cancelled"
      repayment_frequency: "weekly" | "biweekly" | "monthly"
      repayment_status: "pending" | "partial" | "paid" | "overdue"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
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
      app_role: ["system_admin", "business_owner", "staff"],
      business_status: [
        "pending",
        "approved",
        "active",
        "suspended",
        "rejected",
      ],
      capital_entry_type: ["initial", "injection", "withdrawal"],
      consent_status: ["pending", "granted", "denied", "revoked"],
      loan_status: ["active", "completed", "defaulted", "cancelled"],
      repayment_frequency: ["weekly", "biweekly", "monthly"],
      repayment_status: ["pending", "partial", "paid", "overdue"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const
