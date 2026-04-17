import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchPlayoffData, normalizeTeamName, type PlayoffSeries } from "@/lib/nba-api";
import { scoreSeries } from "@/lib/scoring";
import type { Series } from "@/lib/types";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Find an existing row that represents the same series as the incoming one.
// Match by, in priority order:
//   1) external_id exact match (if a prior cron run set it)
//   2) team_a + team_b match in either order (preserves our manual rows +
//      any predictions tied to those UUIDs)
//   3) round + conference + one team match, other being "TBD..." (the
//      play-in-winner placeholder case)
function findExistingMatch(existing: Series[], incoming: PlayoffSeries): Series | null {
  const byExternal = existing.find((s) => s.external_id === incoming.external_id);
  if (byExternal) return byExternal;

  const inA = normalizeTeamName(incoming.team_a);
  const inB = normalizeTeamName(incoming.team_b);

  const byBothTeams = existing.find((s) => {
    const eA = normalizeTeamName(s.team_a);
    const eB = normalizeTeamName(s.team_b);
    return (eA === inA && eB === inB) || (eA === inB && eB === inA);
  });
  if (byBothTeams) return byBothTeams;

  const isTBD = (name: string) => /^tbd/.test(normalizeTeamName(name));
  const byTBD = existing.find((s) => {
    if (s.round !== incoming.round || s.conference !== incoming.conference) return false;
    const eA = normalizeTeamName(s.team_a);
    const eB = normalizeTeamName(s.team_b);
    const aMatch = eA === inA || eA === inB;
    const bMatch = eB === inA || eB === inB;
    return (aMatch && isTBD(s.team_b)) || (bMatch && isTBD(s.team_a));
  });
  return byTBD ?? null;
}

async function upsertSeries(
  supabase: SupabaseClient,
  incoming: PlayoffSeries,
  existing: Series | null
): Promise<{ id: string; wasComplete: boolean; isNowComplete: boolean; action: "updated" | "inserted" }> {
  const incomingComplete = incoming.status === "complete";

  if (existing) {
    const wasComplete = existing.status === "complete";

    // Don't overwrite a status already set to complete (admin may have
    // manually marked it). Always refresh team names and times so play-in
    // placeholders resolve and start times stay current.
    const updates: Partial<Series> = {
      external_id: incoming.external_id,
      team_a: incoming.team_a,
      team_b: incoming.team_b,
      series_start_time: incoming.series_start_time,
      conference: incoming.conference,
    };

    if (!wasComplete) {
      updates.status = incoming.status;
      updates.winner = incoming.winner;
      updates.final_score = incoming.final_score;
    }

    const { error } = await supabase.from("series").update(updates).eq("id", existing.id);
    if (error) throw new Error(`Update failed: ${error.message}`);

    return {
      id: existing.id,
      wasComplete,
      isNowComplete: incomingComplete,
      action: "updated",
    };
  }

  const { data: inserted, error } = await supabase
    .from("series")
    .insert({
      external_id: incoming.external_id,
      round: incoming.round,
      conference: incoming.conference,
      team_a: incoming.team_a,
      team_b: incoming.team_b,
      series_start_time: incoming.series_start_time,
      status: incoming.status,
      winner: incoming.winner,
      final_score: incoming.final_score,
    })
    .select("id")
    .single();

  if (error || !inserted) throw new Error(`Insert failed: ${error?.message}`);

  return {
    id: inserted.id,
    wasComplete: false,
    isNowComplete: incomingComplete,
    action: "inserted",
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    const [playoffData, { data: existingRows }] = await Promise.all([
      fetchPlayoffData(),
      supabase.from("series").select("*"),
    ]);

    const existing = (existingRows ?? []) as Series[];

    if (playoffData.length === 0) {
      return NextResponse.json({
        message: "No playoff data available yet",
        existing_count: existing.length,
      });
    }

    const newlyCompleted: string[] = [];
    const results: Array<{ teams: string; action: string; status: string }> = [];

    for (const incoming of playoffData) {
      const match = findExistingMatch(existing, incoming);
      try {
        const { id, wasComplete, isNowComplete, action } = await upsertSeries(supabase, incoming, match);
        results.push({
          teams: `${incoming.team_a} vs ${incoming.team_b}`,
          action,
          status: incoming.status,
        });
        if (!wasComplete && isNowComplete) {
          newlyCompleted.push(id);
        }
      } catch (err) {
        results.push({
          teams: `${incoming.team_a} vs ${incoming.team_b}`,
          action: "error",
          status: err instanceof Error ? err.message : "unknown",
        });
      }
    }

    for (const seriesId of newlyCompleted) {
      try {
        await scoreSeries(supabase, seriesId);
      } catch (err) {
        console.error(`Scoring failed for ${seriesId}:`, err);
      }
    }

    return NextResponse.json({
      message: "Updated",
      series_count: playoffData.length,
      newly_scored: newlyCompleted.length,
      results,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
