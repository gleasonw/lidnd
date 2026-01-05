import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import clsx from "clsx";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { returnsPromise } from "@/utils/general";

export function ImageUpload({
  onUpload,
  previewSize = 200,
  dropText,
  dropContainerClassName,
  dropIcon,
  previewRender,
  fileInputProps,
  image,
  clearImage,
}: {
  onUpload: (file: File) => void | Promise<void>;
  previewSize?: number;
  dropText: string;
  dropIcon?: React.ReactNode;
  dropContainerClassName?: string;
  previewRender?: (url: string) => React.ReactNode;
  fileInputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  image?: File;
  clearImage: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "hovering" | "preview">("idle");

  useEffect(() => {
    if (image && image instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(image);
    } else {
      setPreviewUrl(null);
    }
  }, [image]);

  const onImageInput = async (dti: DataTransferItem) => {
    if (!dti.type.startsWith("image")) {
      console.error(`${dti.type} is not an image`);
      return;
    }

    await doUpload(dti.getAsFile() as File);
  };

  async function doUpload(file: File) {
    const res = onUpload(file);
    if (returnsPromise(res)) {
      await res;
    }
  }

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  if (previewUrl) {
    if (previewRender) {
      return previewRender(previewUrl);
    }
    return (
      <div className="relative w-fit">
        <Button
          variant="destructive"
          onClick={(e) => {
            e.preventDefault();
            clearImage();
          }}
          size="sm"
          className="absolute top-0 right-0"
        >
          <X />
        </Button>
        <div className="flex max-h-[700px]">
          {" "}
          <Image
            src={previewUrl}
            alt={"preview image for " + image?.name}
            width={previewSize}
            height={previewSize}
            className="object-contain"
          />
        </div>

        <input
          type="hidden"
          name={fileInputProps?.name}
          value={image ? URL.createObjectURL(image) : ""}
        />
      </div>
    );
  }

  return (
    <span
      onDragOver={(e) => {
        e.preventDefault();
        setStatus("hovering");
      }}
      onDragLeave={() => setStatus("idle")}
      onDrop={(e) => {
        e.preventDefault();
        const dropItem = e.dataTransfer.items[0];

        if (!dropItem) {
          console.error("No item found when dropping image");
          setStatus("idle");
          return;
        }
        setStatus("idle");
        onImageInput(dropItem).catch((error) => {
          console.error("Failed to upload dropped image:", error);
        });
      }}
      className={clsx(
        "border-2 border-dashed border-gray-200 p-2 flex flex-col gap-2 items-center justify-center transition-all w-full",
        status === "hovering" && "border-gray-400",
        dropContainerClassName
      )}
    >
      <span className="text-gray-600 flex flex-col justify-center items-center gap-3">
        {dropIcon}
        {dropText}
      </span>

      <span className="flex gap-3 items-center">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/png, image/jpeg, image/jpg"
          onChange={(e) => {
            if (e.target.files) {
              const maybeFile = e.target.files[0];
              if (!maybeFile) {
                console.error("No file found when selecting image");
                return;
              }
              doUpload(maybeFile).catch((error) => {
                console.error("Failed to upload selected image:", error);
              });
            }
          }}
          {...fileInputProps}
        />
        <ButtonWithTooltip
          variant="outline"
          className="flex gap-1"
          text="Choose image"
          onClick={(e) => {
            e.preventDefault();
            inputRef.current?.click();
          }}
        >
          <Upload />
        </ButtonWithTooltip>
        or
        <Input
          placeholder="Paste"
          onPaste={(e) => {
            const clipboardData = e.clipboardData;
            const item = clipboardData.items[0];

            if (!item) {
              console.error("No item found when pasting image");
              return;
            }
            onImageInput(item).catch((error) => {
              console.error("Failed to upload pasted image:", error);
            });
          }}
          {...fileInputProps}
        />
      </span>
    </span>
  );
}
