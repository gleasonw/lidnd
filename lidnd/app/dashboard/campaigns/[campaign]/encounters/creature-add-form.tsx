"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  useAddExistingCreatureToEncounter,
  useEncounterId,
} from "./[id]/hooks";
import { Button } from "@/components/ui/button";
import { CharacterIcon } from "./[id]/character-icon";
import { Creature } from "@/server/api/router";
import { api } from "@/trpc/react";
import Image from "next/image";
import { Heart, Plus, Skull, X } from "lucide-react";

export function ImageUpload({
  onUpload,
  image,
  clearImage,
  previewSize = 200,
}: {
  onUpload: (file?: File) => void;
  image?: File;
  clearImage: () => void;
  previewSize?: number;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const onImageInput = useCallback(
    (dti: DataTransferItem) => {
      if (!dti.type.startsWith("image")) {
        console.error(`${dti.type} is not an image`);
        return;
      }

      onUpload(dti.getAsFile() ?? undefined);
    },
    [onUpload],
  );

  return (
    <span className="h-auto relative flex flex-col gap-5 group">
      {previewUrl && (
        <div className="relative w-fit">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              clearImage();
            }}
            className="absolute top-0 right-0"
          >
            <X />
          </Button>
          <Image
            src={previewUrl}
            alt={"preview image for " + image?.name}
            width={previewSize}
            height={previewSize}
          />
        </div>
      )}
      <span className="flex gap-3 items-center">
        <Input
          type={"file"}
          className="max-w-xs"
          accept="image/png, image/jpeg, image/jpg"
          onChange={(e) => {
            if (e.target.files) {
              onUpload(e.target.files[0]);
            }
          }}
        />
        or
        <Input
          placeholder="Paste image"
          onPaste={(e) => {
            const clipboardData = e.clipboardData;
            const item = clipboardData.items[0];
            onImageInput(item);
          }}
        />
      </span>
      <span
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onImageInput(e.dataTransfer.items[0]);
        }}
        className="border-2 border-dashed border-gray-200 rounded-md p-2 flex flex-col gap-2 h-20 items-center justify-center"
      >
        Drop image here
      </span>
    </span>
  );
}
