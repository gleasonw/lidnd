"use client";

import { Button, ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import React from "react";
// @ts-ignore

export interface LoadingButtonProps extends ButtonProps {
  children?: React.ReactNode;
  isLoading?: boolean;
}

export function LoadingButton(props: LoadingButtonProps) {
  // const { pending } = useFormStatus();

  // const isPending = props.isLoading || pending;

  const propsWithoutIsLoading = { ...props };
  delete propsWithoutIsLoading.isLoading;

  return (
    <Button {...propsWithoutIsLoading} disabled={props.isLoading}>
      {props.isLoading ? <Spinner /> : props.children}
    </Button>
  );
}
