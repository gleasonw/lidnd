import { EditorContent, Editor } from "@tiptap/react";
import styles from "./lidnd-text-area.module.css";
import clsx from "clsx";

type Variants =
  | { variant: "ghost"; placeholder: string }
  | { placeholder?: string };

export type LidndTextAreaProps = Variants & {
  editor: Editor | null;
};

export function LidndTextArea(props: LidndTextAreaProps) {
  const { editor } = props;

  return (
    <EditorContent
      editor={editor}
      className={clsx(
        styles.root,
        "w-full prose prose-p:mt-0 prose-p:mb-0 max-w-none min-h-[calc(32px+3rem)]"
      )}
    />
  );
}
