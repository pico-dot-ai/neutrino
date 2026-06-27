import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@neutrino/ui";
import { getAuthPolicyEnv } from "@/lib/config";
import { FrostedHeader } from "@/components/design/frosted-header";
import { authPageCopy, type AuthPageKind } from "./auth-flow-copy";
import { AuthFlowForm } from "./auth-flow-form";
import { LoginForm } from "./login-form";
import styles from "./auth-flow-screen.module.css";

function sanitizeNext(next: string | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}

export async function AuthFlowScreen(props: {
  kind: AuthPageKind;
  searchParams: Promise<{
    flow?: string;
    next?: string;
  }>;
}) {
  const copy = authPageCopy[props.kind];
  const searchParams = await props.searchParams;
  const authEnv = getAuthPolicyEnv();
  const flowId = searchParams.flow;
  const nextPath = sanitizeNext(searchParams.next, "/admin");
  const usesHosted = authEnv.AUTH_PROVIDER === "ory-kratos";

  if (props.kind === "login" && usesHosted && !flowId) {
    redirect(`${copy.startPath}?next=${encodeURIComponent(nextPath)}`);
  }

  if (props.kind !== "login" && usesHosted && !flowId) {
    redirect(copy.startPath);
  }

  let content = null;

  if (props.kind === "login") {
    content = usesHosted && authEnv.ORY_KRATOS_PUBLIC_URL && flowId ? (
      <LoginForm
        kratosFlow={{
          flowId,
          kratosPublicUrl: authEnv.ORY_KRATOS_PUBLIC_URL
        }}
        nextPath={nextPath}
      />
    ) : (
      <LoginForm nextPath={nextPath} />
    );
  } else if (!usesHosted) {
    content = (
      <div className="mx-auto w-full max-w-lg rounded-[1.25rem] border border-white/70 bg-white/70 p-8 shadow-[0_20px_56px_rgba(15,23,42,0.1)] backdrop-blur-xl">
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-normal text-foreground">{copy.localUnavailableTitle}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{copy.localUnavailableDescription}</p>
          <Button asChild className="h-10 rounded-xl px-6 text-sm">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  } else if (authEnv.ORY_KRATOS_PUBLIC_URL && flowId) {
    content = (
      <div className="mx-auto w-full max-w-lg rounded-[1.25rem] border border-white/70 bg-white/70 p-8 shadow-[0_20px_56px_rgba(15,23,42,0.1)] backdrop-blur-xl">
        <div className="space-y-4">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-normal text-foreground">{copy.title}</h1>
            <p className="text-sm leading-6 text-muted-foreground">{copy.description}</p>
          </div>
          <AuthFlowForm
            flowId={flowId}
            kind={copy.flowKind}
            kratosPublicUrl={authEnv.ORY_KRATOS_PUBLIC_URL}
          />
          <p className="text-center text-sm text-muted-foreground">
            {copy.footerPrompt}{" "}
            <Link className="font-medium text-foreground underline underline-offset-4" href={copy.footerHref}>
              {copy.footerLabel}
            </Link>
          </p>
        </div>
      </div>
    );
  }

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
      {content}
    </main>
  );
}
