import type { StatColumn } from "@/server/api/columns-router";
import type { ParticipantWithData } from "@/server/api/router";
export type ColumnWithParticipants = StatColumn & {
  participants: ParticipantWithData[];
};

function add<C extends StatColumn>(columns: C[], newColumn: C): C[] {
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
  return [...updatedColumns, { ...newColumn, percent_width: newPercentWidth }];
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
};
