import { PartyPage } from "@/app/[username]/[campaign_slug]/partyPage";

export default async function CampaignPartyPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-6">
      <section>
        <PartyPage />
      </section>
    </div>
  );
}
