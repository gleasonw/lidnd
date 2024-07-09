import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export function Tip({
  children,
  text,
  className,
}: {
  children: React.ReactNode;
  text: string;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className={"bg-transparent bg-gray-800 text-white"}>
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ButtonWithTooltip({
  children,
  text,
  className,
  ...props
}: {
  children: React.ReactNode;
  text: string;
  className?: string;
} & React.ComponentPropsWithoutRef<typeof Button>) {
  return (
    <Tip text={text}>
      <Button className={className} {...props}>
        {children}
      </Button>
    </Tip>
  );
}
