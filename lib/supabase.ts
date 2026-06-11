import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://fififqllhlrkdumwuixr.supabase.co",
  supabaseAnonKey || "missing-anon-key"
);

export type Restaurant = {
  id: string;
  source_row: number | null;
  store_name: string;
  naver_place_name: string;
  category: string;
  address: string | null;
  naver_road_address: string | null;
  first_image: string | null;
  naver_url: string | null;
  like_count: number;
  menu_count: number;
};

export type Menu = {
  id: string;
  restaurant_id: string;
  menu_index: number | null;
  name: string;
  price_text: string | null;
  price_min: number | null;
  price_max: number | null;
  description: string | null;
  recommended: boolean;
  image_url: string | null;
  like_count?: number;
};

export type LikeRow = {
  target_type: "restaurant" | "menu";
  target_id: string;
  visitor_id: string;
};
