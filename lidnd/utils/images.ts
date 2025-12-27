export const ImageUtils = {
  assetKey: (image: { id: string; name: string }) => {
    return `${image.id}-${image.name}`;
  },

  url: (image: { id: string; name: string }) => {
    return `https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com/${ImageUtils.assetKey(
      image
    )}`;
  },
};
