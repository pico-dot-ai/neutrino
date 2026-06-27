import { AuthFlowScreen } from "@/features/auth/auth-flow-screen";

export default function RecoveryPage(props: {
  searchParams: Promise<{
    next?: string;
    flow?: string;
  }>;
}) {
  return <AuthFlowScreen kind="recovery" searchParams={props.searchParams} />;
}
