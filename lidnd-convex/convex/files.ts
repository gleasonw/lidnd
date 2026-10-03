import { mutation, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUserId } from "./lib/auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export async function imageUrl(
  ctx: QueryCtx,
  storageId: Id<"_storage"> | undefined,
) {
  return storageId ? await ctx.storage.getUrl(storageId) : null;
}
