import { ConvexError, v } from "convex/values";
import { mutation, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireUserId } from "./lib/auth";
import { imageBox, statBlockColumns } from "./schema";

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

async function findLayout(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  storageId: Id<"_storage">,
) {
  return await ctx.db
    .query("statBlockLayouts")
    .withIndex("by_ownerId_and_storageId", (q) =>
      q.eq("ownerId", ownerId).eq("storageId", storageId),
    )
    .unique();
}

/** A stat block image's layout, or null until a browser has measured it. */
export async function statBlockLayout(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  storageId: Id<"_storage"> | undefined,
) {
  if (!storageId) return null;
  const layout = await findLayout(ctx, ownerId, storageId);
  if (!layout) return null;
  return {
    width: layout.width,
    height: layout.height,
    columns: layout.columnsOverride ?? layout.columns,
    content: layout.content,
    split: layout.split ?? null,
  };
}

// Layouts are per owner, so writing one only affects the writer's own views.
export const saveStatBlockLayout = mutation({
  args: {
    storageId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    columns: statBlockColumns,
    content: imageBox,
    split: v.optional(v.array(imageBox)),
  },
  handler: async (ctx, { storageId, ...measured }) => {
    const ownerId = await requireUserId(ctx);
    const existing = await findLayout(ctx, ownerId, storageId);
    if (existing) {
      // Keeps any override; a re-measure only refreshes the detection.
      await ctx.db.replace("statBlockLayouts", existing._id, {
        ...measured,
        ownerId,
        storageId,
        columnsOverride: existing.columnsOverride,
      });
    } else {
      await ctx.db.insert("statBlockLayouts", {
        ...measured,
        ownerId,
        storageId,
      });
    }
  },
});

export const setStatBlockColumns = mutation({
  args: { storageId: v.id("_storage"), columns: statBlockColumns },
  handler: async (ctx, { storageId, columns }) => {
    const ownerId = await requireUserId(ctx);
    const existing = await findLayout(ctx, ownerId, storageId);
    if (!existing) throw new ConvexError("Stat block hasn't been measured yet");
    await ctx.db.patch("statBlockLayouts", existing._id, {
      columnsOverride: columns === existing.columns ? undefined : columns,
    });
  },
});
