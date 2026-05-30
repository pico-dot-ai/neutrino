"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  KeyRound,
  Mail,
  ShieldCheck
} from "lucide-react";
import { Button, Input } from "@neutrino/ui";

type AuthMethod = "password" | "google" | "apple" | "github" | "sso";
type AuthStep = "start" | "email" | "password" | "provider";

type KratosUiNode = {
  attributes?: {
    name?: string;
    type?: string;
    value?: string;
    required?: boolean;
    disabled?: boolean;
  };
  meta?: {
    label?: {
      text?: string;
    };
  };
  group?: string;
};

type KratosLoginFlow = {
  ui?: {
    action?: string;
    method?: string;
    nodes?: KratosUiNode[];
    messages?: Array<{ text?: string }>;
  };
};

const authMethods: Array<{
  id: Exclude<AuthMethod, "password">;
  label: string;
  icon: React.ReactNode;
  iconContainerClassName?: string;
}> = [
  {
    id: "google",
    label: "Continue with Google",
    icon: <Image src="/brand/google-g-logo.png" alt="" width={20} height={20} />
  },
  {
    id: "apple",
    label: "Continue with Apple",
    icon: <Image src="/brand/apple-logo-siwa-black-cropped.svg" alt="" width={24} height={24} />,
    iconContainerClassName: "h-10 w-6"
  },
  {
    id: "github",
    label: "Continue with GitHub",
    icon: <Image src="/brand/github-invertocat-black.svg" alt="" width={20} height={20} />
  },
  {
    id: "sso",
    label: "Continue with SSO",
    icon: <Building2 aria-hidden="true" className="h-4 w-4" />
  }
];

const methodCopy: Record<AuthMethod, {
  title: string;
  description: string;
  feature: string;
}> = {
  password: {
    title: "Protected developer access",
    description: "Use your picoAI admin identity to reach the console.",
    feature: "Local credentials remain available for the current MVP bootstrap."
  },
  google: {
    title: "Workspace sign-in",
    description: "Connect identity providers without changing the surrounding page.",
    feature: "Provider-specific guidance can appear here while the left pane advances."
  },
  apple: {
    title: "Apple identity",
    description: "Use Apple sign-in for passwordless account access where enabled.",
    feature: "Identity flow details can be shown here while the login pane advances."
  },
  github: {
    title: "Builder-friendly access",
    description: "GitHub auth can carry repository context into future developer flows.",
    feature: "The right pane can stay independent or track the selected auth method."
  },
  sso: {
    title: "Organization controls",
    description: "SSO steps can collect workspace or domain hints before redirecting.",
    feature: "Eligibility and policy checks stay visible without rebuilding the layout."
  }
};

