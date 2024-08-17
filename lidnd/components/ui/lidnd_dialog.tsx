import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { Plus } from "lucide-react";
import React, { createContext } from "react";

interface LidndDialogProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
}

const DialogContext = createContext<{ close: () => void } | null>(null);
export const useLidndDialog = () => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a LidndDialog");
  }
  return context;
};

export function LidndDialog(props: LidndDialogProps) {
  const { trigger, content } = props;
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <DialogContext.Provider value={{ close: () => setIsOpen(false) }}>
      <Dialog open={isOpen} onOpenChange={(isOpen) => setIsOpen(isOpen)}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-screen overflow-auto">
          {content}
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  );
}

interface LidndPlusDialog {
  text: string;
  children: React.ReactNode;
}

export function LidndPlusDialog(props: LidndPlusDialog) {
  const { children, text } = props;
  return (
    <LidndDialog
      trigger={
        <ButtonWithTooltip variant="ghost" text={text}>
          <Plus />
        </ButtonWithTooltip>
      }
      content={children}
    />
  );
}
