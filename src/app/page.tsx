import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4">
      {/* Hero */}
      <div className="py-20 text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          NBA Pickems
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Pick the winners. Beat your friends. Build your own playoff league
          with customizable scoring and a real-time leaderboard.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">Log In</Button>
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="py-12 space-y-8">
        <h2 className="text-2xl font-bold text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-3xl font-bold text-primary">1</div>
              <h3 className="font-semibold">Create or Join a League</h3>
              <p className="text-sm text-muted-foreground">
                Start your own league and share the invite code, or join one with a code from a friend.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-3xl font-bold text-primary">2</div>
              <h3 className="font-semibold">Make Your Predictions</h3>
              <p className="text-sm text-muted-foreground">
                Pick the winner and score for each playoff series. Predictions lock 30 minutes before tipoff.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-3xl font-bold text-primary">3</div>
              <h3 className="font-semibold">Climb the Leaderboard</h3>
              <p className="text-sm text-muted-foreground">
                Earn points for correct picks. Bonus points for nailing the exact series score.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features */}
      <div className="py-12 space-y-4 text-center">
        <h2 className="text-2xl font-bold">Features</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
          {[
            "Customizable scoring per league",
            "Conference champion predictions",
            "Finals MVP prediction",
            "Game-by-game Finals predictions",
            "Real-time leaderboard updates",
            "Automatic playoff data updates",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm">
              <span className="text-primary font-bold">+</span>
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
