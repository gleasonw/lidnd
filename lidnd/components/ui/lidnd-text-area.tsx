import { EditorContent, Editor } from "@tiptap/react";

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
      className="w-full min-h-[80px] prose prose-p:mt-0 prose-p:mb-0 max-w-none"
    />
  );
}
