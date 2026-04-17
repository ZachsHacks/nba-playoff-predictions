"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TeamNameEditorProps = {
  leagueId: string;
  userId: string;
  initialTeamName: string | null;
  fallbackName: string;
};

export function TeamNameEditor({
  leagueId,
  userId,
  initialTeamName,
  fallbackName,
}: TeamNameEditorProps) {
  const supabase = createClient();
  const [teamName, setTeamName] = useState(initialTeamName ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [display, setDisplay] = useState(initialTeamName ?? fallbackName);

  const handleSave = async () => {
    setError("");
    setSaving(true);

    const trimmed = teamName.trim();
    const { error: updateError } = await supabase
      .from("league_members")
      .update({ team_name: trimmed || null })
      .eq("league_id", leagueId)
      .eq("user_id", userId);

    if (updateError) {
      if (updateError.code === "23505") {
        setError("Someone in this league already has that team name. Pick another.");
      } else {
        setError(updateError.message);
      }
      setSaving(false);
      return;
    }

    setDisplay(trimmed || fallbackName);
    setEditing(false);
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your Team Name</CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Brooklyn Brackets"
                maxLength={40}
                autoFocus
              />
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTeamName(initialTeamName ?? "");
                  setEditing(false);
                  setError("");
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Leave blank to use your display name on the leaderboard.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-medium">{display}</span>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
