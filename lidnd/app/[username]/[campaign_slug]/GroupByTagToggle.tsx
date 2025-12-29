"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

export function GroupByTagToggle() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const groupByTag = searchParams.get("groupByTag") === "true";

  const handleToggle = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set("groupByTag", "true");
    } else {
      params.delete("groupByTag");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="group-by-tag"
        checked={groupByTag}
        onCheckedChange={handleToggle}
      />
      <Label htmlFor="group-by-tag" className="cursor-pointer">
        Group by tag
      </Label>
    </div>
  );
}
