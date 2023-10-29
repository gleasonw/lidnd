import { Button, ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import React from "react";
// @ts-ignore
import { useFormStatus } from "react-dom";

export interface LoadingButtonProps extends ButtonProps {
  children?: React.ReactNode;
  isLoading?: boolean;
}

export function LoadingButton(props: LoadingButtonProps) {
  const { pending } = useFormStatus();

  const isPending = props.isLoading || pending;

  return <Button {...props} disabled={isPending}>{isPending ? <Spinner /> : props.children}</Button>;
}
