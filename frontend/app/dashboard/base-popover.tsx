import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

export function BasePopover({
  children,
  trigger,
  className,
}: {
  children?: React.ReactNode;
  trigger: React.ReactNode;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={className}>{children}</PopoverContent>
    </Popover>
  );
}
