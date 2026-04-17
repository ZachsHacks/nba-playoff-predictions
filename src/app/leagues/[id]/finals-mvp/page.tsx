"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSeriesLocked, timeUntilLock } from "@/lib/utils";
import type { LeagueSettings, PrePlayoffPrediction, Series } from "@/lib/types";

type PageData = {
  settings: LeagueSettings;
  existing: PrePlayoffPrediction | null;
  finals: Series | null;
  locked: boolean;
};

export default function FinalsMvpPage() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [mvp, setMvp] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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

      const { data: finalsRows } = await supabase
        .from("series")
        .select("*")
        .eq("round", 4)
        .limit(1);

      const finals = (finalsRows?.[0] ?? null) as Series | null;
      const locked = finals ? isSeriesLocked(finals.series_start_time) : false;

      setPageData({
        settings: (league as { settings: LeagueSettings }).settings,
        existing: (existing as PrePlayoffPrediction) ?? null,
        finals,
        locked,
      });
      setMvp(((existing as PrePlayoffPrediction | null)?.finals_mvp) ?? "");
      setLoading(false);
    }
    load();
  }, [leagueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mvp.trim()) { setError("Enter a player name"); return; }
    setError("");
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setSaving(false); return; }
    if (!pageData) return;

    if (pageData.existing) {
      const { error: updateError } = await supabase
        .from("pre_playoff_predictions")
        .update({ finals_mvp: mvp.trim(), updated_at: new Date().toISOString() })
        .eq("id", pageData.existing.id);
      if (updateError) { setError(updateError.message); setSaving(false); return; }
    } else {
      // If the user never made a pre-playoff prediction, seed one with just MVP.
      // NBA champion is required NOT NULL, so we need a fallback; use the
      // Finals winner-eligible teams. We'll require them to have NBA champion
      // set before MVP — redirect them.
      setError("Please submit your pre-playoff predictions (NBA Champion) first.");
      setSaving(false);
      return;
    }

    router.push(`/leagues/${leagueId}`);
    router.refresh();
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!pageData) return null;

  if (!pageData.settings.features.finals_mvp) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <p>Finals MVP predictions are disabled in this league.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push(`/leagues/${leagueId}`)}
            >
              Back to league
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pageData.finals) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6 text-center space-y-3">
            <p className="font-medium">Finals matchup isn&apos;t set yet</p>
            <p className="text-sm text-muted-foreground">
              Come back once the Conference Finals are done and we know who&apos;s playing.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/leagues/${leagueId}`)}
            >
              Back to league
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lockCountdown = timeUntilLock(pageData.finals.series_start_time);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Finals MVP Prediction</CardTitle>
          <p className="text-sm text-muted-foreground">
            {pageData.finals.team_a} vs {pageData.finals.team_b}
          </p>
          {!pageData.locked && (
            <p className="text-xs text-muted-foreground">Locks in {lockCountdown}</p>
          )}
        </CardHeader>
        <CardContent>
          {pageData.locked ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">Finals MVP prediction is locked.</p>
              {pageData.existing?.finals_mvp ? (
                <p><strong>Your pick:</strong> {pageData.existing.finals_mvp}</p>
              ) : (
                <p className="text-sm text-muted-foreground">You didn&apos;t submit a pick.</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mvp">Player name</Label>
                <Input
                  id="mvp"
                  value={mvp}
                  onChange={(e) => setMvp(e.target.value)}
                  placeholder="e.g. Jayson Tatum"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the player you think wins Finals MVP. Spelling must match the actual winner.
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Submit Finals MVP Pick"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
