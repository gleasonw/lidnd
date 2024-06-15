import { Input, InputProps } from "@/components/ui/input";
import clsx from "clsx";

export type LidndTextInputProps =
  | ({
      variant: "ghost";
      placeholder: string;
    } & InputProps)
  | ({
      variant?: "default";
    } & InputProps);

export function LidndTextInput(props: LidndTextInputProps) {
  if (props.variant === "ghost") {
    return (
      <Input
        {...props}
        className={clsx(
          "border-transparent outline-none focus-visible:outline-none focus-visible:ring-transparent p-0",
          props.className
        )}
      />
    );
  }

  return <Input {...props} />;
}
