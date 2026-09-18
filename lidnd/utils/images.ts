import { statBlockPrefix } from "@/utils/creatures";

// In dev/test mode AWS_ENDPOINT_URL points at the local MinIO container
// (see docker-compose.yml), which needs path-style URLs. Real S3 uses
// virtual-hosted-style, so this falls back to the historical bucket URL
// when no override is set.
export const baseAwsUrl = process.env.AWS_ENDPOINT_URL
  ? `${process.env.AWS_ENDPOINT_URL}/${process.env.AWS_BUCKET_NAME}`
  : "https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com";

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
