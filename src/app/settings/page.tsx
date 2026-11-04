import { Suspense } from "react";
import AuthRouteGate from "@/components/AuthRouteGate";
import SettingsModal from "@/components/SettingsModal";

export default function SettingsPage() {
  return (
    <AuthRouteGate>
      <Suspense fallback={null}>
        <SettingsModal />
      </Suspense>
    </AuthRouteGate>
  );
}
