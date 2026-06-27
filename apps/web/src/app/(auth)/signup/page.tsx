import { AuthFlowScreen } from "@/features/auth/auth-flow-screen";

export default function SignupPage(props: {
  searchParams: Promise<{
    next?: string;
    flow?: string;
  }>;
}) {
  return <AuthFlowScreen kind="signup" searchParams={props.searchParams} />;
}
