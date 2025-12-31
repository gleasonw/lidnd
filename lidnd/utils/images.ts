import { statBlockPrefix } from "@/utils/creatures";

export const baseAwsUrl =
  "https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com";

export const ImageUtils = {
  assetKey: (image: { id: string; name: string }) => {
    return `${image.id}-${image.name}`;
  },

  url: (image: { id: string; name: string }) => {
    if (image.name.startsWith(statBlockPrefix)) {
      // special case for historical creature stat blocks lazily migrated to
      // image assets on encounter asset add
      return `${baseAwsUrl}/${image.name}`;
    }
    return `${baseAwsUrl}/${ImageUtils.assetKey(image)}`;
  },
};
