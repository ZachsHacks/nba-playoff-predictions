"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueSettings, PrePlayoffPrediction } from "@/lib/types";

type PrePlayoffFormProps = {
  leagueId: string;
  settings: LeagueSettings;
  existing: PrePlayoffPrediction | null;
  locked: boolean;
  eastTeams: string[];
  westTeams: string[];
};

export function PrePlayoffForm({
  leagueId,
  settings,
  existing,
  locked,
  eastTeams,
  westTeams,
}: PrePlayoffFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [eastChamp, setEastChamp] = useState(existing?.conference_champion_east ?? "");
  const [westChamp, setWestChamp] = useState(existing?.conference_champion_west ?? "");
  const [champion, setChampion] = useState(existing?.nba_champion ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const allTeams = [...eastTeams, ...westTeams].sort();

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
      // Finals MVP stays on this table but is set from a separate form once
      // Finals matchup is known. Preserve any existing value here.
      finals_mvp: existing?.finals_mvp ?? null,
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
        <p className="text-sm text-muted-foreground">
          Lock in your champions before Round 1 tips off. Finals MVP is a separate prediction you&apos;ll make once the Finals teams are set.
        </p>
      </CardHeader>
      <CardContent>
        {locked ? (
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Predictions are locked (Round 1 has started).
            </p>
            {existing && (
              <div className="space-y-2 text-sm">
                {settings.features.conference_champions && (
                  <>
                    <p><strong>East Champion:</strong> {existing.conference_champion_east ?? "No pick"}</p>
                    <p><strong>West Champion:</strong> {existing.conference_champion_west ?? "No pick"}</p>
                  </>
                )}
                <p><strong>NBA Champion:</strong> {existing.nba_champion}</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {settings.features.conference_champions && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="east">Eastern Conference Champion</Label>
                  <select
                    id="east"
                    value={eastChamp}
                    onChange={(e) => setEastChamp(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a team...</option>
                    {eastTeams.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="west">Western Conference Champion</Label>
                  <select
                    id="west"
                    value={westChamp}
                    onChange={(e) => setWestChamp(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a team...</option>
                    {westTeams.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="champion">NBA Champion</Label>
              <select
                id="champion"
                value={champion}
                onChange={(e) => setChampion(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a team...</option>
                {allTeams.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
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
