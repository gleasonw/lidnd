import { usePathname, useSearchParams } from "next/navigation";

export function useEncounterId() {
  const pathname = usePathname();
  const id = pathname.split("/")[4];
  return id;
}

export function useSelectedCreature() {
  const params = useSearchParams();
  const selectedCreature = params.get("selectedCreature");
  return selectedCreature;
}
