import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PrePlayoffForm } from "@/components/pre-playoff-form";
import type { LeagueSettings, PrePlayoffPrediction } from "@/lib/types";

export default async function PrePlayoffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const { data: league } = await supabase
    .from("leagues")
    .select("settings")
    .eq("id", leagueId)
    .single();

  if (!league) notFound();

  const { data: existing } = await supabase
    .from("pre_playoff_predictions")
    .select("*")
    .eq("user_id", user.id)
    .eq("league_id", leagueId)
    .single();

  let locked = false;
  const { data: round1Series } = await supabase
    .from("series")
    .select("series_start_time")
    .eq("round", 1)
    .not("series_start_time", "is", null)
    .order("series_start_time", { ascending: true })
    .limit(1);

  if (round1Series && round1Series.length > 0 && round1Series[0].series_start_time) {
    const lockTime = new Date(round1Series[0].series_start_time);
    lockTime.setMinutes(lockTime.getMinutes() - 30);
    locked = new Date() >= lockTime;
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <PrePlayoffForm
        leagueId={leagueId}
        settings={(league as { settings: LeagueSettings }).settings}
        existing={(existing as PrePlayoffPrediction) ?? null}
        locked={locked}
      />
    </div>
  );
}
