"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueSettings } from "@/lib/types";

const DEFAULT_SETTINGS: LeagueSettings = {
  scoring: {
    series_winner: 10,
    series_score_bonus: 5,
    conference_champion: 10,
    finals_mvp: 10,
    finals_game_pick: 5,
  },
  features: {
    conference_champions: true,
    finals_mvp: true,
    finals_game_predictions: true,
  },
};

const SCORING_LABELS: Record<keyof LeagueSettings["scoring"], string> = {
  series_winner: "Correct series winner",
  series_score_bonus: "Correct series score (bonus)",
  conference_champion: "Correct conference champion",
  finals_mvp: "Correct Finals MVP",
  finals_game_pick: "Correct Finals game pick",
};

const FEATURE_LABELS: Record<keyof LeagueSettings["features"], string> = {
  conference_champions: "Conference champion predictions",
  finals_mvp: "Finals MVP prediction",
  finals_game_predictions: "Finals game-by-game predictions",
};

export default function CreateLeaguePage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [settings, setSettings] = useState<LeagueSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateScoring = (key: keyof LeagueSettings["scoring"], value: number) => {
    setSettings({ ...settings, scoring: { ...settings.scoring, [key]: value } });
  };

  const toggleFeature = (key: keyof LeagueSettings["features"]) => {
    setSettings({ ...settings, features: { ...settings.features, [key]: !settings.features[key] } });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setLoading(false); return; }

    const insertLeague = async (code: string) =>
      supabase
        .from("leagues")
        .insert({ name, invite_code: code, commissioner_id: user.id, settings })
        .select()
        .single();

    let { data: league, error: createError } = await insertLeague(generateInviteCode());

    if (createError?.code === "23505") {
      ({ data: league, error: createError } = await insertLeague(generateInviteCode()));
    }

    if (createError || !league) {
      setError(createError?.message ?? "Failed to create league");
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("league_members")
      .insert({ league_id: league.id, user_id: user.id });

    if (memberError) {
      setError(`League created but couldn't add you as a member: ${memberError.message}`);
      setLoading(false);
      return;
    }

    router.push(`/leagues/${league.id}`);
  };

  return (
    <div className="container mx-auto max-w-xl p-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Create a League</h1>

      <form onSubmit={handleCreate} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>League Name</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Office Bracket Busters"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scoring</CardTitle>
            <p className="text-sm text-muted-foreground">Points awarded for each correct prediction.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.entries(settings.scoring) as [keyof LeagueSettings["scoring"], number][]).map(
              ([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <Label htmlFor={`scoring-${key}`}>{SCORING_LABELS[key]}</Label>
                  <Input
                    id={`scoring-${key}`}
                    type="number"
                    className="w-20 text-center"
                    value={value}
                    onChange={(e) => updateScoring(key, parseInt(e.target.value) || 0)}
                    min={0}
                  />
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optional Features</CardTitle>
            <p className="text-sm text-muted-foreground">Toggle which prediction categories this league uses.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.entries(settings.features) as [keyof LeagueSettings["features"], boolean][]).map(
              ([key, enabled]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{FEATURE_LABELS[key]}</Label>
                  <button
                    type="button"
                    onClick={() => toggleFeature(key)}
                    aria-pressed={enabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create League"}
        </Button>
      </form>
    </div>
  );
}
