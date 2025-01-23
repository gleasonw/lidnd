import { localCreatureUploadSchema } from "@/encounters/[encounter_index]/participant-upload-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn, FormProvider } from "react-hook-form";
import { FormField } from "@/components/ui/form";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { ImageUpload } from "@/encounters/image-upload";
import { Input } from "@/components/ui/input";
import { FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { z } from "zod";
import type { Creature } from "@/server/api/router";
import { api } from "@/trpc/react";

export type CreatureUpload = Zod.infer<typeof localCreatureUploadSchema>;

export function useCreatureForm() {
  return useForm<CreatureUpload>({
    resolver: zodResolver(localCreatureUploadSchema),
    defaultValues: {
      name: "",
      is_player: false,
    },
    resetOptions: {
      keepValues: false,
    },
  });
}

type CreatureUploadFormProps = {
  form: UseFormReturn<CreatureUpload>;
  onSubmit: (data: CreatureUpload) => void;
  isPending: boolean;
};

export function AllyCreatureUploadForm({
  form,
  onSubmit,
  isPending,
}: CreatureUploadFormProps) {
  useEffect(() => {
    console.log(form.formState.errors);
  }, [form.formState.errors]);

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6 p-5 w-full"
      >
        <FormField
          control={form.control}
          name={"name"}
          render={({ field }) => {
            return <LidndTextInput required placeholder="Name" {...field} />;
          }}
        />
        <FormField
          control={form.control}
          name="statBlockImage"
          render={({ field }) => (
            <ImageUpload
              dropContainerClassName="h-52"
              onUpload={(image) => {
                field.onChange(image);
              }}
              dropText="Drop a Statblock"
              dropIcon={<FileText />}
              previewSize={800}
              image={field.value}
              clearImage={() => field.onChange(undefined)}
              fileInputProps={{ name: "stat_block_image" }}
            />
          )}
        />
        <div className="flex gap-3">
          <FormField
            control={form.control}
            name={"max_hp"}
            render={({ field }) => (
              <Input
                type="number"
                required
                placeholder="HP"
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
          <FormField
            control={form.control}
            name={"challenge_rating"}
            render={({ field }) => (
              <Input
                type="number"
                placeholder="Challenge Rating"
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="iconImage"
          render={({ field }) => {
            return (
              <ImageUpload
                image={field.value}
                clearImage={() => field.onChange(undefined)}
                onUpload={(image) => {
                  field.onChange(image);
                }}
                dropText="Drop an Icon"
                dropIcon={<User />}
                fileInputProps={{ name: "icon_image" }}
              />
            );
          }}
        />
        <Button type="submit">
          {isPending ? "Uploading..." : "Add participant"}
        </Button>
      </form>
    </FormProvider>
  );
}

export function OppponentCreatureUploadForm({
  form,
  onSubmit,
  isPending,
}: CreatureUploadFormProps) {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6 p-5 w-full"
      >
        <FormField
          control={form.control}
          name={"name"}
          render={({ field }) => {
            return <LidndTextInput required placeholder="Name" {...field} />;
          }}
        />
        <FormField
          control={form.control}
          name="statBlockImage"
          render={({ field }) => (
            <ImageUpload
              dropContainerClassName="h-52"
              onUpload={(image) => {
                field.onChange(image);
              }}
              dropText="Drop a Statblock"
              dropIcon={<FileText />}
              previewSize={800}
              image={field.value}
              clearImage={() => field.onChange(undefined)}
              fileInputProps={{ name: "stat_block_image" }}
            />
          )}
        />
        <div className="flex gap-3">
          <FormField
            control={form.control}
            name={"max_hp"}
            render={({ field }) => (
              <Input
                type="number"
                required
                placeholder="HP"
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
          <FormField
            control={form.control}
            name={"challenge_rating"}
            render={({ field }) => (
              <Input
                type="number"
                placeholder="Challenge Rating"
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="iconImage"
          render={({ field }) => {
            return (
              <ImageUpload
                image={field.value}
                clearImage={() => field.onChange(undefined)}
                onUpload={(image) => {
                  field.onChange(image);
                }}
                dropText="Drop an Icon"
                dropIcon={<User />}
                fileInputProps={{ name: "icon_image" }}
              />
            );
          }}
        />
        <Button type="submit">
          {isPending ? "Uploading..." : "Add participant"}
        </Button>
      </form>
    </FormProvider>
  );
}

export type PlayerUpload = Pick<CreatureUpload, "name" | "iconImage">;
export function usePlayerCreatureForm() {
  return useForm<PlayerUpload>({
    resolver: zodResolver(
      z.object({ name: z.string(), iconImage: z.instanceof(File).optional() })
    ),
    defaultValues: { name: "" },
  });
}

export function PlayerCreatureUploadForm({
  form,
  onSubmit,
  isPending,
}: {
  form: UseFormReturn<PlayerUpload>;
  onSubmit: (data: PlayerUpload) => void;
  isPending: boolean;
}) {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6 p-5 w-full"
      >
        <FormField
          control={form.control}
          name={"name"}
          render={({ field }) => {
            return <LidndTextInput required placeholder="Name" {...field} />;
          }}
        />
        <FormField
          control={form.control}
          name="iconImage"
          render={({ field }) => {
            return (
              <ImageUpload
                image={field.value}
                clearImage={() => field.onChange(undefined)}
                onUpload={(image) => {
                  field.onChange(image);
                }}
                dropText="Drop an Icon"
                dropIcon={<User />}
                fileInputProps={{ name: "icon_image" }}
              />
            );
          }}
        />
        <Button type="submit">
          {isPending ? "Uploading..." : "Add participant"}
        </Button>
      </form>
    </FormProvider>
  );
}

type AwsImageUploadArgs = {
  statBlockImage?: File;
  iconImage?: File;
  onSuccess?: () => void;
};

export function useAwsImageUpload({
  statBlockImage,
  iconImage,
  onSuccess,
}: AwsImageUploadArgs) {
  const { mutate: updateCreature } = api.updateCreature.useMutation();
  return async ({
    iconPresigned,
    statBlockPresigned,
    creature,
  }: {
    iconPresigned?: string;
    statBlockPresigned?: string;
    creature: Creature;
  }) => {
    try {
      const fileUploadTasks = [];
      const dimensionTasks = [];

      if (iconPresigned && iconImage) {
        fileUploadTasks.push(uploadFileToAWS(iconImage, iconPresigned));
        dimensionTasks.push(readImageHeightWidth(iconImage));
      }

      if (statBlockPresigned && statBlockImage) {
        fileUploadTasks.push(
          uploadFileToAWS(statBlockImage, statBlockPresigned)
        );
        dimensionTasks.push(readImageHeightWidth(statBlockImage));
      }

      await Promise.all(fileUploadTasks);

      const dimensions = await Promise.all(dimensionTasks);

      const [statBlockDimensions, iconDimensions] = dimensions;
      updateCreature({
        ...creature,
        stat_block_height:
          statBlockDimensions?.height ?? creature.stat_block_height,
        stat_block_width:
          statBlockDimensions?.width ?? creature.stat_block_width,
        icon_height: iconDimensions?.height ?? creature.icon_height,
        icon_width: iconDimensions?.width ?? creature.icon_width,
      });

      onSuccess?.();
    } catch (error) {
      console.error(error);
      const message = "Failed to upload participant";
      if (!(error instanceof Error)) {
        throw new Error(message);
      }
      throw new Error(`${message}: ${error.message}`);
    }
  };
}

async function uploadFileToAWS(file: File, presignedUrl: string) {
  try {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    console.log("File uploaded successfully!");
  } catch (err) {
    console.error("Error uploading file to AWS:", err);
  }
}

async function readImageHeightWidth(
  file: File
): Promise<{ height: number; width: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const image = new Image();
      image.onload = function () {
        resolve({
          height: image.height,
          width: image.width,
        });
      };
      image.onerror = function () {
        reject(new Error("Failed to read image"));
      };
      image.src = event.target?.result as string;
    };
    reader.onerror = function (error) {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}
