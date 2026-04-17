"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { ROUND_LABELS, type RoundNumber, type Series } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROUND_ORDER: RoundNumber[] = [1, 2, 3, 4];
const SCORES = ["4-0", "4-1", "4-2", "4-3"] as const;
const STATUSES = ["upcoming", "active", "complete"] as const;
const CONFERENCES = ["East", "West", "Finals"] as const;

type RowState = Series & {
  dirty: boolean;
  saving: boolean;
  message: string;
};

function toLocalInput(utc: string | null): string {
  if (!utc) return "";
  const d = new Date(utc);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

export default function AdminSeriesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState<RowState[]>([]);
  const [cronStatus, setCronStatus] = useState("");
  const [newRow, setNewRow] = useState({
    round: 1 as RoundNumber,
    conference: "East" as (typeof CONFERENCES)[number],
    team_a: "",
    team_b: "",
    series_start_time: "",
    external_id: "",
  });
  const [addingNew, setAddingNew] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (!isAdminEmail(email)) {
        router.push("/dashboard");
        return;
      }
      setAuthorized(true);

      const { data: series } = await supabase
        .from("series")
        .select("*")
        .order("round", { ascending: true })
        .order("conference", { ascending: true });

      setRows(((series ?? []) as Series[]).map((s) => ({
        ...s,
        dirty: false,
        saving: false,
        message: "",
      })));
      setLoading(false);
    }
    load();
  }, []);

  const groupedByRound = useMemo(() => {
    const groups: Record<number, RowState[]> = {};
    for (const r of rows) {
      (groups[r.round] ??= []).push(r);
    }
    return groups;
  }, [rows]);

  function patchRow(id: string, patch: Partial<RowState>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, dirty: true, message: "" } : r)));
  }

  async function saveRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, saving: true, message: "Saving..." } : r)));

    const { error } = await supabase
      .from("series")
      .update({
        round: row.round,
        conference: row.conference,
        team_a: row.team_a,
        team_b: row.team_b,
        series_start_time: row.series_start_time,
        status: row.status,
        winner: row.winner,
        final_score: row.final_score,
        finals_mvp: row.finals_mvp,
      })
      .eq("id", id);

    if (error) {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, saving: false, message: `Error: ${error.message}` } : r)));
      return;
    }

    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, saving: false, dirty: false, message: "Saved ✓" } : r)));
    setTimeout(() => {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, message: "" } : r)));
    }, 2500);
  }

  async function deleteRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (!confirm(`Delete series "${row.team_a} vs ${row.team_b}"? Predictions on it will be removed too.`)) return;
    const { error } = await supabase.from("series").delete().eq("id", id);
    if (error) { alert(`Couldn't delete: ${error.message}`); return; }
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  async function addSeries(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!newRow.team_a || !newRow.team_b || !newRow.external_id) {
      setAddError("Fill in both team names and an external_id.");
      return;
    }
    setAddingNew(true);

    const { data, error } = await supabase
      .from("series")
      .insert({
        external_id: newRow.external_id,
        round: newRow.round,
        conference: newRow.conference,
        team_a: newRow.team_a,
        team_b: newRow.team_b,
        series_start_time: newRow.series_start_time || null,
        status: "upcoming",
      })
      .select()
      .single();

    if (error) {
      setAddError(error.message);
      setAddingNew(false);
      return;
    }

    setRows((rs) => [...rs, { ...(data as Series), dirty: false, saving: false, message: "Added ✓" }]);
    setNewRow({ round: 1, conference: "East", team_a: "", team_b: "", series_start_time: "", external_id: "" });
    setAddingNew(false);
  }

  async function triggerScoring() {
    setCronStatus("Triggering...");
    try {
      const res = await fetch("/api/cron/update-nba", {
        headers: { authorization: `Bearer ${prompt("Enter CRON_SECRET to trigger scoring:") ?? ""}` },
      });
      const body = await res.text();
      setCronStatus(`Done: HTTP ${res.status}. ${body.slice(0, 300)}`);
    } catch (err) {
      setCronStatus(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!authorized) return null;

  return (
    <div className="container mx-auto max-w-5xl p-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin: Series</h1>
        <p className="text-sm text-muted-foreground">
          Update matchups and mark series complete. When you set status to <strong>complete</strong> and save,
          the scoring engine runs for every league on the next cron (6am UTC daily) — or click &ldquo;Trigger Scoring&rdquo; below to run it now.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={triggerScoring} variant="outline">
            Trigger Scoring Now
          </Button>
          <span className="text-sm text-muted-foreground">{cronStatus}</span>
        </CardContent>
      </Card>

      {ROUND_ORDER.map((round) => (
        <div key={round} className="space-y-3">
          <h2 className="text-lg font-semibold">{ROUND_LABELS[round]}</h2>
          {(groupedByRound[round] ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No series yet in this round.</p>
          )}
          {(groupedByRound[round] ?? []).map((row) => (
            <Card key={row.id}>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Team A</Label>
                    <Input value={row.team_a} onChange={(e) => patchRow(row.id, { team_a: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Team B</Label>
                    <Input value={row.team_b} onChange={(e) => patchRow(row.id, { team_b: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Conference</Label>
                    <select
                      value={row.conference}
                      onChange={(e) => patchRow(row.id, { conference: e.target.value as Series["conference"] })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      {CONFERENCES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Start Time (your local time)</Label>
                    <Input
                      type="datetime-local"
                      value={toLocalInput(row.series_start_time)}
                      onChange={(e) => patchRow(row.id, { series_start_time: fromLocalInput(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <select
                      value={row.status}
                      onChange={(e) => patchRow(row.id, { status: e.target.value as Series["status"] })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Winner</Label>
                    <select
                      value={row.winner ?? ""}
                      onChange={(e) => patchRow(row.id, { winner: e.target.value || null })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="">Not set</option>
                      <option value={row.team_a}>{row.team_a}</option>
                      <option value={row.team_b}>{row.team_b}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Final Score</Label>
                    <select
                      value={row.final_score ?? ""}
                      onChange={(e) => patchRow(row.id, { final_score: e.target.value || null })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="">Not set</option>
                      {SCORES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {row.round === 4 && (
                    <div className="space-y-1 md:col-span-2">
                      <Label>Finals MVP</Label>
                      <Input
                        value={row.finals_mvp ?? ""}
                        onChange={(e) => patchRow(row.id, { finals_mvp: e.target.value || null })}
                        placeholder="e.g. Jayson Tatum"
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-muted-foreground">
                    external_id: <code>{row.external_id}</code>
                  </span>
                  <div className="flex items-center gap-2">
                    {row.message && <span className="text-xs text-muted-foreground">{row.message}</span>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRow(row.id)}
                      className="text-destructive"
                    >
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveRow(row.id)}
                      disabled={row.saving || !row.dirty}
                    >
                      {row.saving ? "Saving..." : row.dirty ? "Save" : "Saved"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      <Card>
        <CardHeader><CardTitle>Add New Series</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addSeries} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>external_id (unique, e.g. 2026-manual-east-r2-celtics-vs-knicks)</Label>
              <Input value={newRow.external_id} onChange={(e) => setNewRow({ ...newRow, external_id: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Round</Label>
              <select
                value={newRow.round}
                onChange={(e) => setNewRow({ ...newRow, round: Number(e.target.value) as RoundNumber })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {ROUND_ORDER.map((r) => <option key={r} value={r}>{ROUND_LABELS[r]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Conference</Label>
              <select
                value={newRow.conference}
                onChange={(e) => setNewRow({ ...newRow, conference: e.target.value as (typeof CONFERENCES)[number] })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {CONFERENCES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Start Time (your local time)</Label>
              <Input
                type="datetime-local"
                value={newRow.series_start_time}
                onChange={(e) => setNewRow({ ...newRow, series_start_time: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Team A</Label>
              <Input value={newRow.team_a} onChange={(e) => setNewRow({ ...newRow, team_a: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Team B</Label>
              <Input value={newRow.team_b} onChange={(e) => setNewRow({ ...newRow, team_b: e.target.value })} required />
            </div>
            <div className="md:col-span-2 flex items-center justify-between gap-2">
              {addError && <p className="text-sm text-destructive">{addError}</p>}
              <Button type="submit" disabled={addingNew}>
                {addingNew ? "Adding..." : "Add Series"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
