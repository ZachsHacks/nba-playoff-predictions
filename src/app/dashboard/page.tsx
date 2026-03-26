import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeagueCard } from "@/components/league-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { League } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, total_score")
    .eq("user_id", user.id);

  const leagueIds = memberships?.map((m) => m.league_id) ?? [];

  let leagues: (League & { member_count: number })[] = [];
  if (leagueIds.length > 0) {
    const { data } = await supabase
      .from("leagues")
      .select("*, league_members(count)")
      .in("id", leagueIds);

    leagues = (data ?? []).map((l) => ({
      ...l,
      member_count: l.league_members?.[0]?.count ?? 0,
    }));
  }

  const { data: openSeries } = await supabase
    .from("series")
    .select("id")
    .in("status", ["upcoming", "active"]);

  const hasOpenSeries = (openSeries?.length ?? 0) > 0;

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
            const membership = memberships?.find((m) => m.league_id === league.id);
            return (
              <LeagueCard
                key={league.id}
                league={league}
                memberCount={league.member_count}
                userScore={membership?.total_score ?? 0}
                isCommissioner={league.commissioner_id === user.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
