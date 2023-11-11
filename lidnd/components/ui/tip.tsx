import { FadePresenceItem } from "@/components/ui/animate/FadePresenceItem";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import { AnimatePresence, motion } from "framer-motion";

export function Tip({
  children,
  text,
}: {
  children: React.ReactNode;
  text: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <AnimatePresence>
            <FadePresenceItem className="p-2 m-2 border rounded-md shadow-sm">
              {text}
            </FadePresenceItem>
          </AnimatePresence>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
