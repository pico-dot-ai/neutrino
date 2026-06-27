import { AuthFlowScreen } from "@/features/auth/auth-flow-screen";

export default function VerificationPage(props: {
  searchParams: Promise<{
    next?: string;
    flow?: string;
  }>;
}) {
  return <AuthFlowScreen kind="verification" searchParams={props.searchParams} />;
}
