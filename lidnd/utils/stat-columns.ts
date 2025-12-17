import type { StatColumn } from "@/server/api/columns-router";
import type { ParticipantWithData } from "@/server/api/router";
import type { StatColumnInsert } from "@/server/db/schema";
export type ColumnWithParticipants = StatColumn & {
  participants: ParticipantWithData[];
};

function add<
  NewC extends StatColumnInsert,
  BaseC extends StatColumnInsert & { id: string }
>(columns: BaseC[], newColumn: NewC) {
  const numColumns = columns.length;
  if (numColumns === 0) {
    // first added column, take up the whole space
    return [{ ...newColumn, percent_width: 100 }];
  }
  const newPercentWidth = 100 / (numColumns + 1);
  const amountToSubtractFromOthers = newPercentWidth / numColumns;
  const updatedColumns = columns.map((c) => ({
    ...c,
    percent_width: c.percent_width - amountToSubtractFromOthers,
  }));
  const ret = [
    ...updatedColumns,
    { ...newColumn, percent_width: newPercentWidth },
  ];
  return ret;
}

function remove<C extends StatColumn>(columns: C[], columnId: string): C[] {
  const columnToDelete = columns.find((c) => c.id === columnId);
  if (!columnToDelete) {
    throw new Error(`could not find target delete column inside columns`);
  }
  const numRemainingColumns = columns.length - 1;
  const widthToRedistribute =
    columnToDelete.percent_width / numRemainingColumns;
  const removed = columns.reduce((acc, c) => {
    if (c.id === columnId) {
      return acc;
    }
    return [
      ...acc,
      { ...c, percent_width: c.percent_width + widthToRedistribute },
    ];
  }, [] as C[]);
  return removed;
}

export const StatColumnUtils = {
  add,
  remove,
  equalize<C extends StatColumn>(columns: C[]): C[] {
    const homeColumn = columns.find((c) => c.is_home_column);
    const numColumnsNotHome = columns.filter((c) => !c.is_home_column).length;
    const toAllocate = 100 - (homeColumn ? homeColumn.percent_width : 0);
    const updatedWidth = toAllocate / numColumnsNotHome;
    return columns.map((c) => {
      if (c.is_home_column) {
        return c;
      }
      return { ...c, percent_width: updatedWidth };
    });
  },
};
