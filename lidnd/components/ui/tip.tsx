import { Button, type ButtonProps } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import React from "react";

export function Tip({
  children,
  text,
}: {
  children: React.ReactNode;
  text: string;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          className={"bg-transparent z-50 bg-gray-800 text-white"}
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const ButtonWithTooltip = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & { text: string }
>(({ children, text, className, ...props }, ref) => {
  return (
    <Tip text={text}>
      <Button className={className} aria-label={text} {...props} ref={ref}>
        {children}
      </Button>
    </Tip>
  );
});
