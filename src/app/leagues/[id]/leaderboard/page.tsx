import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("id", leagueId)
    .single();

  const { data: members } = await supabase
    .from("league_members")
    .select("user_id, total_score, profiles(display_name)")
    .eq("league_id", leagueId)
    .order("total_score", { ascending: false });

  const entries = (members ?? []).map((m: { user_id: string; total_score: number; profiles: { display_name: string }[] | { display_name: string } | null }, i: number) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      rank: i + 1,
      display_name: profile?.display_name ?? "Unknown",
      total_score: m.total_score,
      user_id: m.user_id,
    };
  });

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{league?.name} - Leaderboard</h1>
        <Link href={`/leagues/${leagueId}`}>
          <Button variant="outline" size="sm">Back to League</Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <LeaderboardTable entries={entries} currentUserId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
