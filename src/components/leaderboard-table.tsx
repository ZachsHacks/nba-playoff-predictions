import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LeaderboardEntry = {
  rank: number;
  display_name: string;
  total_score: number;
  user_id: string;
};

export function LeaderboardTable({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="text-right">Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow
            key={entry.user_id}
            className={entry.user_id === currentUserId ? "bg-primary/5 font-medium" : ""}
          >
            <TableCell className="font-mono">{entry.rank}</TableCell>
            <TableCell>
              {entry.display_name}
              {entry.user_id === currentUserId && (
                <span className="ml-2 text-xs text-muted-foreground">(you)</span>
              )}
            </TableCell>
            <TableCell className="text-right font-mono">{entry.total_score}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
