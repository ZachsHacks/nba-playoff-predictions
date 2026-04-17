"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PrePlayoffForm } from "@/components/pre-playoff-form";
import type { LeagueSettings, PrePlayoffPrediction } from "@/lib/types";

type PageData = {
  settings: LeagueSettings;
  existing: PrePlayoffPrediction | null;
  locked: boolean;
  eastTeams: string[];
  westTeams: string[];
};

function extractRealTeams(teams: string[]): string[] {
  return Array.from(new Set(teams))
    .filter((t) => t && !t.toLowerCase().startsWith("tbd"))
    .sort();
}

export default function PrePlayoffPage() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;
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

      if (!league) { router.push("/dashboard"); return; }

      const { data: existing } = await supabase
        .from("pre_playoff_predictions")
        .select("*")
        .eq("user_id", user.id)
        .eq("league_id", leagueId)
        .single();

      const { data: round1Series } = await supabase
        .from("series")
        .select("conference, team_a, team_b, series_start_time")
        .eq("round", 1);

      let locked = false;
      if (round1Series && round1Series.length > 0) {
        const startTimes = round1Series
          .map((s) => s.series_start_time)
          .filter((t): t is string => !!t)
          .sort();
        if (startTimes.length > 0) {
          const lockTime = new Date(startTimes[0]);
          lockTime.setMinutes(lockTime.getMinutes() - 30);
          locked = new Date() >= lockTime;
        }
      }

      const eastTeams = extractRealTeams(
        (round1Series ?? [])
          .filter((s) => s.conference === "East")
          .flatMap((s) => [s.team_a, s.team_b])
      );
      const westTeams = extractRealTeams(
        (round1Series ?? [])
          .filter((s) => s.conference === "West")
          .flatMap((s) => [s.team_a, s.team_b])
      );

      setPageData({
        settings: (league as { settings: LeagueSettings }).settings,
        existing: (existing as PrePlayoffPrediction) ?? null,
        locked,
        eastTeams,
        westTeams,
      });
      setLoading(false);
    }
    load();
  }, [leagueId]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!pageData) return null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <PrePlayoffForm
        leagueId={leagueId}
        settings={pageData.settings}
        existing={pageData.existing}
        locked={pageData.locked}
        eastTeams={pageData.eastTeams}
        westTeams={pageData.westTeams}
      />
    </div>
  );
}
