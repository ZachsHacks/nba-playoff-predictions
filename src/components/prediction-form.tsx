"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Series, Prediction, SeriesScore } from "@/lib/types";

type PredictionFormProps = {
  series: Series;
  leagueId: string;
  existingPrediction: Prediction | null;
  locked: boolean;
};

const SCORES: SeriesScore[] = ["4-0", "4-1", "4-2", "4-3"];

export function PredictionForm({ series, leagueId, existingPrediction, locked }: PredictionFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [winner, setWinner] = useState(existingPrediction?.predicted_winner ?? "");
  const [score, setScore] = useState<SeriesScore | "">(
    (existingPrediction?.predicted_score as SeriesScore) ?? ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winner || !score) { setError("Pick a winner and a score"); return; }
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setLoading(false); return; }

    const payload = {
      user_id: user.id,
      league_id: leagueId,
      series_id: series.id,
      predicted_winner: winner,
      predicted_score: score,
      updated_at: new Date().toISOString(),
    };

    if (existingPrediction) {
      const { error: updateError } = await supabase
        .from("predictions")
        .update(payload)
        .eq("id", existingPrediction.id);
      if (updateError) { setError(updateError.message); setLoading(false); return; }
    } else {
      const { error: insertError } = await supabase
        .from("predictions")
        .insert(payload);
      if (insertError) { setError(insertError.message); setLoading(false); return; }
    }

    router.push(`/leagues/${leagueId}`);
    router.refresh();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {series.team_a} vs {series.team_b}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Round {series.round} - {series.conference}
        </p>
      </CardHeader>
      <CardContent>
        {locked ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Predictions are locked for this series.</p>
            {existingPrediction && (
              <div className="mt-4">
                <p className="font-medium">Your pick: {existingPrediction.predicted_winner}</p>
                <p className="text-sm text-muted-foreground">in {existingPrediction.predicted_score}</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Series Winner</Label>
              <div className="grid grid-cols-2 gap-3">
                {[series.team_a, series.team_b].map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => setWinner(team)}
                    className={`rounded-lg border-2 p-4 text-center font-semibold transition-colors ${
                      winner === team
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Series Score</Label>
              <div className="grid grid-cols-4 gap-2">
                {SCORES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScore(s)}
                    className={`rounded-lg border-2 p-3 text-center font-mono transition-colors ${
                      score === s
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Saving..."
                : existingPrediction
                ? "Update Prediction"
                : "Submit Prediction"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
