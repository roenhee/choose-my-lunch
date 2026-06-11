import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/admin";

type ToggleLikeBody = {
  targetType?: "restaurant" | "menu";
  targetId?: string;
  visitorId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ToggleLikeBody;
    const targetType = body.targetType;
    const targetId = body.targetId?.trim();
    const visitorId = body.visitorId?.trim();

    if (!targetType || !["restaurant", "menu"].includes(targetType)) {
      return NextResponse.json({ message: "잘못된 좋아요 대상입니다." }, { status: 400 });
    }

    if (!targetId) {
      return NextResponse.json({ message: "대상 ID가 필요합니다." }, { status: 400 });
    }

    if (!visitorId || visitorId.length < 16 || visitorId.length > 80) {
      return NextResponse.json({ message: "비정상적인 방문자 ID입니다." }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    const { data: existingLike, error: lookupError } = await supabase
      .from("likes")
      .select("id")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ message: lookupError.message }, { status: 500 });
    }

    if (existingLike) {
      const { error: deleteError } = await supabase
        .from("likes")
        .delete()
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("visitor_id", visitorId);

      if (deleteError) {
        return NextResponse.json({ message: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ liked: false });
    }

    const { error: insertError } = await supabase.from("likes").insert({
      target_type: targetType,
      target_id: targetId,
      visitor_id: visitorId
    });

    if (insertError) {
      return NextResponse.json({ message: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ liked: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "좋아요 처리에 실패했습니다." }, { status: 500 });
  }
}
