import {
  useEncounter,
  useEncounterQueryUtils,
  useUpdateCreature,
} from "./hooks";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { api } from "@/trpc/react";

/**Note: must be called underneath an encounter provider */
export function useUploadParticipant({
  creatureStatBlock,
  creatureIcon,
  onSuccess,
}: {
  creatureStatBlock?: File;
  creatureIcon?: File;
  onSuccess?: () => void;
}) {
  const [encounter] = useEncounter();
  const { encounterById } = api.useUtils();
  const id = encounter.id;
  const { invalidateAll, cancelAll } = useEncounterQueryUtils();
  const { mutate: updateCreature } = useUpdateCreature();

  return api.uploadParticipant.useMutation({
    onMutate: async (data) => {
      await cancelAll(encounter);
      const previousEncounterData = encounterById.getData(id);
      encounterById.setData(id, (old) => {
        if (!old || !data.participant || !data.creature) {
          console.error(`data missing in createCreatureInEncounter`);
          return;
        }
        return EncounterUtils.addParticipant(
          ParticipantUtils.placeholderParticipantWithData(
            {
              ...data.participant,
              encounter_id: id,
              creature_id: "pending",
            },
            {
              ...data.creature,
              user_id: "pending",
            }
          ),
          old
        );
      });
      return { previousEncounterData };
    },
    onError: (err, variables, context) => {
      console.error(err);
      if (context?.previousEncounterData) {
        encounterById.setData(id, context.previousEncounterData);
      }
    },
    onSuccess: async (data) => {
      try {
        const fileUploadTasks = [];
        const dimensionTasks = [];

        if (data.iconPresigned && creatureIcon) {
          fileUploadTasks.push(
            uploadFileToAWS(creatureIcon, data.iconPresigned)
          );
          dimensionTasks.push(readImageHeightWidth(creatureIcon));
        }

        if (data.statBlockPresigned && creatureStatBlock) {
          fileUploadTasks.push(
            uploadFileToAWS(creatureStatBlock, data.statBlockPresigned)
          );
          dimensionTasks.push(readImageHeightWidth(creatureStatBlock));
        }

        await Promise.all(fileUploadTasks);

        const dimensions = await Promise.all(dimensionTasks);

        const [statBlockDimensions, iconDimensions] = dimensions;
        updateCreature({
          ...data.creature,
          stat_block_height:
            statBlockDimensions?.height ?? data.creature.stat_block_height,
          stat_block_width:
            statBlockDimensions?.width ?? data.creature.stat_block_width,
          icon_height: iconDimensions?.height ?? data.creature.icon_height,
          icon_width: iconDimensions?.width ?? data.creature.icon_width,
        });

        onSuccess?.();
        invalidateAll(encounter);
      } catch (error) {
        console.error(error);
        const message = "Failed to upload participant";
        if (!(error instanceof Error)) {
          throw new Error(message);
        }
        throw new Error(`${message}: ${error.message}`);
      }
    },
    onSettled: async () => {
      return await invalidateAll(encounter);
    },
  });
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
