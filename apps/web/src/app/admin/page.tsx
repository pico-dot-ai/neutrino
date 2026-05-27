import { Suspense } from "react";
import { DeveloperConsole } from "@/components/admin/developer-console";

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <DeveloperConsole />
    </Suspense>
  );
}
