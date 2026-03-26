import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchPlayoffData } from "@/lib/nba-api";
import { scoreSeries } from "@/lib/scoring";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    const playoffData = await fetchPlayoffData();

    if (playoffData.length === 0) {
      return NextResponse.json({ message: "No playoff data available yet" });
    }

    const newlyCompleted: string[] = [];

    for (const series of playoffData) {
      const { data: existing } = await supabase
        .from("series")
        .select("id, status")
        .eq("external_id", series.external_id)
        .single();

      if (existing) {
        const wasComplete = existing.status === "complete";

        await supabase
          .from("series")
          .update({
            status: series.status,
            winner: series.winner,
            final_score: series.final_score,
            series_start_time: series.series_start_time,
          })
          .eq("id", existing.id);

        if (!wasComplete && series.status === "complete") {
          newlyCompleted.push(existing.id);
        }
      } else {
        const { data: inserted } = await supabase
          .from("series")
          .insert({
            external_id: series.external_id,
            round: series.round,
            conference: series.conference,
            team_a: series.team_a,
            team_b: series.team_b,
            series_start_time: series.series_start_time,
            status: series.status,
            winner: series.winner,
            final_score: series.final_score,
          })
          .select("id")
          .single();

        if (inserted && series.status === "complete") {
          newlyCompleted.push(inserted.id);
        }
      }
    }

    for (const seriesId of newlyCompleted) {
      await scoreSeries(supabase, seriesId);
    }

    return NextResponse.json({
      message: "Updated",
      series_count: playoffData.length,
      newly_scored: newlyCompleted.length,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
