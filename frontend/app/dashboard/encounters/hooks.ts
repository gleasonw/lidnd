import { usePathname } from "next/navigation";

export function useEncounterId() {
  const pathname = usePathname();
  const id = pathname.split("/")[3];
  const parsedId = parseInt(id);
  if(isNaN(parsedId)) {
    return 0;
  }
  return parsedId;
}
