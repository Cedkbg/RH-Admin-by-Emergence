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
      announcements: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          pinned: boolean
          title: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          pinned?: boolean
          title: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      appointments: {
        Row: {
          attendees: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          for_who: string | null
          id: string
          location: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          for_who?: string | null
          id?: string
          location?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          for_who?: string | null
          id?: string
          location?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assistant_records: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          related_direction: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_direction?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_direction?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          status: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          status?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          applied_at: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          job_offer_id: string | null
          last_name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          job_offer_id?: string | null
          last_name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          job_offer_id?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_offer_id_fkey"
            columns: ["job_offer_id"]
            isOneToOne: false
            referencedRelation: "job_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          organization: string | null
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          direction_id: string
          id: string
          manager_name: string | null
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          direction_id: string
          id?: string
          manager_name?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          direction_id?: string
          id?: string
          manager_name?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_direction_id_fkey"
            columns: ["direction_id"]
            isOneToOne: false
            referencedRelation: "directions"
            referencedColumns: ["id"]
          },
        ]
      }
      directions: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          manager_name: string | null
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manager_name?: string | null
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manager_name?: string | null
          name?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string | null
          created_at: string
          employee_id: string | null
          file_url: string | null
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          employee_id?: string | null
          file_url?: string | null
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          employee_id?: string | null
          file_url?: string | null
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          base_salary: number | null
          birth_date: string | null
          contract_type: string | null
          created_at: string
          department_id: string | null
          direction_id: string | null
          email: string | null
          first_name: string
          gender: string | null
          hire_date: string | null
          id: string
          last_name: string
          manager_id: string | null
          matricule: string | null
          phone: string | null
          position: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          base_salary?: number | null
          birth_date?: string | null
          contract_type?: string | null
          created_at?: string
          department_id?: string | null
          direction_id?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          last_name: string
          manager_id?: string | null
          matricule?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          base_salary?: number | null
          birth_date?: string | null
          contract_type?: string | null
          created_at?: string
          department_id?: string | null
          direction_id?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          last_name?: string
          manager_id?: string | null
          matricule?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_direction_id_fkey"
            columns: ["direction_id"]
            isOneToOne: false
            referencedRelation: "directions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_offers: {
        Row: {
          closing_date: string | null
          contract_type: string | null
          created_at: string
          description: string | null
          direction_id: string | null
          id: string
          location: string | null
          posted_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          closing_date?: string | null
          contract_type?: string | null
          created_at?: string
          description?: string | null
          direction_id?: string | null
          id?: string
          location?: string | null
          posted_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          closing_date?: string | null
          contract_type?: string | null
          created_at?: string
          description?: string | null
          direction_id?: string | null
          id?: string
          location?: string | null
          posted_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_offers_direction_id_fkey"
            columns: ["direction_id"]
            isOneToOne: false
            referencedRelation: "directions"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_records: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mail_register: {
        Row: {
          created_at: string
          created_by: string | null
          direction: string
          id: string
          mail_date: string
          notes: string | null
          recipient: string | null
          reference: string | null
          sender: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          mail_date?: string
          notes?: string | null
          recipient?: string | null
          reference?: string | null
          sender?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          mail_date?: string
          notes?: string | null
          recipient?: string | null
          reference?: string | null
          sender?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      meeting_minutes: {
        Row: {
          agenda: string | null
          attendees: string | null
          created_at: string
          created_by: string | null
          decisions: string | null
          id: string
          meeting_date: string
          next_steps: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          attendees?: string | null
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          id?: string
          meeting_date?: string
          next_steps?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          attendees?: string | null
          created_at?: string
          created_by?: string | null
          decisions?: string | null
          id?: string
          meeting_date?: string
          next_steps?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll: {
        Row: {
          base_salary: number
          bonus: number
          created_at: string
          deductions: number
          employee_id: string
          id: string
          net_pay: number | null
          paid_at: string | null
          period: string
          status: string
          updated_at: string
        }
        Insert: {
          base_salary?: number
          bonus?: number
          created_at?: string
          deductions?: number
          employee_id: string
          id?: string
          net_pay?: number | null
          paid_at?: string | null
          period: string
          status?: string
          updated_at?: string
        }
        Update: {
          base_salary?: number
          bonus?: number
          created_at?: string
          deductions?: number
          employee_id?: string
          id?: string
          net_pay?: number | null
          paid_at?: string | null
          period?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          comments: string | null
          created_at: string
          employee_id: string
          id: string
          period: string
          reviewed_at: string | null
          score: number | null
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          employee_id: string
          id?: string
          period: string
          reviewed_at?: string | null
          score?: number | null
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          period?: string
          reviewed_at?: string | null
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          approval_status?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      talents: {
        Row: {
          career_plan: string | null
          created_at: string
          employee_id: string
          id: string
          potential: string
          skills: string | null
          updated_at: string
        }
        Insert: {
          career_plan?: string | null
          created_at?: string
          employee_id: string
          id?: string
          potential?: string
          skills?: string | null
          updated_at?: string
        }
        Update: {
          career_plan?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          potential?: string
          skills?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: string
          title: string
          trainer: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string
          title: string
          trainer?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string
          title?: string
          trainer?: string | null
          updated_at?: string
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
      wellbeing_surveys: {
        Row: {
          comments: string | null
          created_at: string
          employee_id: string | null
          id: string
          mood_score: number | null
          submitted_at: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          mood_score?: number | null
          submitted_at?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          mood_score?: number | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wellbeing_surveys_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_secretary_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "employee" | "secretaire"
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
      app_role: ["admin", "employee", "secretaire"],
    },
  },
} as const
