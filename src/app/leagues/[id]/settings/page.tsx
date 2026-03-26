"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueSettings } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;
  const supabase = createClient();

  const [settings, setSettings] = useState<LeagueSettings | null>(null);
  const [leagueName, setLeagueName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: league } = await supabase
        .from("leagues")
        .select("name, settings, commissioner_id")
        .eq("id", leagueId)
        .single();

      if (!league) { router.push("/dashboard"); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== league.commissioner_id) {
        router.push(`/leagues/${leagueId}`);
        return;
      }

      setLeagueName(league.name);
      setSettings(league.settings as LeagueSettings);
      setLoading(false);
    }
    load();
  }, [leagueId, router, supabase]);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("leagues")
      .update({ name: leagueName, settings })
      .eq("id", leagueId);

    if (updateError) { setError(updateError.message); setSaving(false); return; }

    router.push(`/leagues/${leagueId}`);
    router.refresh();
  };

  if (loading || !settings) return <div className="p-8 text-center">Loading...</div>;

  const updateScoring = (key: keyof LeagueSettings["scoring"], value: number) => {
    setSettings({ ...settings, scoring: { ...settings.scoring, [key]: value } });
  };

  const toggleFeature = (key: keyof LeagueSettings["features"]) => {
    setSettings({ ...settings, features: { ...settings.features, [key]: !settings.features[key] } });
  };

  return (
    <div className="container mx-auto max-w-xl p-4 space-y-6">
      <h1 className="text-2xl font-bold">League Settings</h1>

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">League Name</Label>
            <Input id="name" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Scoring</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(Object.entries(settings.scoring) as [keyof LeagueSettings["scoring"], number][]).map(
            ([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
                <Input
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
        <CardHeader><CardTitle>Optional Features</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(Object.entries(settings.features) as [keyof LeagueSettings["features"], boolean][]).map(
            ([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
                <button
                  type="button"
                  onClick={() => toggleFeature(key)}
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
    </div>
  );
}