export function LoginForm(props: {
  nextPath?: string;
  initialError?: string;
  kratosFlow?: {
    flowId: string;
    kratosPublicUrl: string;
  };
}) {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberDevice, setRememberDevice] = React.useState(true);
  const [method, setMethod] = React.useState<AuthMethod>("password");
  const [step, setStep] = React.useState<AuthStep>("start");
  const [error, setError] = React.useState<string | null>(props.initialError ?? null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [kratosFlow, setKratosFlow] = React.useState<KratosLoginFlow | null>(null);
  const [kratosError, setKratosError] = React.useState<string | null>(null);
  const activeCopy = methodCopy[method];
  const isKratosMode = Boolean(props.kratosFlow);

  React.useEffect(() => {
    const flowConfig = props.kratosFlow;
    if (!flowConfig) {
      return;
    }

    const controller = new AbortController();

    const loadFlow = async () => {
      try {
        const url = new URL("/self-service/login/flows", flowConfig.kratosPublicUrl);
        url.searchParams.set("id", flowConfig.flowId);

        const response = await fetch(url.toString(), {
          method: "GET",
          credentials: "include",
          signal: controller.signal
        });

        if (!response.ok) {
          setKratosError("Unable to load sign-in session. Please refresh and try again.");
          return;
        }

        setKratosFlow((await response.json()) as KratosLoginFlow);
      } catch {
        if (!controller.signal.aborted) {
          setKratosError("Unable to load sign-in session. Please refresh and try again.");
        }
      }
    };

    void loadFlow();

    return () => controller.abort();
  }, [props.kratosFlow]);

  const kratosNodes = kratosFlow?.ui?.nodes ?? [];
  const kratosHiddenInputs = kratosNodes.filter(
    (node) => node.attributes?.type === "hidden" && node.attributes.name
  );
  const kratosPasswordSubmit = kratosNodes.find(
    (node) =>
      node.group === "password" &&
      node.attributes?.type === "submit" &&
      node.attributes?.name &&
      node.attributes?.value
  );
  const kratosOidcButtons = kratosNodes.filter(
    (node) =>
      node.group === "oidc" &&
      node.attributes?.type === "submit" &&
      node.attributes.name &&
      node.attributes.value
  );
  const kratosAction = kratosFlow?.ui?.action;
  const kratosMethod = (kratosFlow?.ui?.method ?? "POST").toUpperCase();
  const kratosMessage = kratosFlow?.ui?.messages?.[0]?.text;
  const canSubmitKratosPassword = Boolean(kratosAction && kratosPasswordSubmit);

  function renderKratosHiddenInputs(prefix: string) {
    return kratosHiddenInputs.map((node) => (
      <input
        key={`${prefix}-${node.attributes?.name}-${node.attributes?.value ?? ""}`}
        name={node.attributes?.name}
        type="hidden"
        value={node.attributes?.value ?? ""}
      />
    ));
  }

  function selectPassword() {
    setError(null);
    setMethod("password");
    setStep("email");
  }

  function continueWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStep("password");
  }

  function selectProvider(nextMethod: Exclude<AuthMethod, "password">) {
    setError(null);
    setMethod(nextMethod);
    setStep("provider");
  }

  function resetChoice() {
    setError(null);
    setStep("start");
    setMethod("password");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (isKratosMode) {
      return;
    }

    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password,
          next: props.nextPath
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            redirectTo?: string;
          }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to sign in.");
        return;
      }

      router.push(payload?.redirectTo ?? "/admin");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to sign in."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/48 shadow-[0_20px_56px_rgba(15,23,42,0.1)] backdrop-blur-xl">
      <section className="min-h-[340px] px-3 py-6 sm:px-3 sm:py-7 lg:px-4">
        <div className="mx-auto flex h-full max-w-[352px] flex-col justify-center">
          {step === "start" ? (
            <div className="text-center">
              <div className="mx-auto h-20 w-20 rounded-full bg-white p-[8px] shadow-[0_8px_24px_rgba(15,23,42,0.1)]">
                <div className="relative h-full w-full">
                  <Image src="/favicon.svg" alt="" fill priority className="object-contain" />
                </div>
              </div>
              <h1 className="mt-5 text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
                Welcome to picoAI
              </h1>

              <form
                action={isKratosMode ? kratosAction : undefined}
                className="mt-3 space-y-3 text-left"
                method={isKratosMode ? kratosMethod : undefined}
                onSubmit={isKratosMode ? undefined : handleSubmit}
              >
                {isKratosMode ? renderKratosHiddenInputs("start") : null}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-foreground" htmlFor="start-username">
                      Email
                    </label>
                    <span aria-hidden="true" className="text-sm font-medium opacity-0">
                      Forgot password?
                    </span>
                  </div>
                  <Input
                    aria-label="Email address"
                    autoComplete="username"
                    className="h-10 rounded-xl bg-white text-sm shadow-sm"
                    id="start-username"
                    name={isKratosMode ? "identifier" : undefined}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={username}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-foreground" htmlFor="start-password">
                      Password
                    </label>
                    <button className="text-sm font-medium text-muted-foreground transition hover:text-foreground" type="button">
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    aria-label="Password"
                    autoComplete="current-password"
                    className="h-10 rounded-xl bg-white text-sm shadow-sm"
                    id="start-password"
                    name={isKratosMode ? "password" : undefined}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type="password"
                    value={password}
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    checked={rememberDevice}
                    className="h-4 w-4 rounded border-border text-foreground focus:ring-0"
                    onChange={(event) => setRememberDevice(event.target.checked)}
                    type="checkbox"
                  />
                  Remember me on this device
                </label>

                {kratosError || kratosMessage || error ? (
                  <p className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {kratosError ?? kratosMessage ?? error}
                  </p>
                ) : null}

                <Button
                  className="h-10 w-full rounded-xl text-sm shadow-sm"
                  disabled={isKratosMode ? !canSubmitKratosPassword : isSubmitting}
                  name={isKratosMode ? kratosPasswordSubmit?.attributes?.name : undefined}
                  type="submit"
                  value={isKratosMode ? kratosPasswordSubmit?.attributes?.value : undefined}
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              {!isKratosMode || kratosOidcButtons.length > 0 ? (
                <div className="my-4 flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span>or continue with</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              ) : null}

              {!isKratosMode ? (
                <div className="space-y-2.5">
                  {authMethods.map((option) => (
                    <button
                      className="relative flex h-10 w-full items-center rounded-full border border-border bg-white px-4 text-sm font-medium leading-none text-foreground shadow-sm transition hover:border-border-strong hover:bg-secondary"
                      key={option.id}
                      onClick={() => selectProvider(option.id)}
                      type="button"
                    >
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        {option.icon ? (
                          <span className="grid grid-cols-[20px_auto] items-center gap-3">
                            <span className={`grid w-5 place-items-center ${option.iconContainerClassName ?? "h-5"}`}>
                              {option.icon}
                            </span>
                            <span className="inline-flex h-5 items-center leading-5">{option.label}</span>
                          </span>
                        ) : (
                          <span className="inline-flex h-5 items-center leading-5">{option.label}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              ) : kratosAction && kratosOidcButtons.length > 0 ? (
                <div className="space-y-2.5">
                  {kratosOidcButtons.map((node) => (
                    <form action={kratosAction} key={`${node.attributes?.name}-${node.attributes?.value}`} method={kratosMethod}>
                      {renderKratosHiddenInputs(`oidc-${node.attributes?.value}`)}
                      <button
                        className="relative flex h-10 w-full items-center rounded-full border border-border bg-white px-4 text-sm font-medium leading-none text-foreground shadow-sm transition hover:border-border-strong hover:bg-secondary"
                        name={node.attributes?.name}
                        type="submit"
                        value={node.attributes?.value}
                      >
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="inline-flex h-5 items-center leading-5">
                            {node.meta?.label?.text ?? node.attributes?.value ?? "Continue"}
                          </span>
                        </span>
                      </button>
                    </form>
                  ))}
                </div>
              ) : null}

              <p className="mt-7 text-center text-sm text-muted-foreground">
                New to picoAI?{" "}
                <Link className="font-medium text-foreground underline underline-offset-4" href="/">
                  Sign up
                </Link>
              </p>
            </div>
          ) : null}

          {step === "email" ? (
            <>
              <button
                className="mb-7 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                onClick={resetChoice}
                type="button"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </button>
              <div className="text-center">
                <Image className="mx-auto" src="/favicon.svg" alt="" width={54} height={54} priority />
                <h1 className="mt-5 text-2xl font-normal tracking-tight text-foreground">
                  Enter your email
                </h1>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Use the address connected to your picoAI admin account.
                </p>
              </div>

              <form className="mt-7 space-y-2.5" onSubmit={continueWithPassword}>
                <div className="relative">
                  <Mail aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Email address"
                    autoComplete="username"
                    className="h-10 rounded-full bg-white pl-11 text-sm shadow-sm"
                    id="username"
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="you@example.com"
                    required
                    value={username}
                  />
                </div>

                <Button className="h-10 w-full rounded-full text-sm shadow-sm" type="submit">
                  Continue
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : null}

          {step === "password" ? (
            <>
              <button
                className="mb-7 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                onClick={selectPassword}
                type="button"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </button>
              <div className="text-center">
                <Image className="mx-auto" src="/favicon.svg" alt="" width={54} height={54} priority />
                <h1 className="mt-5 text-2xl font-normal tracking-tight text-foreground">
                  Enter your password
                </h1>
              </div>
              <p className="mt-4 text-center text-sm leading-6 text-muted-foreground">
                Continue as <span className="font-medium text-foreground">{username}</span>.
              </p>

              <form className="mt-7 space-y-2.5" onSubmit={handleSubmit}>
                <div className="relative">
                  <KeyRound aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Password"
                    autoComplete="current-password"
                    className="h-10 rounded-full bg-white pl-11 text-sm shadow-sm"
                    id="password"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type="password"
                    value={password}
                  />
                </div>

                {error ? (
                  <p className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}

                <Button className="h-10 w-full rounded-full text-sm shadow-sm" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </>
          ) : null}

          {step === "provider" ? (
            <>
              <button
                className="mb-7 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                onClick={resetChoice}
                type="button"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </button>
              <div className="text-center">
                <Image className="mx-auto" src="/favicon.svg" alt="" width={54} height={54} priority />
                <h1 className="mt-5 text-2xl font-normal tracking-tight text-foreground">
                  {activeCopy.title}
                </h1>
              </div>
              <p className="mt-4 text-center text-sm leading-6 text-muted-foreground">
                {activeCopy.description}
              </p>
              <div className="mt-7 rounded-3xl border border-border bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 text-accent" />
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Provider flow placeholder</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      This pane is ready for a redirect, domain capture, or MFA step once the backend provider is wired.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {step !== "start" ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              Need the public overview first?{" "}
              <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/">
                Back to landing page
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
