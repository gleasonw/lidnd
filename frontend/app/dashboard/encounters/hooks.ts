import { usePathname } from "next/navigation";

export function useEncounterId() {
  const pathname = usePathname();
  const id = pathname.split("/")[3];
  const parsedId = parseInt(id);
  if(isNaN(parsedId)) {
    throw new Error("Invalid encounter id; hook called outside of encounter page");
  }
  return parsedId;
}
