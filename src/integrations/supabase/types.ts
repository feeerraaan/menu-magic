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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_copilot_actions: {
        Row: {
          affected_rows: Json
          confirmed_by: string | null
          conversation_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          message_id: string | null
          preview_payload: Json
          raw_llm_tool_input: Json
          resolved_params: Json
          restaurant_id: string
          status: string
          tool_name: string
          updated_at: string
          user_id: string | null
          user_request_text: string | null
        }
        Insert: {
          affected_rows?: Json
          confirmed_by?: string | null
          conversation_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message_id?: string | null
          preview_payload?: Json
          raw_llm_tool_input?: Json
          resolved_params?: Json
          restaurant_id: string
          status?: string
          tool_name: string
          updated_at?: string
          user_id?: string | null
          user_request_text?: string | null
        }
        Update: {
          affected_rows?: Json
          confirmed_by?: string | null
          conversation_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message_id?: string | null
          preview_payload?: Json
          raw_llm_tool_input?: Json
          resolved_params?: Json
          restaurant_id?: string
          status?: string
          tool_name?: string
          updated_at?: string
          user_id?: string | null
          user_request_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_copilot_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_copilot_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_copilot_actions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_copilot_conversations: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_copilot_conversations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_copilot_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_copilot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_copilot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generated_content: {
        Row: {
          ai_job_id: string | null
          content: string
          content_type: Database["public"]["Enums"]["ai_content_type"]
          created_at: string
          id: string
          language: string | null
          restaurant_id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["ai_content_status"]
          style: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["ai_content_target"]
        }
        Insert: {
          ai_job_id?: string | null
          content: string
          content_type: Database["public"]["Enums"]["ai_content_type"]
          created_at?: string
          id?: string
          language?: string | null
          restaurant_id: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["ai_content_status"]
          style?: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["ai_content_target"]
        }
        Update: {
          ai_job_id?: string | null
          content?: string
          content_type?: Database["public"]["Enums"]["ai_content_type"]
          created_at?: string
          id?: string
          language?: string | null
          restaurant_id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["ai_content_status"]
          style?: string | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["ai_content_target"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_content_ai_job_id_fkey"
            columns: ["ai_job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_content_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_jobs: {
        Row: {
          ai_credits_charged: number
          completed_at: string | null
          created_at: string
          created_by: string
          error: string | null
          id: string
          input: Json
          job_type: Database["public"]["Enums"]["ai_job_type"]
          output: Json | null
          progress: number
          restaurant_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["ai_job_status"]
          updated_at: string
        }
        Insert: {
          ai_credits_charged?: number
          completed_at?: string | null
          created_at?: string
          created_by: string
          error?: string | null
          id?: string
          input?: Json
          job_type: Database["public"]["Enums"]["ai_job_type"]
          output?: Json | null
          progress?: number
          restaurant_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          updated_at?: string
        }
        Update: {
          ai_credits_charged?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error?: string | null
          id?: string
          input?: Json
          job_type?: Database["public"]["Enums"]["ai_job_type"]
          output?: Json | null
          progress?: number
          restaurant_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_menu_scores: {
        Row: {
          ai_job_id: string | null
          breakdown: Json
          created_at: string
          id: string
          restaurant_id: string
          score: number
        }
        Insert: {
          ai_job_id?: string | null
          breakdown?: Json
          created_at?: string
          id?: string
          restaurant_id: string
          score: number
        }
        Update: {
          ai_job_id?: string | null
          breakdown?: Json
          created_at?: string
          id?: string
          restaurant_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_menu_scores_ai_job_id_fkey"
            columns: ["ai_job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_menu_scores_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          ai_job_id: string | null
          category: string
          created_at: string
          detail: string | null
          id: string
          restaurant_id: string
          status: string
          target_id: string | null
          target_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_job_id?: string | null
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          restaurant_id: string
          status?: string
          target_id?: string | null
          target_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_job_id?: string | null
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          restaurant_id?: string
          status?: string
          target_id?: string | null
          target_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_ai_job_id_fkey"
            columns: ["ai_job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          ai_job_id: string | null
          created_at: string
          credits_charged: number
          id: string
          kind: Database["public"]["Enums"]["ai_usage_kind"]
          metadata: Json
          restaurant_id: string
        }
        Insert: {
          ai_job_id?: string | null
          created_at?: string
          credits_charged?: number
          id?: string
          kind: Database["public"]["Enums"]["ai_usage_kind"]
          metadata?: Json
          restaurant_id: string
        }
        Update: {
          ai_job_id?: string | null
          created_at?: string
          credits_charged?: number
          id?: string
          kind?: Database["public"]["Enums"]["ai_usage_kind"]
          metadata?: Json
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_ai_job_id_fkey"
            columns: ["ai_job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      anon_chat_events: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
          restaurant_id: string
          session_token: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
          restaurant_id: string
          session_token: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
          restaurant_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "anon_chat_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          menu_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          menu_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          menu_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      category_translations: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          generated_by: Database["public"]["Enums"]["content_origin"]
          id: string
          language: string
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          generated_by?: Database["public"]["Enums"]["content_origin"]
          id?: string
          language: string
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          generated_by?: Database["public"]["Enums"]["content_origin"]
          id?: string
          language?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
        }
        Relationships: []
      }
      item_translations: {
        Row: {
          created_at: string
          description: string | null
          generated_by: Database["public"]["Enums"]["content_origin"]
          id: string
          item_id: string
          language: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          generated_by?: Database["public"]["Enums"]["content_origin"]
          id?: string
          item_id: string
          language: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          generated_by?: Database["public"]["Enums"]["content_origin"]
          id?: string
          item_id?: string
          language?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_translations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          allergens: string[] | null
          category_id: string
          created_at: string
          description: string | null
          description_generated_by: Database["public"]["Enums"]["content_origin"]
          display_order: number
          id: string
          is_active: boolean
          is_featured: boolean
          is_gluten_free: boolean
          is_spicy: boolean
          is_vegan: boolean
          is_vegetarian: boolean
          name: string
          photo_url: string | null
          price: number | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          category_id: string
          created_at?: string
          description?: string | null
          description_generated_by?: Database["public"]["Enums"]["content_origin"]
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_gluten_free?: boolean
          is_spicy?: boolean
          is_vegan?: boolean
          is_vegetarian?: boolean
          name: string
          photo_url?: string | null
          price?: number | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          category_id?: string
          created_at?: string
          description?: string | null
          description_generated_by?: Database["public"]["Enums"]["content_origin"]
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_gluten_free?: boolean
          is_spicy?: boolean
          is_vegan?: boolean
          is_vegetarian?: boolean
          name?: string
          photo_url?: string | null
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_views: {
        Row: {
          id: string
          item_id: string | null
          language: string | null
          restaurant_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          item_id?: string | null
          language?: string | null
          restaurant_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          item_id?: string | null
          language?: string | null
          restaurant_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_views_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_views_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
          schedule_rules: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
          schedule_rules?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
          schedule_rules?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          custom_domain: string | null
          default_language: string
          hide_prices: boolean
          id: string
          instagram_url: string | null
          is_published: boolean
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          owner_id: string
          phone: string | null
          slug: string
          supported_languages: string[]
          template: string
          theme: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          custom_domain?: string | null
          default_language?: string
          hide_prices?: boolean
          id?: string
          instagram_url?: string | null
          is_published?: boolean
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean
          owner_id: string
          phone?: string | null
          slug: string
          supported_languages?: string[]
          template?: string
          theme?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          custom_domain?: string | null
          default_language?: string
          hide_prices?: boolean
          id?: string
          instagram_url?: string | null
          is_published?: boolean
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean
          owner_id?: string
          phone?: string | null
          slug?: string
          supported_languages?: string[]
          template?: string
          theme?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          event_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_lifetime: boolean
          languages_limit: number
          manual_override: boolean
          photos_limit: number
          plan: Database["public"]["Enums"]["plan_type"]
          restaurant_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_lifetime?: boolean
          languages_limit?: number
          manual_override?: boolean
          photos_limit?: number
          plan?: Database["public"]["Enums"]["plan_type"]
          restaurant_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_lifetime?: boolean
          languages_limit?: number
          manual_override?: boolean
          photos_limit?: number
          plan?: Database["public"]["Enums"]["plan_type"]
          restaurant_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      admin_create_menu: {
        Args: { _is_active: boolean; _name: string; _restaurant_id: string }
        Returns: string
      }
      admin_delete_contact_message: {
        Args: { _message_id: string }
        Returns: boolean
      }
      admin_delete_menu: { Args: { _menu_id: string }; Returns: boolean }
      admin_get_menu_details: { Args: { _menu_id: string }; Returns: Json }
      admin_get_restaurant: { Args: { _restaurant_id: string }; Returns: Json }
      admin_list_contact_messages: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
        }[]
      }
      admin_list_menus: {
        Args: { _restaurant_id: string }
        Returns: {
          category_count: number
          description: string
          display_order: number
          is_active: boolean
          item_count: number
          menu_id: string
          name: string
          schedule_rules: Json
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          email: string
          is_published: boolean
          languages_limit: number
          manual_override: boolean
          photos_limit: number
          plan: string
          restaurant_id: string
          restaurant_name: string
          slug: string
          stripe_subscription_id: string
          subscription_status: string
          user_created_at: string
          user_id: string
        }[]
      }
      admin_toggle_contact_message_read: {
        Args: { _is_read: boolean; _message_id: string }
        Returns: boolean
      }
      admin_update_menu: {
        Args: {
          _description: string
          _is_active: boolean
          _menu_id: string
          _name: string
        }
        Returns: boolean
      }
      admin_update_restaurant: {
        Args: { _is_published: boolean; _name: string; _restaurant_id: string }
        Returns: boolean
      }
      admin_update_restaurant_config: {
        Args: {
          _address: string
          _currency: string
          _default_language: string
          _hide_prices: boolean
          _is_published: boolean
          _logo_url: string
          _name: string
          _phone: string
          _restaurant_id: string
          _supported_languages: string[]
          _theme: string
        }
        Returns: boolean
      }
      admin_update_subscription: {
        Args: {
          _languages_limit: number
          _photos_limit: number
          _plan: string
          _restaurant_id: string
        }
        Returns: boolean
      }
      generate_unique_slug: { Args: { base_name: string }; Returns: string }
      get_ai_credits_used_this_period: {
        Args: { _restaurant_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ai_content_status: "pending" | "accepted" | "rejected"
      ai_content_target: "item" | "category"
      ai_content_type: "description" | "translation"
      ai_job_status:
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "canceled"
      ai_job_type:
        | "menu_optimizer_run"
        | "menu_import"
        | "ai_setup"
        | "business_insights"
      ai_usage_kind:
        | "description"
        | "translation"
        | "optimizer_run"
        | "import"
        | "copilot"
        | "insights"
      app_role: "admin" | "owner" | "user"
      content_origin: "human" | "ai_generated" | "ai_edited"
      plan_type: "free" | "pro_monthly" | "pro_annual" | "lifetime"
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "trialing"
        | "incomplete"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_content_status: ["pending", "accepted", "rejected"],
      ai_content_target: ["item", "category"],
      ai_content_type: ["description", "translation"],
      ai_job_status: [
        "queued",
        "processing",
        "completed",
        "failed",
        "canceled",
      ],
      ai_job_type: [
        "menu_optimizer_run",
        "menu_import",
        "ai_setup",
        "business_insights",
      ],
      ai_usage_kind: [
        "description",
        "translation",
        "optimizer_run",
        "import",
        "copilot",
        "insights",
      ],
      app_role: ["admin", "owner", "user"],
      content_origin: ["human", "ai_generated", "ai_edited"],
      plan_type: ["free", "pro_monthly", "pro_annual", "lifetime"],
      subscription_status: [
        "active",
        "canceled",
        "past_due",
        "trialing",
        "incomplete",
      ],
    },
  },
} as const
