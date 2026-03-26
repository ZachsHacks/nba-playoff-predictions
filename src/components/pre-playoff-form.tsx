"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueSettings, PrePlayoffPrediction } from "@/lib/types";

type PrePlayoffFormProps = {
  leagueId: string;
  settings: LeagueSettings;
  existing: PrePlayoffPrediction | null;
  locked: boolean;
};

export function PrePlayoffForm({ leagueId, settings, existing, locked }: PrePlayoffFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [eastChamp, setEastChamp] = useState(existing?.conference_champion_east ?? "");
  const [westChamp, setWestChamp] = useState(existing?.conference_champion_west ?? "");
  const [champion, setChampion] = useState(existing?.nba_champion ?? "");
  const [mvp, setMvp] = useState(existing?.finals_mvp ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!champion) { setError("NBA Champion is required"); return; }
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setLoading(false); return; }

    const payload = {
      user_id: user.id,
      league_id: leagueId,
      conference_champion_east: settings.features.conference_champions ? eastChamp || null : null,
      conference_champion_west: settings.features.conference_champions ? westChamp || null : null,
      nba_champion: champion,
      finals_mvp: settings.features.finals_mvp ? mvp || null : null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("pre_playoff_predictions")
        .update(payload)
        .eq("id", existing.id);
      if (updateError) { setError(updateError.message); setLoading(false); return; }
    } else {
      const { error: insertError } = await supabase
        .from("pre_playoff_predictions")
        .insert(payload);
      if (insertError) { setError(insertError.message); setLoading(false); return; }
    }

    router.push(`/leagues/${leagueId}`);
    router.refresh();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Pre-Playoff Predictions</CardTitle>
      </CardHeader>
      <CardContent>
        {locked ? (
          <div className="space-y-3">
            <p className="text-muted-foreground">Predictions are locked (playoffs have started).</p>
            {existing && (
              <div className="space-y-2 text-sm">
                {settings.features.conference_champions && (
                  <>
                    <p><strong>East Champion:</strong> {existing.conference_champion_east ?? "No pick"}</p>
                    <p><strong>West Champion:</strong> {existing.conference_champion_west ?? "No pick"}</p>
                  </>
                )}
                <p><strong>NBA Champion:</strong> {existing.nba_champion}</p>
                {settings.features.finals_mvp && (
                  <p><strong>Finals MVP:</strong> {existing.finals_mvp ?? "No pick"}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {settings.features.conference_champions && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="east">Eastern Conference Champion</Label>
                  <Input
                    id="east"
                    value={eastChamp}
                    onChange={(e) => setEastChamp(e.target.value)}
                    placeholder="e.g. Boston Celtics"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="west">Western Conference Champion</Label>
                  <Input
                    id="west"
                    value={westChamp}
                    onChange={(e) => setWestChamp(e.target.value)}
                    placeholder="e.g. Denver Nuggets"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="champion">NBA Champion</Label>
              <Input
                id="champion"
                value={champion}
                onChange={(e) => setChampion(e.target.value)}
                placeholder="e.g. Boston Celtics"
                required
              />
            </div>
            {settings.features.finals_mvp && (
              <div className="space-y-2">
                <Label htmlFor="mvp">Finals MVP</Label>
                <Input
                  id="mvp"
                  value={mvp}
                  onChange={(e) => setMvp(e.target.value)}
                  placeholder="e.g. Jayson Tatum"
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : existing ? "Update Predictions" : "Submit Predictions"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
