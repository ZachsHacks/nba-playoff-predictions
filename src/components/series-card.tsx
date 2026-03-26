import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeUntilLock, isSeriesLocked } from "@/lib/utils";
import type { Series, Prediction } from "@/lib/types";

type SeriesCardProps = {
  series: Series;
  prediction: Prediction | null;
  leagueId: string;
};

export function SeriesCard({ series, prediction, leagueId }: SeriesCardProps) {
  const locked = isSeriesLocked(series.series_start_time);
  const lockLabel = timeUntilLock(series.series_start_time);

  const statusColor = {
    upcoming: "bg-blue-100 text-blue-800",
    active: "bg-yellow-100 text-yellow-800",
    complete: "bg-green-100 text-green-800",
  }[series.status];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{series.team_a}</span>
              <span className="text-muted-foreground">vs</span>
              <span className="font-semibold">{series.team_b}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className={statusColor}>
                {series.status === "complete"
                  ? `${series.winner} wins ${series.final_score}`
                  : series.status}
              </Badge>
              <span className="text-muted-foreground">
                Round {series.round} - {series.conference}
              </span>
              {!locked && series.status !== "complete" && (
                <span className="text-muted-foreground">Locks in {lockLabel}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            {prediction ? (
              <div className="text-sm">
                <p className="font-medium">{prediction.predicted_winner}</p>
                <p className="text-muted-foreground">in {prediction.predicted_score}</p>
              </div>
            ) : locked || series.status === "complete" ? (
              <Badge variant="secondary">No pick</Badge>
            ) : (
              <Link href={`/leagues/${leagueId}/predict/${series.id}`}>
                <Button size="sm">Predict</Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
