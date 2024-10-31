import type { StatColumn } from "@/server/api/columns-router";

function addColumn(columns: StatColumn[], newColumn: StatColumn): StatColumn[] {
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

export const StatColumnUtils = {
  addColumn,
};
