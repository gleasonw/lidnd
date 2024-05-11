import { Suspense } from "react";
import { SettingsForm } from "@/app/dashboard/settings/settings-form";

export default async function DiscordPage() {
  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <SettingsForm />
    </Suspense>
  );
}
