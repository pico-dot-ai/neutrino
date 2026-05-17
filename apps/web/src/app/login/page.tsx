import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage(props: {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff,#f1f5fb)] px-6 py-12 sm:px-10 sm:py-20">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-border/90 bg-white/85 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Neutrino Admin Access
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Sign in to the developer console</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            App admin users can register OAuth apps, publish internal capabilities,
            and manage platform credentials.
          </p>
          <div className="mt-8">
            <LoginForm
              initialError={
                searchParams.error === "forbidden"
                  ? "Your account is authenticated but does not meet app admin eligibility requirements."
                  : undefined
              }
              nextPath={searchParams.next}
            />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Need the public overview first? <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/">Back to landing page</Link>
          </p>
        </section>
        <aside className="rounded-3xl border border-border/80 bg-panel/85 p-8">
          <h2 className="text-lg font-semibold tracking-tight">Eligibility checks</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-muted-foreground">
            <li>Role includes <code>app_admin</code></li>
            <li>User belongs to picoAI org</li>
            <li>Email uses <code>@pico.ai</code> bootstrap domain</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
