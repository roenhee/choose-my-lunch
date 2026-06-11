import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";

export async function GET() {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("content_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "관리자 요청을 불러오지 못했습니다." }, { status: 500 });
  }
}
