"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUND_LABELS, type LeagueSettings, type RoundNumber } from "@/lib/types";

const FEATURE_LABELS: Record<keyof LeagueSettings["features"], string> = {
  conference_champions: "Conference champion predictions",
  nba_champion: "NBA champion prediction",
  finals_mvp: "Finals MVP prediction",
  finals_game_predictions: "Finals game-by-game predictions",
};

const ROUND_ORDER: RoundNumber[] = [1, 2, 3, 4];

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;
  const supabase = createClient();

  const [settings, setSettings] = useState<LeagueSettings | null>(null);
  const [leagueName, setLeagueName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: league } = await supabase
        .from("leagues")
        .select("name, invite_code, settings, commissioner_id")
        .eq("id", leagueId)
        .single();

      if (!league) {
        router.push("/dashboard");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || user.id !== league.commissioner_id) {
        router.push(`/leagues/${leagueId}`);
        return;
      }

      setLeagueName(league.name);
      setInviteCode(league.invite_code);
      setSettings(league.settings as LeagueSettings);
      setLoading(false);
    }
    load();
  }, [leagueId, router, supabase]);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    const normalizedCode = inviteCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    if (normalizedCode.length < 4) {
      setError("Invite code must be at least 4 letters/numbers.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("leagues")
      .update({ name: leagueName, invite_code: normalizedCode, settings })
      .eq("id", leagueId);

    if (updateError) {
      if (updateError.code === "23505") {
        setError(`Invite code "${normalizedCode}" is taken. Pick a different code.`);
      } else {
        setError(updateError.message);
      }
      setSaving(false);
      return;
    }

    router.push(`/leagues/${leagueId}`);
    router.refresh();
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${leagueName}"? This permanently removes the league and all predictions. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("leagues")
      .delete()
      .eq("id", leagueId);

    if (deleteError) {
      setError(`Couldn't delete: ${deleteError.message}`);
      setDeleting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  if (loading || !settings) return <div className="p-8 text-center">Loading...</div>;

  const updateRoundScoring = (
    round: RoundNumber,
    key: "series_winner" | "series_score_bonus",
    value: number
  ) => {
    setSettings({
      ...settings,
      scoring: {
        ...settings.scoring,
        rounds: {
          ...settings.scoring.rounds,
          [round]: { ...settings.scoring.rounds[round], [key]: value },
        },
      },
    });
  };

  const updateExtraScoring = (
    key: "conference_champion" | "nba_champion" | "finals_mvp" | "finals_game_pick",
    value: number
  ) => {
    setSettings({
      ...settings,
      scoring: { ...settings.scoring, [key]: value },
    });
  };

  const toggleFeature = (key: keyof LeagueSettings["features"]) => {
    setSettings({
      ...settings,
      features: { ...settings.features, [key]: !settings.features[key] },
    });
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">League Settings</h1>

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">League Name</Label>
            <Input id="name" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite">Invite Code</Label>
            <Input
              id="invite"
              value={inviteCode}
              onChange={(e) =>
                setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))
              }
              className="uppercase tracking-widest"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              4-10 letters/numbers. Anyone with this code can join the league.
            </p>
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
            <div key={round} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4">
              <Label className="font-medium">{ROUND_LABELS[round]}</Label>
              <Input
                type="number"
                min={0}
                className="w-20 text-center"
                value={settings.scoring.rounds[round]?.series_winner ?? 0}
                onChange={(e) =>
                  updateRoundScoring(round, "series_winner", parseInt(e.target.value) || 0)
                }
              />
              <Input
                type="number"
                min={0}
                className="w-20 text-center"
                value={settings.scoring.rounds[round]?.series_score_bonus ?? 0}
                onChange={(e) =>
                  updateRoundScoring(round, "series_score_bonus", parseInt(e.target.value) || 0)
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pre-Playoff Bonus Points</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="cc">Correct conference champion</Label>
            <Input
              id="cc"
              type="number"
              min={0}
              className="w-20 text-center"
              value={settings.scoring.conference_champion}
              onChange={(e) => updateExtraScoring("conference_champion", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="nba_champ">Correct NBA champion</Label>
            <Input
              id="nba_champ"
              type="number"
              min={0}
              className="w-20 text-center"
              value={settings.scoring.nba_champion ?? 50}
              onChange={(e) => updateExtraScoring("nba_champion", parseInt(e.target.value) || 0)}
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
              onChange={(e) => updateExtraScoring("finals_mvp", parseInt(e.target.value) || 0)}
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
              onChange={(e) => updateExtraScoring("finals_game_pick", parseInt(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Optional Features</CardTitle></CardHeader>
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
      <Button onClick={handleSave} className="w-full" disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <p className="text-sm text-muted-foreground">
            Deleting the league removes it for everyone and wipes all predictions. This cannot be undone.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete League"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
