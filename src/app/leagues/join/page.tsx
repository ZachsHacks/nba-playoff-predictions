"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JoinLeaguePage() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setLoading(false); return; }

    const { data: league, error: findError } = await supabase
      .from("leagues")
      .select("id")
      .eq("invite_code", code.toUpperCase().trim())
      .single();

    if (findError || !league) {
      setError("Invalid invite code. Check with your league commissioner.");
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("league_members")
      .select("league_id")
      .eq("league_id", league.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      router.push(`/leagues/${league.id}`);
      return;
    }

    const { error: joinError } = await supabase
      .from("league_members")
      .insert({ league_id: league.id, user_id: user.id });

    if (joinError) {
      setError(joinError.message);
      setLoading(false);
      return;
    }

    router.push(`/leagues/${league.id}`);
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join a League</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Invite Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))
                }
                placeholder="e.g. SHABBOS"
                maxLength={10}
                className="uppercase tracking-widest text-center text-lg"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Joining..." : "Join League"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
