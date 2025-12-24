"use client";

import type { ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogOverlay,
} from "@/components/ui/dialog";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Plus } from "lucide-react";
import React, { createContext } from "react";

type LidndDialogPropsBase = {
  trigger: React.ReactNode;
  content: React.ReactNode;
  title: React.ReactNode;
};

type LidndDialogPropsControlled = LidndDialogPropsBase & {
  isOpen: boolean;
  onClose: () => void;
};

type LidndDialogPropsUncontrolled = LidndDialogPropsBase & {
  isOpen?: never;
  onClose?: never;
};

const DialogContext = createContext<{ close: () => void } | null>(null);
export const useLidndDialog = () => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a LidndDialog");
  }
  return context;
};

export function LidndDialog(
  props: LidndDialogPropsControlled | LidndDialogPropsUncontrolled
) {
  const { trigger, content } = props;
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <DialogContext.Provider value={{ close: () => setIsOpen(false) }}>
      <Dialog
        open={props.isOpen ?? isOpen}
        onOpenChange={(isOpen) => {
          setIsOpen(isOpen);
          if (isOpen === false) {
            props.onClose?.();
          }
        }}
      >
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-screen overflow-auto sm:max-w-[1000px]">
          <DialogTitle>{props.title}</DialogTitle>
          {content}
        </DialogContent>
        <DialogOverlay />
      </Dialog>
    </DialogContext.Provider>
  );
}

interface LidndPlusDialogProps {
  text: string;
  children: React.ReactNode;
  dialogTitle?: React.ReactNode;
  variant?: ButtonProps["variant"];
}

export function LidndPlusDialog(props: LidndPlusDialogProps) {
  const { children, text } = props;
  return (
    <LidndDialog
      title={props.dialogTitle}
      trigger={
        <ButtonWithTooltip variant={props.variant ?? "ghost"} text={text}>
          <Plus />
        </ButtonWithTooltip>
      }
      content={children}
    />
  );
}
