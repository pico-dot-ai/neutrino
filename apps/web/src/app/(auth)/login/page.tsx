import { AuthFlowScreen } from "@/features/auth/auth-flow-screen";

export default function LoginPage(props: {
  searchParams: Promise<{
    next?: string;
    flow?: string;
  }>;
}) {
  return <AuthFlowScreen kind="login" searchParams={props.searchParams} />;
}
