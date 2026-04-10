"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SeriesCard } from "@/components/series-card";
import { InviteCodeDisplay } from "@/components/invite-code-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import type { League, LeagueMember, Series, Prediction } from "@/lib/types";

export default function LeaguePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<League | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [seriesByRound, setSeriesByRound] = useState<Record<number, Series[]>>({});
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [predictionMap, setPredictionMap] = useState<Map<string, Prediction>>(new Map());
  const [topMembers, setTopMembers] = useState<(LeagueMember & { profiles: { display_name: string } })[]>([]);

  const roundNames: Record<number, string> = {
    1: "First Round",
    2: "Conference Semis",
    3: "Conference Finals",
    4: "NBA Finals",
  };

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setUserId(user.id);

      const { data: leagueData } = await supabase
        .from("leagues")
        .select("*")
        .eq("id", id)
        .single();

      if (!leagueData) { router.push("/dashboard"); return; }
      setLeague(leagueData as League);
      setIsCommissioner((leagueData as League).commissioner_id === user.id);

      const { data: membership } = await supabase
        .from("league_members")
        .select("*")
        .eq("league_id", id)
        .eq("user_id", user.id)
        .single();

      if (!membership) { router.push("/dashboard"); return; }

      const { data: allSeries } = await supabase
        .from("series")
        .select("*")
        .order("round", { ascending: true })
        .order("conference", { ascending: true });

      const { data: predictions } = await supabase
        .from("predictions")
        .select("*")
        .eq("league_id", id)
        .eq("user_id", user.id);

      const { data: topMembersData } = await supabase
        .from("league_members")
        .select("*, profiles(display_name)")
        .eq("league_id", id)
        .order("total_score", { ascending: false })
        .limit(5);

      const series = (allSeries ?? []) as Series[];
      setSeriesList(series);

      const pMap = new Map(
        (predictions ?? []).map((p: Prediction) => [p.series_id, p])
      );
      setPredictionMap(pMap);

      const byRound = series.reduce((acc, s) => {
        if (!acc[s.round]) acc[s.round] = [];
        acc[s.round].push(s);
        return acc;
      }, {} as Record<number, Series[]>);
      setSeriesByRound(byRound);

      setTopMembers((topMembersData ?? []) as (LeagueMember & { profiles: { display_name: string } })[]);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!league) return null;

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{league.name}</h1>
        <div className="flex items-center gap-2">
          {isCommissioner && (
            <Link href={`/leagues/${id}/settings`}>
              <Button variant="outline" size="sm">Settings</Button>
            </Link>
          )}
          <Link href={`/leagues/${id}/leaderboard`}>
            <Button variant="outline" size="sm">Leaderboard</Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Invite code:</span>
        <InviteCodeDisplay code={league.invite_code} />
      </div>

      <Link href={`/leagues/${id}/pre-playoff`}>
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Pre-Playoff Predictions</p>
                <p className="text-sm text-muted-foreground">Conference champs, NBA champion, Finals MVP</p>
              </div>
              <Button size="sm" variant="outline">View</Button>
            </div>
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 5</CardTitle>
        </CardHeader>
        <CardContent>
          {topMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scores yet</p>
          ) : (
            <div className="space-y-1">
              {topMembers.map((m, i) => (
                <div key={m.user_id} className="flex justify-between text-sm">
                  <span>{i + 1}. {m.profiles?.display_name ?? "Unknown"}</span>
                  <span className="font-mono">{m.total_score} pts</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {Object.entries(seriesByRound)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([round, series]) => (
          <div key={round} className="space-y-3">
            <h2 className="text-lg font-semibold">{roundNames[Number(round)] ?? `Round ${round}`}</h2>
            {series.map((s) => (
              <SeriesCard
                key={s.id}
                series={s}
                prediction={predictionMap.get(s.id) ?? null}
                leagueId={id}
              />
            ))}
          </div>
        ))}

      {seriesList.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No playoff series yet. They will appear here once matchups are set.</p>
        </div>
      )}
    </div>
  );
}
