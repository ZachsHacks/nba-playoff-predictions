"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LeagueCard } from "@/components/league-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { League } from "@/lib/types";

type Membership = { league_id: string; total_score: number };
type LeagueWithCount = League & { member_count: number };

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState<LeagueWithCount[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [hasOpenSeries, setHasOpenSeries] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setUserId(user.id);

      const { data: membershipData } = await supabase
        .from("league_members")
        .select("league_id, total_score")
        .eq("user_id", user.id);

      const membershipList = (membershipData ?? []) as Membership[];
      setMemberships(membershipList);

      const leagueIds = membershipList.map((m) => m.league_id);

      let leagueList: LeagueWithCount[] = [];
      if (leagueIds.length > 0) {
        const { data } = await supabase
          .from("leagues")
          .select("*, league_members(count)")
          .in("id", leagueIds);

        leagueList = (data ?? []).map((l) => ({
          ...l,
          member_count: l.league_members?.[0]?.count ?? 0,
        }));
      }
      setLeagues(leagueList);

      const { data: openSeries } = await supabase
        .from("series")
        .select("id")
        .in("status", ["upcoming", "active"]);

      setHasOpenSeries((openSeries?.length ?? 0) > 0);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Leagues</h1>
        <div className="flex gap-2">
          <Link href="/leagues/join">
            <Button variant="outline">Join League</Button>
          </Link>
          <Link href="/leagues/create">
            <Button>Create League</Button>
          </Link>
        </div>
      </div>

      {hasOpenSeries && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          New series matchups are available for predictions!
        </div>
      )}

      {leagues.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No leagues yet.</p>
          <p>Create one or join with an invite code.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leagues.map((league) => {
            const membership = memberships.find((m) => m.league_id === league.id);
            return (
              <LeagueCard
                key={league.id}
                league={league}
                memberCount={league.member_count}
                userScore={membership?.total_score ?? 0}
                isCommissioner={league.commissioner_id === userId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
