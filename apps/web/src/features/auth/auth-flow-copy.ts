import type { HostedBrowserFlowKind } from "@/lib/auth/browser-flow-start";

export type AuthPageKind = "login" | "signup" | "recovery" | "verification" | "settings";

type AuthPageCopy = {
  flowKind: HostedBrowserFlowKind;
  routePath: string;
  startPath: string;
  title: string;
  description: string;
  footerHref: string;
  footerLabel: string;
  footerPrompt: string;
  localUnavailableTitle: string;
  localUnavailableDescription: string;
};

export const authPageCopy: Record<AuthPageKind, AuthPageCopy> = {
  login: {
    flowKind: "login",
    routePath: "/login",
    startPath: "/api/auth/login/start",
    title: "Sign in",
    description: "Continue with your hosted identity provider to reach the Neutrino workspace.",
    footerHref: "/signup",
    footerLabel: "Create an account",
    footerPrompt: "Need a new account?",
    localUnavailableTitle: "Sign in",
    localUnavailableDescription: "Local development credentials are available only on the login route."
  },
  signup: {
    flowKind: "registration",
    routePath: "/signup",
    startPath: "/api/auth/registration/start",
    title: "Create your account",
    description: "Register through the hosted identity provider and continue into the product.",
    footerHref: "/login",
    footerLabel: "Back to sign in",
    footerPrompt: "Already have an account?",
    localUnavailableTitle: "Hosted signup required",
    localUnavailableDescription:
      "Self-service signup is only available through hosted auth. Local fallback supports sign-in only."
  },
  recovery: {
    flowKind: "recovery",
    routePath: "/recovery",
    startPath: "/api/auth/recovery/start",
    title: "Recover access",
    description: "Use the hosted recovery flow to regain access without exposing account state.",
    footerHref: "/login",
    footerLabel: "Back to sign in",
    footerPrompt: "Remembered your password?",
    localUnavailableTitle: "Hosted recovery required",
    localUnavailableDescription:
      "Password recovery is available only through the hosted auth provider. Local fallback supports sign-in only."
  },
  verification: {
    flowKind: "verification",
    routePath: "/verification",
    startPath: "/api/auth/verification/start",
    title: "Verify your email",
    description: "Complete the hosted verification flow before accessing protected product surfaces.",
    footerHref: "/login",
    footerLabel: "Back to sign in",
    footerPrompt: "Want to use a different account?",
    localUnavailableTitle: "Hosted verification required",
    localUnavailableDescription:
      "Account verification is available only through hosted auth. Local fallback supports sign-in only."
  },
  settings: {
    flowKind: "settings",
    routePath: "/settings",
    startPath: "/api/auth/settings/start",
    title: "Account settings",
    description: "Manage your hosted identity settings while staying inside the Neutrino product shell.",
    footerHref: "/admin",
    footerLabel: "Back to admin",
    footerPrompt: "Finished here?",
    localUnavailableTitle: "Hosted settings required",
    localUnavailableDescription:
      "Account settings are available only through hosted auth. Local fallback supports sign-in only."
  }
};

export function getAuthPageCopy(kind: AuthPageKind) {
  return authPageCopy[kind];
}
