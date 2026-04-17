"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PredictionForm } from "@/components/prediction-form";
import { isSeriesLocked } from "@/lib/utils";
import {
  DEFAULT_LEAGUE_SETTINGS,
  type LeagueSettings,
  type RoundNumber,
  type RoundScoring,
  type Series,
  type Prediction,
} from "@/lib/types";

type PageData = {
  series: Series;
  prediction: Prediction | null;
  locked: boolean;
  roundScoring: RoundScoring;
};

export default function PredictPage() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;
  const seriesId = params.seriesId as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<PageData | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { router.push("/login"); return; }

      const { data: membership } = await supabase
        .from("league_members")
        .select("league_id")
        .eq("league_id", leagueId)
        .eq("user_id", user.id)
        .single();

      if (!membership) { router.push("/dashboard"); return; }

      const { data: league } = await supabase
        .from("leagues")
        .select("settings")
        .eq("id", leagueId)
        .single();

      const { data: series } = await supabase
        .from("series")
        .select("*")
        .eq("id", seriesId)
        .single();

      if (!series) { router.push(`/leagues/${leagueId}`); return; }

      const { data: prediction } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.id)
        .eq("league_id", leagueId)
        .eq("series_id", seriesId)
        .single();

      const locked = isSeriesLocked((series as Series).series_start_time);

      const settings = ((league?.settings as LeagueSettings) ?? DEFAULT_LEAGUE_SETTINGS);
      const roundKey = (series as Series).round as RoundNumber;
      const roundScoring = settings.scoring.rounds[roundKey] ?? DEFAULT_LEAGUE_SETTINGS.scoring.rounds[roundKey];

      setPageData({
        series: series as Series,
        prediction: (prediction as Prediction) ?? null,
        locked,
        roundScoring,
      });
      setLoading(false);
    }
    load();
  }, [leagueId, seriesId]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!pageData) return null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <PredictionForm
        series={pageData.series}
        leagueId={leagueId}
        existingPrediction={pageData.prediction}
        locked={pageData.locked}
        roundScoring={pageData.roundScoring}
      />
    </div>
  );
}
