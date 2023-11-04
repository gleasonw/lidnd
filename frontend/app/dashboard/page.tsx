import Dashboard from "@/app/dashboard/dashboard";
import { TRPCReactProvider } from "@/trpc/react";
import { cookies } from "next/headers";

export default async function Page() {
  return (
    <TRPCReactProvider cookies={cookies().toString()}>
      <Dashboard />
    </TRPCReactProvider>
  );
}
