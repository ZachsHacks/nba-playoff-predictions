"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SeriesCard } from "@/components/series-card";
import { InviteCodeDisplay } from "@/components/invite-code-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ROUND_LABELS, type League, type LeagueMember, type RoundNumber, type Series, type Prediction } from "@/lib/types";

const ROUND_ORDER: RoundNumber[] = [1, 2, 3, 4];
const EXPECTED_SERIES_COUNT: Record<RoundNumber, number> = { 1: 8, 2: 4, 3: 2, 4: 1 };

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

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
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

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Invite code</p>
            <p className="text-xs text-muted-foreground">
              Share this code so friends can join your league.
            </p>
          </div>
          <InviteCodeDisplay code={league.invite_code} />
        </CardContent>
      </Card>

      <Link href={`/leagues/${id}/pre-playoff`}>
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Pre-Playoff Predictions</p>
                <p className="text-sm text-muted-foreground">Conference champs + NBA champion. Locks when Round 1 tips off.</p>
              </div>
              <Button size="sm" variant="outline">View</Button>
            </div>
          </CardContent>
        </Card>
      </Link>

      {league.settings.features.finals_mvp && seriesByRound[4]?.[0] && !seriesByRound[4][0].team_a.toLowerCase().startsWith("tbd") && !seriesByRound[4][0].team_b.toLowerCase().startsWith("tbd") && (
        <Link href={`/leagues/${id}/finals-mvp`}>
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Finals MVP Prediction</p>
                  <p className="text-sm text-muted-foreground">
                    {seriesByRound[4][0].team_a} vs {seriesByRound[4][0].team_b}. Locks at Finals Game 1 tipoff.
                  </p>
                </div>
                <Button size="sm" variant="outline">Pick</Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

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

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Bracket</h2>
          <p className="text-sm text-muted-foreground">
            Matchups appear here as they&apos;re set. Predictions lock 30 minutes before each series tips off.
          </p>
        </div>
        {ROUND_ORDER.map((round) => {
          const series = seriesByRound[round] ?? [];
          const expected = EXPECTED_SERIES_COUNT[round];
          const placeholdersNeeded = Math.max(0, expected - series.length);
          return (
            <div key={round} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold">{ROUND_LABELS[round]}</h3>
                <span className="text-xs text-muted-foreground">
                  {series.length}/{expected} matchups set
                </span>
              </div>
              {series.map((s) => (
                <SeriesCard
                  key={s.id}
                  series={s}
                  prediction={predictionMap.get(s.id) ?? null}
                  leagueId={id}
                />
              ))}
              {Array.from({ length: placeholdersNeeded }).map((_, i) => (
                <Card key={`placeholder-${round}-${i}`} className="border-dashed">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    Matchup to be determined
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>

      {seriesList.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Series data auto-updates once NBA playoff matchups are announced.
        </p>
      )}
    </div>
  );
}
