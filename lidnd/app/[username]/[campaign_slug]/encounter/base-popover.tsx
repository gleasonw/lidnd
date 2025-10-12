import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

type LidndPopoverProps = {
  children?: React.ReactNode;
  trigger: React.ReactNode;
  className?: string;
};

type LidndPopoverControlledProps = LidndPopoverProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type LidndPopoverUncontrolledProps = LidndPopoverProps & {
  open?: never;
  onOpenChange?: never;
};

export function LidndPopover(
  props: LidndPopoverControlledProps | LidndPopoverUncontrolledProps
) {
  const { children, trigger, className } = props;

  return (
    <Popover open={props?.open} onOpenChange={props?.onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={className}>{children}</PopoverContent>
    </Popover>
  );
}
