"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_LEAGUE_SETTINGS,
  ROUND_LABELS,
  type LeagueSettings,
  type RoundNumber,
} from "@/lib/types";

const FEATURE_LABELS: Record<keyof LeagueSettings["features"], string> = {
  conference_champions: "Conference champion predictions",
  nba_champion: "NBA champion prediction",
  finals_mvp: "Finals MVP prediction",
  finals_game_predictions: "Finals game-by-game predictions",
};

const ROUND_ORDER: RoundNumber[] = [1, 2, 3, 4];

export default function CreateLeaguePage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [settings, setSettings] = useState<LeagueSettings>(() =>
    JSON.parse(JSON.stringify(DEFAULT_LEAGUE_SETTINGS))
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const updateRoundScoring = (
    round: RoundNumber,
    key: "series_winner" | "series_score_bonus",
    value: number
  ) => {
    setSettings((s) => ({
      ...s,
      scoring: {
        ...s.scoring,
        rounds: {
          ...s.scoring.rounds,
          [round]: { ...s.scoring.rounds[round], [key]: value },
        },
      },
    }));
  };

  const updateExtraScoring = (
    key: "conference_champion" | "nba_champion" | "finals_mvp" | "finals_game_pick",
    value: number
  ) => {
    setSettings((s) => ({
      ...s,
      scoring: { ...s.scoring, [key]: value },
    }));
  };

  const toggleFeature = (key: keyof LeagueSettings["features"]) => {
    setSettings((s) => ({
      ...s,
      features: { ...s.features, [key]: !s.features[key] },
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("Checking your session...");
    setLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`Auth error: ${authError.message}`);
      if (!user) throw new Error("You need to sign in again before creating a league.");

      setStatus("Creating your league...");

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

      if (createError) {
        throw new Error(`Couldn't save league: ${createError.message} (code ${createError.code})`);
      }
      if (!league) {
        throw new Error("League insert returned no data.");
      }

      setStatus("Adding you as the commissioner...");

      const { error: memberError } = await supabase
        .from("league_members")
        .insert({ league_id: league.id, user_id: user.id });

      if (memberError) {
        throw new Error(`League saved but couldn't add you as a member: ${memberError.message}`);
      }

      setStatus("Redirecting to your new league...");

      // Belt and suspenders: try router first, fall back to hard navigation
      const target = `/leagues/${league.id}`;
      router.push(target);
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname !== target) {
          window.location.assign(target);
        }
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setStatus("");
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create a League</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize scoring for each round. You&apos;ll get an invite code to share after you create the league.
        </p>
      </div>

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
            <CardTitle>Scoring by Round</CardTitle>
            <p className="text-sm text-muted-foreground">
              Points for picking the correct series winner, plus bonus points if you also nail the number of games.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-xs font-semibold text-muted-foreground">
              <div></div>
              <div className="w-20 text-center">Correct winner</div>
              <div className="w-20 text-center">Game prediction bonus</div>
            </div>
            {ROUND_ORDER.map((round) => (
              <div
                key={round}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4"
              >
                <Label className="font-medium">{ROUND_LABELS[round]}</Label>
                <Input
                  type="number"
                  min={0}
                  className="w-20 text-center"
                  value={settings.scoring.rounds[round].series_winner}
                  onChange={(e) =>
                    updateRoundScoring(round, "series_winner", parseInt(e.target.value) || 0)
                  }
                />
                <Input
                  type="number"
                  min={0}
                  className="w-20 text-center"
                  value={settings.scoring.rounds[round].series_score_bonus}
                  onChange={(e) =>
                    updateRoundScoring(round, "series_score_bonus", parseInt(e.target.value) || 0)
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pre-Playoff Bonus Points</CardTitle>
            <p className="text-sm text-muted-foreground">
              Extra points for picking the eventual champion or Finals MVP before playoffs start.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="cc">Correct conference champion</Label>
              <Input
                id="cc"
                type="number"
                min={0}
                className="w-20 text-center"
                value={settings.scoring.conference_champion}
                onChange={(e) =>
                  updateExtraScoring("conference_champion", parseInt(e.target.value) || 0)
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="nba_champ">Correct NBA champion</Label>
              <Input
                id="nba_champ"
                type="number"
                min={0}
                className="w-20 text-center"
                value={settings.scoring.nba_champion}
                onChange={(e) =>
                  updateExtraScoring("nba_champion", parseInt(e.target.value) || 0)
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="mvp">Correct Finals MVP</Label>
              <Input
                id="mvp"
                type="number"
                min={0}
                className="w-20 text-center"
                value={settings.scoring.finals_mvp}
                onChange={(e) =>
                  updateExtraScoring("finals_mvp", parseInt(e.target.value) || 0)
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="fgp">Correct Finals game pick (per game)</Label>
              <Input
                id="fgp"
                type="number"
                min={0}
                className="w-20 text-center"
                value={settings.scoring.finals_game_pick}
                onChange={(e) =>
                  updateExtraScoring("finals_game_pick", parseInt(e.target.value) || 0)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optional Features</CardTitle>
            <p className="text-sm text-muted-foreground">
              Turn each category on or off for your league.
            </p>
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

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive mt-1 break-words">{error}</p>
          </div>
        )}

        {status && !error && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm text-foreground">{status}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create League & Get Invite Code"}
        </Button>
      </form>
    </div>
  );
}
