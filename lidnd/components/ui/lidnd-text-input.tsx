import { Input, type InputProps } from "@/components/ui/input";
import { LidndLabel } from "@/components/ui/LidndLabel";
import clsx from "clsx";
import React from "react";

type BaseLidnInputProps = {
  basicLabel?: string;
} & InputProps;

export type LidndTextInputProps =
  | ({
      variant: "ghost";
      placeholder: string;
    } & BaseLidnInputProps)
  | ({
      variant?: "default";
    } & BaseLidnInputProps);

export const LidndTextInput = React.forwardRef<
  HTMLInputElement,
  LidndTextInputProps
>(({ variant, placeholder, className, basicLabel, ...props }, ref) => {
  const ghostClassName =
    "border-none outline-none focus-visible:outline-none focus-visible:ring-transparent p-0";
  const baseInput = (
    <Input
      className={clsx({ [ghostClassName]: variant === "ghost" }, className)}
      ref={ref}
      placeholder={placeholder}
      {...props}
    />
  );
  if (basicLabel) {
    return <LidndLabel label={basicLabel}>{baseInput}</LidndLabel>;
  }
  return baseInput;
});
