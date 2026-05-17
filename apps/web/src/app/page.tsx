import Link from "next/link";
import { Badge, Button } from "@neutrino/ui";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(86,127,210,0.18),transparent_48%),linear-gradient(180deg,#fbfcff,#f1f5fb)] text-foreground">
      <section className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 sm:px-10 sm:py-24">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">
            Neutrino Platform
          </p>
          <Link href="/login">
            <Button className="rounded-full px-5">Login</Button>
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div className="space-y-6">
            <Badge className="rounded-full border-border bg-background/80 text-foreground">
              Internal API-First Platform
            </Badge>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Build independent apps fast while sharing one governed Neutrino backend.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Register OAuth apps, publish internal capabilities, and keep deployment
              ownership in each app repo. Neutrino handles identity, policy, and
              usage governance with <code>pico_app_id</code> as the platform-wide key.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login">
                <Button className="h-11 rounded-full px-6">Go to Login</Button>
              </Link>
              <Link href="/admin/debug/chat">
                <Button
                  className="h-11 rounded-full border-border bg-background text-foreground hover:bg-secondary"
                  variant="secondary"
                >
                  Debug Chat (Admin)
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-border/90 bg-background/85 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">What ships in v1</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
              <li>OAuth app registration and credential lifecycle</li>
              <li>Internal capability registry for provider apps</li>
              <li>Admin-gated control plane with session-based login</li>
              <li>Starter container for launching new app repos</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
