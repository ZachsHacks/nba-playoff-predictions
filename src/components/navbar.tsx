"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href={user ? "/dashboard" : "/"} className="text-lg font-bold">
          Playoff Predictions
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Log In</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
