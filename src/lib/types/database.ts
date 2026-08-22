/**
 * Database types.
 *
 * Shaped to match `supabase gen types typescript` output so it can be
 * regenerated in place:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/types/database.ts
 *
 * Keep in sync with supabase/schema.sql.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PageStatus = "draft" | "published" | "archived";
export type AdminRole = "viewer" | "editor" | "owner";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEKDAYS: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };

      fixer_profiles: {
        Row: {
          id: string;
          owner_id: string | null;
          slug: string;
          shop_name: string;
          bio: string | null;
          address: string;
          lat: number | null;
          lng: number | null;
          timezone: string;
          verified: boolean;
          photos: string[];
          offers_in_shop: boolean;
          offers_home_service: boolean;
          offers_pickup_drop: boolean;
          working_days: Weekday[];
          opening_time: string;
          closing_time: string;
          hours: Json;
          closed_on_holidays: boolean;
          contact_phone: string | null;
          contact_email: string | null;
          rating_avg: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["fixer_profiles"]["Row"],
          "id" | "created_at" | "updated_at" | "rating_avg" | "rating_count"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["fixer_profiles"]["Insert"]>;
        Relationships: [];
      };

      repair_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["repair_categories"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["repair_categories"]["Insert"]>;
        Relationships: [];
      };

      fixer_categories: {
        Row: { fixer_id: string; category_id: string };
        Insert: { fixer_id: string; category_id: string };
        Update: Partial<{ fixer_id: string; category_id: string }>;
        Relationships: [];
      };

      reviews: {
        Row: {
          id: string;
          fixer_id: string;
          customer_id: string;
          rating: number;
          text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["reviews"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: [];
      };

      shop_jobs: {
        Row: {
          id: string;
          fixer_id: string;
          title: string;
          job_type: "full_time" | "part_time" | "contract" | "apprenticeship";
          work_location: "in_shop" | "on_field" | "hybrid";
          experience_level: string;
          salary_type: "fixed" | "range" | "negotiable" | "commission";
          salary_min: number | null;
          salary_max: number | null;
          salary_period: "month" | "week" | "day" | "per_job";
          salary_negotiable: boolean;
          description: string;
          skills_required: string[];
          contact_phone: string | null;
          contact_whatsapp: string | null;
          contact_email: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["shop_jobs"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["shop_jobs"]["Insert"]>;
        Relationships: [];
      };

      seo_global: {
        Row: {
          id: number;
          site_title: string;
          default_meta_title: string;
          default_meta_description: string;
          default_keywords: string[];
          canonical_domain: string;
          default_og_image_url: string | null;
          global_expert_schema: Json | null;
          global_organization_schema: Json | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["seo_global"]["Row"]> & { id?: number };
        Update: Partial<Database["public"]["Tables"]["seo_global"]["Row"]>;
        Relationships: [];
      };

      cms_templates: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sections: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["cms_templates"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["cms_templates"]["Insert"]>;
        Relationships: [];
      };

      seo_pages: {
        Row: {
          id: string;
          template_id: string | null;
          title: string;
          slug: string;
          path_prefix: string;
          status: PageStatus;
          content_sections: Json;
          meta_title: string | null;
          meta_description: string | null;
          keywords: string[];
          canonical_url: string | null;
          is_indexed: boolean;
          is_followed: boolean;
          og_title: string | null;
          og_image_url: string | null;
          schema_type: string;
          schema_markup: Json | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["seo_pages"]["Row"],
          "id" | "created_at" | "updated_at" | "published_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["seo_pages"]["Insert"]>;
        Relationships: [];
      };

      seo_redirects: {
        Row: {
          id: string;
          source_url: string;
          destination_url: string;
          status_code: number;
          hit_count: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["seo_redirects"]["Row"],
          "id" | "created_at" | "hit_count"
        > & { id?: string; created_at?: string; hit_count?: number };
        Update: Partial<Database["public"]["Tables"]["seo_redirects"]["Insert"]>;
        Relationships: [];
      };

      seo_admins: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          role: AdminRole;
          last_login_at: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["seo_admins"]["Row"],
          "id" | "created_at" | "last_login_at"
        > & { id?: string; created_at?: string; last_login_at?: string | null };
        Update: Partial<Database["public"]["Tables"]["seo_admins"]["Insert"]>;
        Relationships: [];
      };

      blog_posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          status: "draft" | "published" | "archived";
          content: string | null;
          meta_title: string | null;
          meta_description: string | null;
          keywords: string[] | null;
          og_image_url: string | null;
          author_id: string | null;
          published_at: string | null;
          template_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["blog_posts"]["Row"],
          "id" | "created_at" | "updated_at" | "published_at" | "template_id"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          template_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["blog_posts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "blog_posts_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "blog_templates";
            referencedColumns: ["id"];
          }
        ];
      };

      blog_templates: {
        Row: {
          id: string;
          name: string;
          html_template: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["blog_templates"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["blog_templates"]["Insert"]>;
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      search_fixers: {
        Args: {
          min_lat?: number;
          max_lat?: number;
          min_lng?: number;
          max_lng?: number;
          category_slug?: string | null;
          search_query?: string | null;
          min_rating?: number;
          require_home_service?: boolean;
          require_pickup_drop?: boolean;
          require_in_shop?: boolean;
          result_limit?: number;
        };
        Returns: Database["public"]["Tables"]["fixer_profiles"]["Row"][];
      };
      booking_counterparties: {
        Args: {
          p_user_ids: string[];
        };
        Returns: {
          id: string;
          display_name: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
        }[];
      };
      my_profile: {
        Args: Record<string, never>;
        Returns: Record<string, unknown>[];
      };
    };

    Enums: {
      page_status: PageStatus;
      admin_role: AdminRole;
      weekday: Weekday;
      blog_status: "draft" | "published" | "archived";
    };

    CompositeTypes: Record<string, never>;
  };
}

/* ── Convenience aliases used across the app ──────────────────────────────── */

type Tables = Database["public"]["Tables"];

export type FixerProfileRow = Tables["fixer_profiles"]["Row"];
export type RepairCategoryRow = Tables["repair_categories"]["Row"];
export type ReviewRow = Tables["reviews"]["Row"];
export type UserRow = Tables["users"]["Row"];
export type SeoPageRow = Tables["seo_pages"]["Row"];
export type SeoGlobalRow = Tables["seo_global"]["Row"];
export type SeoRedirectRow = Tables["seo_redirects"]["Row"];
export type CmsTemplateRow = Tables["cms_templates"]["Row"];
export type SeoAdminRow = Tables["seo_admins"]["Row"];
export type BlogPostRow = Tables["blog_posts"]["Row"];
export type BlogTemplateRow = Tables["blog_templates"]["Row"];
export type ShopJobRow = Tables["shop_jobs"]["Row"];

/** A review joined with its author, as returned by the profile page query. */
export type ReviewWithAuthor = ReviewRow & {
  customer: Pick<UserRow, "id" | "display_name" | "avatar_url"> | null;
};

/** The full profile payload rendered by /expert/[slug]. */
export type ExpertProfile = FixerProfileRow & {
  categories: RepairCategoryRow[];
  reviews: ReviewWithAuthor[];
};
