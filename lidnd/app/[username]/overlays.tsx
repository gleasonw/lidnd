"use client";

import React from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ClientOverlays({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SpellSearcher />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}

function SpellSearcher() {
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");

  React.useEffect(() => {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    });
    return () => {
      document.removeEventListener("keydown", () => {});
    };
  }, []);

  const { data: spells } = api.spells.useQuery(searchInput);

  return (
    <Dialog open={showSearch} onOpenChange={(isOpen) => setShowSearch(isOpen)}>
      <DialogContent className="max-w-3xl h-[500px] overflow-auto">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {
          <div className="flex flex-col gap-8">
            {spells?.map((spell) => (
              <div key={spell.id} className="flex flex-col gap-3">
                <DialogTitle>
                  {spell.name} ({spell.source})
                </DialogTitle>
                <DialogDescription className="text-lg whitespace-break-spaces">
                  {spell.entries}
                </DialogDescription>
              </div>
            ))}
          </div>
        }
      </DialogContent>
    </Dialog>
  );
}
