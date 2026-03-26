"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InviteCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-muted px-2 py-1 text-lg tracking-widest font-mono">
        {code}
      </code>
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}
