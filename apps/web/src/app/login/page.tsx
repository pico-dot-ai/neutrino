import Link from "next/link";
import { Button } from "@neutrino/ui";
import { LoginForm } from "@/components/auth/login-form";
import { HostedLoginFlow } from "@/components/auth/hosted-login-flow";
import { FrostedHeader } from "@/components/design/frosted-header";
import { getAuthPolicyEnv } from "@/lib/config";
import styles from "./login.module.css";

export default async function LoginPage(props: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    flow?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const authEnv = getAuthPolicyEnv();
  const nextPath =
    searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/admin";
  const loginStartHref = `/api/auth/login/start?next=${encodeURIComponent(nextPath)}`;
  const flowId = searchParams.flow;

  return (
    <main className={styles.shell}>
      <FrostedHeader
        brand={{
          href: "/",
          ariaLabel: "Go to picoAI home",
          logoSrc: "/favicon.svg",
          logoWidth: 28,
          logoHeight: 28,
          title: "picoAI"
        }}
        classNames={{
          header: styles.header,
          inner: styles.headerInner,
          brand: styles.brand,
          brandMark: styles.brandMark,
          brandLogo: styles.brandLogo,
          brandCopy: styles.brandCopy,
          brandTitle: styles.brandTitle,
          brandSubtitle: styles.brandSubtitle,
          nav: styles.nav
        }}
      >
        <Link href="/" className={styles.navCta}>
          Back to Main
        </Link>
      </FrostedHeader>
      {authEnv.AUTH_PROVIDER === "local" ? (
        <LoginForm
          initialError={
            searchParams.error === "forbidden"
              ? "Your account is authenticated but does not meet app admin eligibility requirements."
              : undefined
          }
          nextPath={searchParams.next}
        />
      ) : authEnv.ORY_KRATOS_PUBLIC_URL && flowId ? (
        <div className="mx-auto w-full max-w-lg rounded-[1.25rem] border border-white/70 bg-white/70 p-8 shadow-[0_20px_56px_rgba(15,23,42,0.1)] backdrop-blur-xl">
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-normal text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Choose an identity provider to continue.
            </p>
            <HostedLoginFlow kratosPublicUrl={authEnv.ORY_KRATOS_PUBLIC_URL} flowId={flowId} />
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-lg rounded-[1.25rem] border border-white/70 bg-white/70 p-8 shadow-[0_20px_56px_rgba(15,23,42,0.1)] backdrop-blur-xl">
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-normal text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Continue with the hosted identity provider to access the admin console.
            </p>
            <Button asChild className="h-10 rounded-xl px-6 text-sm">
              <Link href={loginStartHref}>Continue</Link>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
