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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ad_platforms: {
        Row: {
          access_token: string | null
          ad_account_id: string | null
          business_id: string | null
          created_at: string | null
          credentials: Json | null
          id: string
          is_active: boolean | null
          pixel_id: string | null
          platform: string
          refresh_token: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          ad_account_id?: string | null
          business_id?: string | null
          created_at?: string | null
          credentials?: Json | null
          id?: string
          is_active?: boolean | null
          pixel_id?: string | null
          platform: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          ad_account_id?: string | null
          business_id?: string | null
          created_at?: string | null
          credentials?: Json | null
          id?: string
          is_active?: boolean | null
          pixel_id?: string | null
          platform?: string
          refresh_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      addresses: {
        Row: {
          address1: string
          address2: string | null
          city: string
          company: string | null
          country: string
          created_at: string | null
          first_name: string
          id: string
          is_default: boolean | null
          last_name: string
          phone: string | null
          postal_code: string
          province: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          address1: string
          address2?: string | null
          city: string
          company?: string | null
          country: string
          created_at?: string | null
          first_name: string
          id?: string
          is_default?: boolean | null
          last_name: string
          phone?: string | null
          postal_code: string
          province: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          address1?: string
          address2?: string | null
          city?: string
          company?: string | null
          country?: string
          created_at?: string | null
          first_name?: string
          id?: string
          is_default?: boolean | null
          last_name?: string
          phone?: string | null
          postal_code?: string
          province?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          order_id: string | null
          payment_method: string
          payment_status: string | null
          transaction_id: string | null
          verified_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string
          payment_status?: string | null
          transaction_id?: string | null
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string
          payment_status?: string | null
          transaction_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_ad_campaigns: {
        Row: {
          ad_creative: Json | null
          ai_insights: Json | null
          budget_daily: number | null
          budget_total: number | null
          campaign_id: string | null
          campaign_name: string
          created_at: string | null
          created_by_ai: boolean | null
          id: string
          objective: string
          performance_metrics: Json | null
          platform: string
          status: string | null
          target_audience: Json | null
          updated_at: string | null
        }
        Insert: {
          ad_creative?: Json | null
          ai_insights?: Json | null
          budget_daily?: number | null
          budget_total?: number | null
          campaign_id?: string | null
          campaign_name: string
          created_at?: string | null
          created_by_ai?: boolean | null
          id?: string
          objective: string
          performance_metrics?: Json | null
          platform: string
          status?: string | null
          target_audience?: Json | null
          updated_at?: string | null
        }
        Update: {
          ad_creative?: Json | null
          ai_insights?: Json | null
          budget_daily?: number | null
          budget_total?: number | null
          campaign_id?: string | null
          campaign_name?: string
          created_at?: string | null
          created_by_ai?: boolean | null
          id?: string
          objective?: string
          performance_metrics?: Json | null
          platform?: string
          status?: string | null
          target_audience?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_audience_insights: {
        Row: {
          ai_recommendations: Json | null
          audience_data: Json
          avg_order_value: number | null
          conversion_rate: number | null
          created_at: string | null
          id: string
          insight_type: string
          last_analyzed_at: string | null
          products_interested: Json | null
        }
        Insert: {
          ai_recommendations?: Json | null
          audience_data: Json
          avg_order_value?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          insight_type: string
          last_analyzed_at?: string | null
          products_interested?: Json | null
        }
        Update: {
          ai_recommendations?: Json | null
          audience_data?: Json
          avg_order_value?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          insight_type?: string
          last_analyzed_at?: string | null
          products_interested?: Json | null
        }
        Relationships: []
      }
      ai_optimization_logs: {
        Row: {
          actual_impact: Json | null
          campaign_id: string | null
          changes_made: Json
          created_at: string | null
          expected_impact: string | null
          id: string
          optimization_type: string
          reasoning: string | null
        }
        Insert: {
          actual_impact?: Json | null
          campaign_id?: string | null
          changes_made: Json
          created_at?: string | null
          expected_impact?: string | null
          id?: string
          optimization_type: string
          reasoning?: string | null
        }
        Update: {
          actual_impact?: Json | null
          campaign_id?: string | null
          changes_made?: Json
          created_at?: string | null
          expected_impact?: string | null
          id?: string
          optimization_type?: string
          reasoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_optimization_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ai_ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          created_at: string
          gemini_api_key: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gemini_api_key?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gemini_api_key?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      binance_config: {
        Row: {
          admin_whatsapp: string | null
          api_key: string
          api_secret: string
          binance_pay_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          merchant_name: string | null
          updated_at: string | null
          verification_mode: string | null
        }
        Insert: {
          admin_whatsapp?: string | null
          api_key: string
          api_secret: string
          binance_pay_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_name?: string | null
          updated_at?: string | null
          verification_mode?: string | null
        }
        Update: {
          admin_whatsapp?: string | null
          api_key?: string
          api_secret?: string
          binance_pay_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_name?: string | null
          updated_at?: string | null
          verification_mode?: string | null
        }
        Relationships: []
      }
      binance_pay_config: {
        Row: {
          api_key: string | null
          api_secret: string | null
          created_at: string
          id: string
          is_active: boolean
          merchant_id: string | null
          test_mode: boolean
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string | null
          test_mode?: boolean
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string | null
          test_mode?: boolean
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          social_preview_image: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          social_preview_image?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          social_preview_image?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          call_type: string
          caller_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          receiver_id: string
          started_at: string
          status: Database["public"]["Enums"]["call_status"]
        }
        Insert: {
          call_type: string
          caller_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          receiver_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["call_status"]
        }
        Update: {
          call_type?: string
          caller_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          receiver_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["call_status"]
        }
        Relationships: []
      }
      calling_subscriptions: {
        Row: {
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          plan_duration: number
          price: number
          starts_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          plan_duration: number
          price: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          plan_duration?: number
          price?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image: string | null
          name: string
          parent_id: string | null
          product_count: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          name: string
          parent_id?: string | null
          product_count?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          name?: string
          parent_id?: string | null
          product_count?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          receiver_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          receiver_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          receiver_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cj_credentials: {
        Row: {
          access_token: string | null
          client_secret: string
          connection_id: string
          created_at: string
          id: string
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          client_secret: string
          connection_id: string
          created_at?: string
          id?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          client_secret?: string
          connection_id?: string
          created_at?: string
          id?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cj_dropshipping_connections: {
        Row: {
          client_id: string
          created_at: string
          domain: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          oauth_state: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          oauth_state?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          oauth_state?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cj_import_jobs: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string
          error_log: string | null
          failed_items: number
          id: string
          job_data: Json | null
          job_type: string
          processed_items: number
          started_at: string | null
          status: string
          total_items: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string
          error_log?: string | null
          failed_items?: number
          id?: string
          job_data?: Json | null
          job_type?: string
          processed_items?: number
          started_at?: string | null
          status?: string
          total_items?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          error_log?: string | null
          failed_items?: number
          id?: string
          job_data?: Json | null
          job_type?: string
          processed_items?: number
          started_at?: string | null
          status?: string
          total_items?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cj_import_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "cj_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cj_import_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "cj_dropshipping_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      cj_product_imports: {
        Row: {
          cj_data: Json | null
          cj_product_id: string
          cj_sku: string
          connection_id: string
          created_at: string
          id: string
          import_status: string
          last_sync_at: string | null
          local_product_id: string | null
          mapping_config: Json | null
          sync_errors: string | null
          updated_at: string
        }
        Insert: {
          cj_data?: Json | null
          cj_product_id: string
          cj_sku: string
          connection_id: string
          created_at?: string
          id?: string
          import_status?: string
          last_sync_at?: string | null
          local_product_id?: string | null
          mapping_config?: Json | null
          sync_errors?: string | null
          updated_at?: string
        }
        Update: {
          cj_data?: Json | null
          cj_product_id?: string
          cj_sku?: string
          connection_id?: string
          created_at?: string
          id?: string
          import_status?: string
          last_sync_at?: string | null
          local_product_id?: string | null
          mapping_config?: Json | null
          sync_errors?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cj_product_imports_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "cj_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cj_product_imports_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "cj_dropshipping_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cj_product_imports_local_product_id_fkey"
            columns: ["local_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cj_product_imports_local_product_id_fkey"
            columns: ["local_product_id"]
            isOneToOne: false
            referencedRelation: "products_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cj_product_imports_local_product_id_fkey"
            columns: ["local_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cj_webhook_logs: {
        Row: {
          connection_id: string | null
          created_at: string
          id: string
          payload: Json
          processed: boolean
          processing_error: string | null
          webhook_type: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          id?: string
          payload: Json
          processed?: boolean
          processing_error?: string | null
          webhook_type: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          processed?: boolean
          processing_error?: string | null
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cj_webhook_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "cj_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cj_webhook_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "cj_dropshipping_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string | null
          error_message: string
          error_stack: string | null
          id: string
          timestamp: string
          url: string
          user_agent: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          id?: string
          timestamp: string
          url: string
          user_agent: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          id?: string
          timestamp?: string
          url?: string
          user_agent?: string
          user_id?: string | null
        }
        Relationships: []
      }
      google_services_config: {
        Row: {
          access_token: string | null
          auth_scopes: string[] | null
          client_id: string | null
          client_secret: string | null
          connected_email: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_sync: string | null
          merchant_center_id: string | null
          refresh_token: string | null
          service_name: string
          token_expiry: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          auth_scopes?: string[] | null
          client_id?: string | null
          client_secret?: string | null
          connected_email?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync?: string | null
          merchant_center_id?: string | null
          refresh_token?: string | null
          service_name: string
          token_expiry?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          auth_scopes?: string[] | null
          client_id?: string | null
          client_secret?: string | null
          connected_email?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync?: string | null
          merchant_center_id?: string | null
          refresh_token?: string | null
          service_name?: string
          token_expiry?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ip_ranges: {
        Row: {
          country_id: string | null
          created_at: string | null
          description: string | null
          id: string
          ip_prefix: string
        }
        Insert: {
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_prefix: string
        }
        Update: {
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_ranges_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_wallet_config: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          wallet_name: string | null
          wallet_number: string
          wallet_type: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          wallet_name?: string | null
          wallet_number: string
          wallet_type: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          wallet_name?: string | null
          wallet_number?: string
          wallet_type?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          order_id: string | null
          phone_number: string
          sent_at: string
          session_data: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          order_id?: string | null
          phone_number: string
          sent_at?: string
          session_data?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          order_id?: string | null
          phone_number?: string
          sent_at?: string
          session_data?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          template: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          redirect_uris: string[] | null
          scopes: string[] | null
          updated_at: string
        }
        Insert: {
          client_id: string
          client_secret: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          redirect_uris?: string[] | null
          scopes?: string[] | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          redirect_uris?: string[] | null
          scopes?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          price: number
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          variant_data: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          price: number
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          variant_data?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          price?: number
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          variant_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json
          created_at: string | null
          customer_email: string
          customer_id: string | null
          id: string
          order_number: string
          payment_method: string | null
          payment_status: string | null
          shipping: number | null
          shipping_address: Json
          status: string | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          billing_address: Json
          created_at?: string | null
          customer_email: string
          customer_id?: string | null
          id?: string
          order_number: string
          payment_method?: string | null
          payment_status?: string | null
          shipping?: number | null
          shipping_address: Json
          status?: string | null
          subtotal: number
          tax?: number | null
          total: number
          updated_at?: string | null
        }
        Update: {
          billing_address?: Json
          created_at?: string | null
          customer_email?: string
          customer_id?: string | null
          id?: string
          order_number?: string
          payment_method?: string | null
          payment_status?: string | null
          shipping?: number | null
          shipping_address?: Json
          status?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          phone_number: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone_number: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          phone_number?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_verified: boolean | null
          otp_code: string
          phone_number: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_verified?: boolean | null
          otp_code: string
          phone_number: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_verified?: boolean | null
          otp_code?: string
          phone_number?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          country_id: string | null
          created_at: string | null
          display_name: string
          id: string
          instructions: string | null
          is_active: boolean | null
          name: string
          updated_at: string | null
          wallet_number: string
        }
        Insert: {
          country_id?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          wallet_number: string
        }
        Update: {
          country_id?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          wallet_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateways_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_personal_config: {
        Row: {
          auto_verification: boolean
          created_at: string
          id: string
          is_active: boolean
          paypal_email: string
          updated_at: string
          webhook_id: string | null
        }
        Insert: {
          auto_verification?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          paypal_email: string
          updated_at?: string
          webhook_id?: string | null
        }
        Update: {
          auto_verification?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          paypal_email?: string
          updated_at?: string
          webhook_id?: string | null
        }
        Relationships: []
      }
      price_sync_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          new_price: number | null
          old_price: number | null
          product_id: string | null
          sync_status: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          new_price?: number | null
          old_price?: number | null
          product_id?: string | null
          sync_status?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          new_price?: number | null
          old_price?: number | null
          product_id?: string | null
          sync_status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_sync_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sync_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sync_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sync_logs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comment: string
          created_at: string | null
          id: string
          product_id: string
          rating: number
          review_images: string[] | null
          status: string
          updated_at: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comment: string
          created_at?: string | null
          id?: string
          product_id: string
          rating: number
          review_images?: string[] | null
          status?: string
          updated_at?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comment?: string
          created_at?: string | null
          id?: string
          product_id?: string
          rating?: number
          review_images?: string[] | null
          status?: string
          updated_at?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          price: number | null
          product_id: string | null
          sku: string
          stock_quantity: number | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          price?: number | null
          product_id?: string | null
          sku: string
          stock_quantity?: number | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          price?: number | null
          product_id?: string | null
          sku?: string
          stock_quantity?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allowed_payment_gateways: string[] | null
          auto_order_enabled: boolean | null
          brand: string | null
          cash_on_delivery_enabled: boolean | null
          category_id: string | null
          cost_price: number | null
          country_id: string | null
          created_at: string | null
          description: string
          dimensions: Json | null
          download_url: string | null
          id: string
          images: string[] | null
          in_stock: boolean | null
          is_digital: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          original_price: number | null
          price: number
          print_on_demand: boolean | null
          product_type: string | null
          rating: number | null
          review_count: number | null
          shipping_cost: number | null
          sku: string
          slug: string | null
          social_preview_image: string | null
          stock_quantity: number | null
          subcategory_id: string | null
          tags: string[] | null
          tax_rate: number | null
          updated_at: string | null
          vendor_id: string | null
          virtual_trial_enabled: boolean | null
          weight: number | null
        }
        Insert: {
          allowed_payment_gateways?: string[] | null
          auto_order_enabled?: boolean | null
          brand?: string | null
          cash_on_delivery_enabled?: boolean | null
          category_id?: string | null
          cost_price?: number | null
          country_id?: string | null
          created_at?: string | null
          description: string
          dimensions?: Json | null
          download_url?: string | null
          id?: string
          images?: string[] | null
          in_stock?: boolean | null
          is_digital?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          original_price?: number | null
          price: number
          print_on_demand?: boolean | null
          product_type?: string | null
          rating?: number | null
          review_count?: number | null
          shipping_cost?: number | null
          sku: string
          slug?: string | null
          social_preview_image?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          virtual_trial_enabled?: boolean | null
          weight?: number | null
        }
        Update: {
          allowed_payment_gateways?: string[] | null
          auto_order_enabled?: boolean | null
          brand?: string | null
          cash_on_delivery_enabled?: boolean | null
          category_id?: string | null
          cost_price?: number | null
          country_id?: string | null
          created_at?: string | null
          description?: string
          dimensions?: Json | null
          download_url?: string | null
          id?: string
          images?: string[] | null
          in_stock?: boolean | null
          is_digital?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          original_price?: number | null
          price?: number
          print_on_demand?: boolean | null
          product_type?: string | null
          rating?: number | null
          review_count?: number | null
          shipping_cost?: number | null
          sku?: string
          slug?: string | null
          social_preview_image?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          virtual_trial_enabled?: boolean | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          phone_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_payment_methods: {
        Row: {
          card_brand: string
          card_last_four: string
          created_at: string
          encrypted_card_data: string
          expiry_month: number
          expiry_year: number
          id: string
          is_active: boolean | null
          is_default: boolean | null
          payment_method_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          card_brand: string
          card_last_four: string
          created_at?: string
          encrypted_card_data: string
          expiry_month: number
          expiry_year: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          payment_method_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          card_brand?: string
          card_last_four?: string
          created_at?: string
          encrypted_card_data?: string
          expiry_month?: number
          expiry_year?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          payment_method_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          action: string
          id: string
          ip_address: string | null
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: string | null
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: string | null
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          bing_webmaster_verified: boolean | null
          canonical_url: string | null
          created_at: string | null
          google_analytics_id: string | null
          google_search_console_verified: boolean | null
          id: string
          robots_txt: string | null
          site_description: string | null
          site_keywords: string[] | null
          site_title: string | null
          sitemap_enabled: boolean | null
          sitemap_last_generated: string | null
          updated_at: string | null
          yandex_webmaster_verified: boolean | null
        }
        Insert: {
          bing_webmaster_verified?: boolean | null
          canonical_url?: string | null
          created_at?: string | null
          google_analytics_id?: string | null
          google_search_console_verified?: boolean | null
          id?: string
          robots_txt?: string | null
          site_description?: string | null
          site_keywords?: string[] | null
          site_title?: string | null
          sitemap_enabled?: boolean | null
          sitemap_last_generated?: string | null
          updated_at?: string | null
          yandex_webmaster_verified?: boolean | null
        }
        Update: {
          bing_webmaster_verified?: boolean | null
          canonical_url?: string | null
          created_at?: string | null
          google_analytics_id?: string | null
          google_search_console_verified?: boolean | null
          id?: string
          robots_txt?: string | null
          site_description?: string | null
          site_keywords?: string[] | null
          site_title?: string | null
          sitemap_enabled?: boolean | null
          sitemap_last_generated?: string | null
          updated_at?: string | null
          yandex_webmaster_verified?: boolean | null
        }
        Relationships: []
      }
      server_side_events: {
        Row: {
          created_at: string | null
          custom_data: Json | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          order_id: string | null
          platform: string
          platform_response: Json | null
          sent_successfully: boolean | null
          user_data: Json | null
        }
        Insert: {
          created_at?: string | null
          custom_data?: Json | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          order_id?: string | null
          platform: string
          platform_response?: Json | null
          sent_successfully?: boolean | null
          user_data?: Json | null
        }
        Update: {
          created_at?: string | null
          custom_data?: Json | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          order_id?: string | null
          platform?: string
          platform_response?: Json | null
          sent_successfully?: boolean | null
          user_data?: Json | null
        }
        Relationships: []
      }
      sitemap_cache: {
        Row: {
          categories_count: number | null
          generated_at: string
          id: string
          products_count: number | null
          xml_content: string
        }
        Insert: {
          categories_count?: number | null
          generated_at?: string
          id?: string
          products_count?: number | null
          xml_content: string
        }
        Update: {
          categories_count?: number | null
          generated_at?: string
          id?: string
          products_count?: number | null
          xml_content?: string
        }
        Relationships: []
      }
      sms_transactions: {
        Row: {
          amount: number | null
          created_at: string
          device_id: string | null
          fee: number | null
          id: string
          is_processed: boolean
          matched_order_id: string | null
          message_content: string
          new_balance: number | null
          sender_number: string
          sender_phone: string | null
          transaction_date: string | null
          transaction_id: string
          verified_source: boolean | null
          wallet_type: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          device_id?: string | null
          fee?: number | null
          id?: string
          is_processed?: boolean
          matched_order_id?: string | null
          message_content: string
          new_balance?: number | null
          sender_number: string
          sender_phone?: string | null
          transaction_date?: string | null
          transaction_id: string
          verified_source?: boolean | null
          wallet_type: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          device_id?: string | null
          fee?: number | null
          id?: string
          is_processed?: boolean
          matched_order_id?: string | null
          message_content?: string
          new_balance?: number | null
          sender_number?: string
          sender_phone?: string | null
          transaction_date?: string | null
          transaction_id?: string
          verified_source?: boolean | null
          wallet_type?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          platform: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          platform: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          platform?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      sslcommerz_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_sandbox: boolean
          store_id: string
          store_password: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          store_id: string
          store_password: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          store_id?: string
          store_password?: string
          updated_at?: string
        }
        Relationships: []
      }
      sslcommerz_transactions: {
        Row: {
          amount: number
          bank_transaction_id: string | null
          card_brand: string | null
          card_type: string | null
          created_at: string
          currency: string
          id: string
          order_id: string | null
          response_data: Json | null
          session_key: string | null
          status: string
          transaction_id: string
          updated_at: string
          validation_id: string | null
        }
        Insert: {
          amount: number
          bank_transaction_id?: string | null
          card_brand?: string | null
          card_type?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          response_data?: Json | null
          session_key?: string | null
          status?: string
          transaction_id: string
          updated_at?: string
          validation_id?: string | null
        }
        Update: {
          amount?: number
          bank_transaction_id?: string | null
          card_brand?: string | null
          card_type?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          response_data?: Json | null
          session_key?: string | null
          status?: string
          transaction_id?: string
          updated_at?: string
          validation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sslcommerz_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          admin_whatsapp: string | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: string | null
          email_notifications: boolean | null
          favicon_url: string | null
          id: string
          inventory_alerts: boolean | null
          maintenance_mode: boolean | null
          site_title: string | null
          store_description: string | null
          store_logo: string | null
          store_name: string | null
          store_tagline: string | null
          updated_at: string
          whatsapp_notifications: boolean | null
        }
        Insert: {
          admin_whatsapp?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          email_notifications?: boolean | null
          favicon_url?: string | null
          id?: string
          inventory_alerts?: boolean | null
          maintenance_mode?: boolean | null
          site_title?: string | null
          store_description?: string | null
          store_logo?: string | null
          store_name?: string | null
          store_tagline?: string | null
          updated_at?: string
          whatsapp_notifications?: boolean | null
        }
        Update: {
          admin_whatsapp?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string | null
          email_notifications?: boolean | null
          favicon_url?: string | null
          id?: string
          inventory_alerts?: boolean | null
          maintenance_mode?: boolean | null
          site_title?: string | null
          store_description?: string | null
          store_logo?: string | null
          store_name?: string | null
          store_tagline?: string | null
          updated_at?: string
          whatsapp_notifications?: boolean | null
        }
        Relationships: []
      }
      storefront_sliders: {
        Row: {
          button_text: string | null
          country_id: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_text?: string | null
          country_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_text?: string | null
          country_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_sliders_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_sandbox: boolean
          publishable_key: string
          secret_key: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          publishable_key: string
          secret_key: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          publishable_key?: string
          secret_key?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      stripe_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          id: string
          order_id: string | null
          payment_intent_id: string
          response_data: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          id?: string
          order_id?: string | null
          payment_intent_id: string
          response_data?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          id?: string
          order_id?: string | null
          payment_intent_id?: string
          response_data?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          created_at: string | null
          currency: string | null
          event_data: Json | null
          event_name: string
          id: string
          ip_address: string | null
          order_id: string | null
          platform_sent: Json | null
          product_id: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          event_data?: Json | null
          event_name: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          platform_sent?: Json | null
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          event_data?: Json | null
          event_name?: string
          id?: string
          ip_address?: string | null
          order_id?: string | null
          platform_sent?: Json | null
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          value?: number | null
        }
        Relationships: []
      }
      transaction_verifications: {
        Row: {
          amount: number
          amount_sent: number | null
          balance_verified: boolean | null
          created_at: string | null
          gateway_balance_after: number | null
          gateway_balance_before: number | null
          id: string
          new_balance: number | null
          old_balance: number | null
          order_id: string | null
          payment_gateway: string
          status: string | null
          transaction_id: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          amount_sent?: number | null
          balance_verified?: boolean | null
          created_at?: string | null
          gateway_balance_after?: number | null
          gateway_balance_before?: number | null
          id?: string
          new_balance?: number | null
          old_balance?: number | null
          order_id?: string | null
          payment_gateway: string
          status?: string | null
          transaction_id: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          amount_sent?: number | null
          balance_verified?: boolean | null
          created_at?: string | null
          gateway_balance_after?: number | null
          gateway_balance_before?: number | null
          id?: string
          new_balance?: number | null
          old_balance?: number | null
          order_id?: string | null
          payment_gateway?: string
          status?: string | null
          transaction_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_verifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          is_favorite: boolean
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_orders: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          order_id: string | null
          payment_method_id: string | null
          payment_status: string | null
          shipping_method: string | null
          status: string | null
          total_amount: number | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          vendor_id: string | null
          vendor_order_id: string | null
          vendor_order_number: string | null
          vendor_response: Json | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          shipping_method?: string | null
          status?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_order_id?: string | null
          vendor_order_number?: string | null
          vendor_response?: Json | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          shipping_method?: string | null
          status?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          vendor_id?: string | null
          vendor_order_id?: string | null
          vendor_order_number?: string | null
          vendor_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "saved_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_products: {
        Row: {
          created_at: string
          id: string
          is_available: boolean | null
          last_price_update: string | null
          processing_days: number | null
          product_id: string | null
          shipping_cost: number | null
          updated_at: string
          vendor_id: string | null
          vendor_price: number | null
          vendor_product_id: string
          vendor_sku: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean | null
          last_price_update?: string | null
          processing_days?: number | null
          product_id?: string | null
          shipping_cost?: number | null
          updated_at?: string
          vendor_id?: string | null
          vendor_price?: number | null
          vendor_product_id: string
          vendor_sku?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean | null
          last_price_update?: string | null
          processing_days?: number | null
          product_id?: string | null
          shipping_cost?: number | null
          updated_at?: string
          vendor_id?: string | null
          vendor_price?: number | null
          vendor_product_id?: string
          vendor_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          access_token: string | null
          api_endpoint: string
          api_key: string | null
          api_type: string
          auto_order_enabled: boolean | null
          client_id: string | null
          client_secret: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          price_sync_enabled: boolean | null
          refresh_token: string | null
          settings: Json | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          access_token?: string | null
          api_endpoint: string
          api_key?: string | null
          api_type: string
          auto_order_enabled?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          price_sync_enabled?: boolean | null
          refresh_token?: string | null
          settings?: Json | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          access_token?: string | null
          api_endpoint?: string
          api_key?: string | null
          api_type?: string
          auto_order_enabled?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          price_sync_enabled?: boolean | null
          refresh_token?: string | null
          settings?: Json | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      virtual_trial_config: {
        Row: {
          ai_provider: string
          api_keys: Json | null
          created_at: string
          id: string
          is_active: boolean
          model_name: string
          updated_at: string
        }
        Insert: {
          ai_provider?: string
          api_keys?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          model_name?: string
          updated_at?: string
        }
        Update: {
          ai_provider?: string
          api_keys?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          model_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      virtual_trial_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          product_id: string | null
          result_image_url: string | null
          status: string
          user_id: string | null
          user_image_url: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          product_id?: string | null
          result_image_url?: string | null
          status?: string
          user_id?: string | null
          user_image_url: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          product_id?: string | null
          result_image_url?: string | null
          status?: string
          user_id?: string | null
          user_image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_trial_sessions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_trial_sessions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_trial_sessions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          created_at: string
          id: string
          is_connected: boolean | null
          qr_code: string | null
          session_data: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_connected?: boolean | null
          qr_code?: string | null
          session_data?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_connected?: boolean | null
          qr_code?: string | null
          session_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      woocommerce_api_keys: {
        Row: {
          api_key: string
          api_secret: string
          app_name: string
          callback_url: string | null
          created_at: string
          external_user_id: string | null
          id: string
          is_active: boolean
          last_access_at: string | null
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret: string
          app_name: string
          callback_url?: string | null
          created_at?: string
          external_user_id?: string | null
          id?: string
          is_active?: boolean
          last_access_at?: string | null
          scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          app_name?: string
          callback_url?: string | null
          created_at?: string
          external_user_id?: string | null
          id?: string
          is_active?: boolean
          last_access_at?: string | null
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      cj_connections_safe: {
        Row: {
          client_id: string | null
          created_at: string | null
          domain: string | null
          has_credentials: boolean | null
          id: string | null
          is_active: boolean | null
          last_sync_at: string | null
          oauth_state: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          domain?: string | null
          has_credentials?: never
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          oauth_state?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          domain?: string | null
          has_credentials?: never
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          oauth_state?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      products_catalog: {
        Row: {
          allowed_payment_gateways: string[] | null
          auto_order_enabled: boolean | null
          brand: string | null
          cash_on_delivery_enabled: boolean | null
          category_id: string | null
          country_id: string | null
          created_at: string | null
          description: string | null
          dimensions: Json | null
          download_url: string | null
          id: string | null
          images: string[] | null
          in_stock: boolean | null
          is_digital: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string | null
          original_price: number | null
          price: number | null
          print_on_demand: boolean | null
          product_type: string | null
          rating: number | null
          review_count: number | null
          shipping_cost: number | null
          sku: string | null
          slug: string | null
          social_preview_image: string | null
          stock_quantity: number | null
          subcategory_id: string | null
          tags: string[] | null
          tax_rate: number | null
          updated_at: string | null
          virtual_trial_enabled: boolean | null
          weight: number | null
        }
        Insert: {
          allowed_payment_gateways?: string[] | null
          auto_order_enabled?: boolean | null
          brand?: string | null
          cash_on_delivery_enabled?: boolean | null
          category_id?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          download_url?: string | null
          id?: string | null
          images?: string[] | null
          in_stock?: boolean | null
          is_digital?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string | null
          original_price?: number | null
          price?: number | null
          print_on_demand?: boolean | null
          product_type?: string | null
          rating?: number | null
          review_count?: number | null
          shipping_cost?: number | null
          sku?: string | null
          slug?: string | null
          social_preview_image?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          updated_at?: string | null
          virtual_trial_enabled?: boolean | null
          weight?: number | null
        }
        Update: {
          allowed_payment_gateways?: string[] | null
          auto_order_enabled?: boolean | null
          brand?: string | null
          cash_on_delivery_enabled?: boolean | null
          category_id?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          download_url?: string | null
          id?: string | null
          images?: string[] | null
          in_stock?: boolean | null
          is_digital?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string | null
          original_price?: number | null
          price?: number | null
          print_on_demand?: boolean | null
          product_type?: string | null
          rating?: number | null
          review_count?: number | null
          shipping_cost?: number | null
          sku?: string | null
          slug?: string | null
          social_preview_image?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          updated_at?: string | null
          virtual_trial_enabled?: boolean | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products_public: {
        Row: {
          allowed_payment_gateways: string[] | null
          auto_order_enabled: boolean | null
          brand: string | null
          cash_on_delivery_enabled: boolean | null
          category_id: string | null
          country_id: string | null
          created_at: string | null
          description: string | null
          dimensions: Json | null
          id: string | null
          images: string[] | null
          in_stock: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string | null
          price: number | null
          rating: number | null
          review_count: number | null
          shipping_cost: number | null
          sku: string | null
          slug: string | null
          social_preview_image: string | null
          stock_quantity: number | null
          subcategory_id: string | null
          tags: string[] | null
          tax_rate: number | null
          updated_at: string | null
          vendor_id: string | null
          weight: number | null
        }
        Insert: {
          allowed_payment_gateways?: string[] | null
          auto_order_enabled?: boolean | null
          brand?: string | null
          cash_on_delivery_enabled?: boolean | null
          category_id?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string | null
          images?: string[] | null
          in_stock?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string | null
          price?: number | null
          rating?: number | null
          review_count?: number | null
          shipping_cost?: number | null
          sku?: string | null
          slug?: string | null
          social_preview_image?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          weight?: number | null
        }
        Update: {
          allowed_payment_gateways?: string[] | null
          auto_order_enabled?: boolean | null
          brand?: string | null
          cash_on_delivery_enabled?: boolean | null
          category_id?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string | null
          images?: string[] | null
          in_stock?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string | null
          price?: number | null
          rating?: number | null
          review_count?: number | null
          shipping_cost?: number | null
          sku?: string | null
          slug?: string | null
          social_preview_image?: string | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings_public: {
        Row: {
          created_at: string | null
          currency: string | null
          favicon_url: string | null
          id: string | null
          store_description: string | null
          store_logo: string | null
          store_name: string | null
          store_tagline: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          favicon_url?: string | null
          id?: string | null
          store_description?: string | null
          store_logo?: string | null
          store_name?: string | null
          store_tagline?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          favicon_url?: string | null
          id?: string | null
          store_description?: string | null
          store_logo?: string | null
          store_name?: string | null
          store_tagline?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      unprocessed_sms_transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          fee: number | null
          id: string | null
          matched_order_id: string | null
          message_content: string | null
          new_balance: number | null
          sender_number: string | null
          sender_phone: string | null
          transaction_date: string | null
          transaction_id: string | null
          wallet_type: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          fee?: number | null
          id?: string | null
          matched_order_id?: string | null
          message_content?: string | null
          new_balance?: number | null
          sender_number?: string | null
          sender_phone?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          wallet_type?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          fee?: number | null
          id?: string | null
          matched_order_id?: string | null
          message_content?: string | null
          new_balance?: number | null
          sender_number?: string | null
          sender_phone?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          wallet_type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      can_view_sensitive_product_data: { Args: never; Returns: boolean }
      create_error_logs_table_if_not_exists: { Args: never; Returns: undefined }
      delete_product_cascade: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      generate_oauth_client: {
        Args: {
          p_description?: string
          p_name: string
          p_redirect_uris?: string[]
          p_scopes?: string[]
        }
        Returns: {
          client_id: string
          client_secret: string
          id: string
        }[]
      }
      generate_secure_otp: { Args: never; Returns: string }
      get_cj_credentials: {
        Args: { connection_id: string }
        Returns: {
          access_token: string
          client_secret: string
          refresh_token: string
        }[]
      }
      get_public_products: {
        Args: never
        Returns: {
          allowed_payment_gateways: string[]
          auto_order_enabled: boolean
          brand: string
          cash_on_delivery_enabled: boolean
          category_id: string
          country_id: string
          created_at: string
          description: string
          dimensions: Json
          id: string
          images: string[]
          in_stock: boolean
          meta_description: string
          meta_title: string
          name: string
          original_price: number
          price: number
          rating: number
          review_count: number
          shipping_cost: number
          sku: string
          slug: string
          social_preview_image: string
          stock_quantity: number
          subcategory_id: string
          tags: string[]
          tax_rate: number
          updated_at: string
          weight: number
        }[]
      }
      get_public_store_settings: {
        Args: never
        Returns: {
          created_at: string
          currency: string
          favicon_url: string
          id: string
          store_description: string
          store_logo: string
          store_name: string
          store_tagline: string
          updated_at: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_active_subscription: { Args: { user_uuid: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_sms_transaction_with_order: {
        Args: { p_transaction_id: string; p_wallet_type: string }
        Returns: string
      }
      regenerate_sitemap: { Args: never; Returns: undefined }
      store_cj_credentials:
        | {
            Args: { client_secret: string; connection_id: string }
            Returns: boolean
          }
        | {
            Args: {
              access_token?: string
              client_secret: string
              connection_id: string
              refresh_token?: string
            }
            Returns: boolean
          }
      store_woocommerce_api_key: {
        Args: {
          p_api_key: string
          p_api_secret: string
          p_app_name: string
          p_callback_url: string
          p_external_user_id: string
          p_scope: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_cj_credentials: {
        Args: {
          connection_id: string
          new_access_token?: string
          new_refresh_token?: string
        }
        Returns: boolean
      }
      validate_admin_access: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      call_status:
        | "initiated"
        | "ringing"
        | "answered"
        | "ended"
        | "missed"
        | "declined"
      subscription_status: "active" | "expired" | "cancelled" | "pending"
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
      app_role: ["admin", "moderator", "user"],
      call_status: [
        "initiated",
        "ringing",
        "answered",
        "ended",
        "missed",
        "declined",
      ],
      subscription_status: ["active", "expired", "cancelled", "pending"],
    },
  },
} as const
