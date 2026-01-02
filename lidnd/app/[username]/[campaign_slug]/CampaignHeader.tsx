"use client";

import { usePathname } from "next/navigation";

export function CampaignHeader({
  campaign,
}: {
  campaign: { name: string; description?: string | null };
}) {
  const pathname = usePathname();
  
  // Hide header on encounter pages
  const shouldShowHeader = !pathname.includes("/encounter/");

  if (!shouldShowHeader) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-6">
      <header className="flex flex-col gap-6 border-b pb-4">
        <div className="space-y-2">
          <h1 className="text-2xl tracking-tight">{campaign.name}</h1>
          {campaign.description ? (
            <p className="text-muted-foreground max-w-2xl text-sm">
              {campaign.description}
            </p>
          ) : null}
        </div>
      </header>
    </div>
  );
}
