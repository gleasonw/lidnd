import { Doc, Id, TableNames } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

// Tables a combat action can change. Undo/redo patches fields back and forth;
// rows are never hard-deleted, so ids stay valid across undo and redo.
type Tracked =
  | "runs"
  | "runParticipants"
  | "runTurnGroups"
  | "runEffects"
  | "runReminders"
  | "sessions";

type Fields = Record<string, unknown>;
export type Change = {
  table: string;
  id: string;
  before: Fields;
  after: Fields;
};

// Convex values can't hold `undefined`, so unset optional fields are stored as
// null in the log and turned back into `undefined` (unset) when applied.
const toStored = (value: unknown) => (value === undefined ? null : value);
const fromStored = (fields: Fields) =>
  Object.fromEntries(
    Object.entries(fields).map(([k, value]) => [k, value ?? undefined]),
  );

export class RunLog {
  private changes: Change[] = [];

  constructor(
    private ctx: MutationCtx,
    private runId: Id<"runs">,
  ) {}

  async patch<T extends Tracked>(table: T, id: Id<T>, fields: Partial<Doc<T>>) {
    const doc = (await this.ctx.db.get(table, id)) as Fields | null;
    if (doc === null) throw new Error(`Missing ${table} ${id}`);
    const before: Fields = {};
    const after: Fields = {};
    for (const [key, value] of Object.entries(fields)) {
      if (doc[key] === value) continue;
      before[key] = toStored(doc[key]);
      after[key] = toStored(value);
    }
    if (Object.keys(after).length === 0) return;
    await this.ctx.db.patch(table, id, fields);
    this.changes.push({ table, id, before, after });
  }

  /** Inserts a row with `removed: false`; undo marks it removed. */
  async insert<T extends "runParticipants" | "runEffects">(
    table: T,
    value: Omit<Doc<T>, "_id" | "_creationTime" | "removed">,
  ): Promise<Id<T>> {
    const id = (await this.ctx.db.insert(table, {
      ...value,
      removed: false,
    } as never)) as Id<T>;
    this.changes.push({
      table,
      id,
      before: { removed: true },
      after: { removed: false },
    });
    return id;
  }

  /** Saves the action and clears the redo stack. No-op if nothing changed. */
  async commit(label: string) {
    if (this.changes.length === 0) return;
    await clearRedo(this.ctx, this.runId);
    await this.ctx.db.insert("runActions", {
      runId: this.runId,
      label,
      changes: this.changes,
      undone: false,
    });
  }
}

async function clearRedo(ctx: MutationCtx, runId: Id<"runs">) {
  const undone = await ctx.db
    .query("runActions")
    .withIndex("by_runId_and_undone", (q) =>
      q.eq("runId", runId).eq("undone", true),
    )
    .take(500);
  for (const action of undone) {
    await ctx.db.delete("runActions", action._id);
  }
}

export async function applyChanges(
  ctx: MutationCtx,
  changes: Change[],
  direction: "before" | "after",
) {
  // Undo applies changes in reverse order.
  const ordered = direction === "before" ? [...changes].reverse() : changes;
  for (const change of ordered) {
    await ctx.db.patch(
      change.table as TableNames,
      change.id as Id<TableNames>,
      fromStored(change[direction]),
    );
  }
}

export async function deleteRunLog(ctx: MutationCtx, runId: Id<"runs">) {
  for (const undone of [false, true]) {
    const actions = await ctx.db
      .query("runActions")
      .withIndex("by_runId_and_undone", (q) =>
        q.eq("runId", runId).eq("undone", undone),
      )
      .take(1000);
    for (const action of actions) {
      await ctx.db.delete("runActions", action._id);
    }
  }
}
