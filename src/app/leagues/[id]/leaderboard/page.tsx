"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type LeaderboardEntry = {
  rank: number;
  display_name: string;
  total_score: number;
  user_id: string;
};

export default function LeaderboardPage() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [leagueName, setLeagueName] = useState<string>("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { router.push("/login"); return; }

      setCurrentUserId(user.id);

      const { data: membership } = await supabase
        .from("league_members")
        .select("league_id")
        .eq("league_id", leagueId)
        .eq("user_id", user.id)
        .single();

      if (!membership) { router.push("/dashboard"); return; }

      const { data: league } = await supabase
        .from("leagues")
        .select("name")
        .eq("id", leagueId)
        .single();

      setLeagueName(league?.name ?? "");

      const { data: members } = await supabase
        .from("league_members")
        .select("user_id, total_score, team_name, profiles(display_name)")
        .eq("league_id", leagueId)
        .order("total_score", { ascending: false });

      const leaderboard = (members ?? []).map((m: { user_id: string; total_score: number; team_name: string | null; profiles: { display_name: string }[] | { display_name: string } | null }, i: number) => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
          rank: i + 1,
          display_name: m.team_name ?? profile?.display_name ?? "Unknown",
          total_score: m.total_score,
          user_id: m.user_id,
        };
      });

      setEntries(leaderboard);
      setLoading(false);
    }
    load();
  }, [leagueId]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{leagueName} - Leaderboard</h1>
        <Link href={`/leagues/${leagueId}`}>
          <Button variant="outline" size="sm">Back to League</Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <LeaderboardTable entries={entries} currentUserId={currentUserId} />
        </CardContent>
      </Card>
    </div>
  );
}
