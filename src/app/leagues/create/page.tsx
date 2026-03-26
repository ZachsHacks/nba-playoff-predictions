"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateLeaguePage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setLoading(false); return; }

    const inviteCode = generateInviteCode();

    const { data: league, error: createError } = await supabase
      .from("leagues")
      .insert({ name, invite_code: inviteCode, commissioner_id: user.id })
      .select()
      .single();

    if (createError) {
      if (createError.code === "23505") {
        const { data: retry, error: retryError } = await supabase
          .from("leagues")
          .insert({ name, invite_code: generateInviteCode(), commissioner_id: user.id })
          .select()
          .single();
        if (retryError) { setError(retryError.message); setLoading(false); return; }
        await supabase.from("league_members").insert({ league_id: retry.id, user_id: user.id });
        router.push(`/leagues/${retry.id}`);
        return;
      }
      setError(createError.message);
      setLoading(false);
      return;
    }

    await supabase.from("league_members").insert({ league_id: league.id, user_id: user.id });
    router.push(`/leagues/${league.id}`);
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create a League</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">League Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Office Bracket Busters"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create League"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
