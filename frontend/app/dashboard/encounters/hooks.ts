import { usePathname } from "next/navigation";

export function useEncounterId() {
  const pathname = usePathname();
  const id = pathname.split("/")[3];
  return id;
}
