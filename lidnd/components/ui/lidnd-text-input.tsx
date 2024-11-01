import { Input, type InputProps } from "@/components/ui/input";
import clsx from "clsx";
import React from "react";

export type LidndTextInputProps =
  | ({
      variant: "ghost";
      placeholder: string;
    } & InputProps)
  | ({
      variant?: "default";
    } & InputProps);

export const LidndTextInput = React.forwardRef<
  HTMLInputElement,
  LidndTextInputProps
>(({ variant, placeholder, className, ...props }, ref) => {
  if (variant === "ghost") {
    return (
      <Input
        className={clsx(
          "border-none outline-none focus-visible:outline-none focus-visible:ring-transparent p-0",
          className
        )}
        ref={ref}
        placeholder={placeholder}
        {...props}
      />
    );
  }

  return (
    <Input
      ref={ref}
      className={className}
      placeholder={placeholder}
      {...props}
    />
  );
});
