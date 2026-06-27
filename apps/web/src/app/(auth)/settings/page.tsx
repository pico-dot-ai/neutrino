import { AuthFlowScreen } from "@/features/auth/auth-flow-screen";

export default function SettingsPage(props: {
  searchParams: Promise<{
    next?: string;
    flow?: string;
  }>;
}) {
  return <AuthFlowScreen kind="settings" searchParams={props.searchParams} />;
}
