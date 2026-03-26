import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PredictionForm } from "@/components/prediction-form";
import { isSeriesLocked } from "@/lib/utils";
import type { Series, Prediction } from "@/lib/types";

export default async function PredictPage({
  params,
}: {
  params: Promise<{ id: string; seriesId: string }>;
}) {
  const { id: leagueId, seriesId } = await params;
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

  const { data: series } = await supabase
    .from("series")
    .select("*")
    .eq("id", seriesId)
    .single();

  if (!series) notFound();

  const { data: prediction } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", user.id)
    .eq("league_id", leagueId)
    .eq("series_id", seriesId)
    .single();

  const locked = isSeriesLocked((series as Series).series_start_time);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <PredictionForm
        series={series as Series}
        leagueId={leagueId}
        existingPrediction={(prediction as Prediction) ?? null}
        locked={locked}
      />
    </div>
  );
}
