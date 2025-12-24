"use client";

import { useEncounter } from "@/encounters/[encounter_index]/hooks";
import { api } from "@/trpc/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";

export function NetworkErrorCatcher({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [encounter] = useEncounter();
  const { mutate: syncLocalStateToGlobal } =
    api.syncClientEncounterStateToGlobal.useMutation({
      onSuccess: () => {
        toast("Synced encounter state with server");
      },
    });
  function handleReconnect() {
    // no conflicts!
    queryClient.cancelQueries();
    toast("Online, syncing...");
    syncLocalStateToGlobal({ encounter });
  }

  function handleDisconnect() {
    console.log(`offline`);
    toast("Offline...");
  }

  useEffect(() => {
    window.addEventListener("online", handleReconnect);
    window.addEventListener("offline", handleDisconnect);
    return () => {
      window.removeEventListener("online", handleReconnect);
      window.removeEventListener("offline", handleDisconnect);
    };
  });
  return (
    <div>
      <Toaster />
      {children}
    </div>
  );
}
