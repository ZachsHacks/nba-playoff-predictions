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
};

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

      setPageData({
        settings: (league as { settings: LeagueSettings }).settings,
        existing: (existing as PrePlayoffPrediction) ?? null,
        locked,
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
      />
    </div>
  );
}
