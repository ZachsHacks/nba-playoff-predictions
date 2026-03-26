import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { League } from "@/lib/types";

type LeagueCardProps = {
  league: League;
  memberCount: number;
  userScore: number;
  isCommissioner: boolean;
};

export function LeagueCard({ league, memberCount, userScore, isCommissioner }: LeagueCardProps) {
  return (
    <Link href={`/leagues/${league.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{league.name}</CardTitle>
            {isCommissioner && <Badge variant="secondary">Commissioner</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{memberCount} members</span>
            <span>Your score: {userScore}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
