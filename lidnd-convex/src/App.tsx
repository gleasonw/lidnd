import { LoadingState } from "@/components/LoadingState";
import { Layout } from "@/Layout";
import { SignInForm } from "@/SignInForm";
import { UserMenu } from "@/components/UserMenu";
import { CampaignLayout } from "@/campaigns/CampaignLayout";
import { CampaignList } from "@/campaigns/CampaignList";
import { AdversariesPage } from "@/creatures/AdversariesPage";
import { PartyPage } from "@/creatures/PartyPage";
import { PlanList } from "@/plans/PlanList";
import { PlanPage } from "@/plans/PlanPage";
import { RunPage } from "@/runs/RunPage";
import { SessionPage } from "@/sessions/SessionPage";
import { SessionsPage } from "@/sessions/SessionsPage";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { Route, Routes } from "react-router";
import { api } from "../convex/_generated/api";

export default function App() {
  return (
    <Layout
      menu={
        <Authenticated>
          <ViewerMenu />
        </Authenticated>
      }
    >
      <AuthLoading>
        <LoadingState className="px-4 py-6" />
      </AuthLoading>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
      <Authenticated>
        <Routes>
          <Route path="/" element={<CampaignList />} />
          <Route
            path="/campaigns/:campaignId/runs/:runId"
            element={<RunPage />}
          />
          <Route path="/campaigns/:campaignId" element={<CampaignLayout />}>
            <Route index element={<PlanList />} />
            <Route path="plans/:planId" element={<PlanPage />} />
            <Route path="party" element={<PartyPage />} />
            <Route path="adversaries" element={<AdversariesPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/:sessionId" element={<SessionPage />} />
          </Route>
        </Routes>
      </Authenticated>
    </Layout>
  );
}

function ViewerMenu() {
  const user = useQuery(api.users.viewer);
  return <UserMenu>{user?.name ?? user?.email}</UserMenu>;
}
