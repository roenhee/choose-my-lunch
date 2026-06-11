import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";

type RequestRow = {
  id: string;
  entity_type: "restaurant" | "menu";
  action_type: "add" | "update" | "delete";
  restaurant_id: string | null;
  menu_id: string | null;
  title: string;
  details: string;
  payload: Record<string, unknown>;
};

function parsePrice(priceText: unknown) {
  const nums =
    String(priceText || "")
      .replace(/,/g, "")
      .match(/\d{3,}/g)
      ?.map((n) => Number(n))
      .filter(Number.isFinite) || [];
  if (!nums.length) return { price_min: null, price_max: null };
  return { price_min: Math.min(...nums), price_max: Math.max(...nums) };
}

async function loadRequest(supabase: ReturnType<typeof createAdminSupabase>, id: string) {
  const { data, error } = await supabase.from("content_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("요청을 찾을 수 없습니다.");
  return data as RequestRow;
}

async function approveRequest(supabase: ReturnType<typeof createAdminSupabase>, request: RequestRow) {
  const payload = request.payload || {};

  if (request.entity_type === "restaurant") {
    if (request.action_type === "add") {
      const restaurantId = crypto.randomUUID();
      const { error } = await supabase.from("restaurants").insert({
        id: restaurantId,
        source_row: null,
        store_name: String(payload.restaurant_name || request.title || "").trim(),
        naver_place_name: String(payload.restaurant_name || request.title || "").trim(),
        category: String(payload.category || "기타").trim() || "기타",
        address: String(payload.address || "").trim() || null,
        naver_road_address: String(payload.address || "").trim() || null,
        first_image: null,
        naver_url: String(payload.naver_url || "").trim() || null
      });
      if (error) throw new Error(error.message);
      return;
    }

    if (!request.restaurant_id) throw new Error("음식점 대상 정보가 없습니다.");

    if (request.action_type === "update") {
      const { error } = await supabase
        .from("restaurants")
        .update({
          store_name: String(payload.restaurant_name || request.title || "").trim(),
          naver_place_name: String(payload.restaurant_name || request.title || "").trim(),
          category: String(payload.category || "기타").trim() || "기타",
          address: String(payload.address || "").trim() || null,
          naver_road_address: String(payload.address || "").trim() || null,
          naver_url: String(payload.naver_url || "").trim() || null
        })
        .eq("id", request.restaurant_id);
      if (error) throw new Error(error.message);
      return;
    }

    if (request.action_type === "delete") {
      const { error } = await supabase.from("restaurants").delete().eq("id", request.restaurant_id);
      if (error) throw new Error(error.message);
      return;
    }
  }

  if (request.entity_type === "menu") {
    if (request.action_type === "add") {
      if (!request.restaurant_id) throw new Error("메뉴를 추가할 음식점 정보가 없습니다.");
      const price = parsePrice(payload.price_text);
      const { error } = await supabase.from("menus").insert({
        restaurant_id: request.restaurant_id,
        menu_index: null,
        name: String(payload.menu_name || request.title || "").trim(),
        price_text: String(payload.price_text || "").trim() || null,
        price_min: price.price_min,
        price_max: price.price_max,
        description: String(payload.description || "").trim() || null,
        recommended: false,
        image_url: null
      });
      if (error) throw new Error(error.message);
      return;
    }

    if (!request.menu_id) throw new Error("메뉴 대상 정보가 없습니다.");

    if (request.action_type === "update") {
      const price = parsePrice(payload.price_text);
      const { error } = await supabase
        .from("menus")
        .update({
          name: String(payload.menu_name || request.title || "").trim(),
          price_text: String(payload.price_text || "").trim() || null,
          price_min: price.price_min,
          price_max: price.price_max,
          description: String(payload.description || "").trim() || null
        })
        .eq("id", request.menu_id);
      if (error) throw new Error(error.message);
      return;
    }

    if (request.action_type === "delete") {
      const { error } = await supabase.from("menus").delete().eq("id", request.menu_id);
      if (error) throw new Error(error.message);
      return;
    }
  }

  throw new Error("지원하지 않는 요청입니다.");
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createAdminSupabase();
    const request = await loadRequest(supabase, id);
    await approveRequest(supabase, request);
    const { error } = await supabase.from("content_requests").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "승인 처리에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("content_requests").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "무시 처리에 실패했습니다." }, { status: 500 });
  }
}
