"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { SmileIcon } from "lucide-react";

export function SidebarClientTest() {
  const { state } = useSidebar();
  if (state === "expanded") {
    return null;
  }
  return (
    <div>
      <SmileIcon />
    </div>
  );
}
