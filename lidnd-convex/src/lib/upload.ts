import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/** Uploads an image to Convex storage and returns its storage id. */
export function useUploadImage() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  return useCallback(
    async (file: File) => {
      const url = await generateUploadUrl();
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      return storageId;
    },
    [generateUploadUrl],
  );
}

export function imageFromClipboard(
  event: ClipboardEvent | React.ClipboardEvent,
) {
  for (const item of Array.from(event.clipboardData?.items ?? [])) {
    if (item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

export function imagesFromDrop(event: React.DragEvent) {
  return Array.from(event.dataTransfer.files).filter((f) =>
    f.type.startsWith("image/"),
  );
}
