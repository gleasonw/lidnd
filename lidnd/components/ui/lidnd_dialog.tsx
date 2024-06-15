import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { Plus } from "lucide-react";

interface LidndDialogProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
}

export function LidndDialog(props: LidndDialogProps) {
  const { trigger, content } = props;
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-screen overflow-auto">
        {content}
      </DialogContent>
    </Dialog>
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
