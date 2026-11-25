import { expect, type Locator } from '@playwright/test';

/** The data rows of a table (not its header row). */
export function dataRows(table: Locator): Locator {
  return table.getByRole('row').filter({ has: table.page().getByRole('cell') });
}

/** The cell of `row` in the column headed `header` (found by the header's position, not a fixed index). */
export async function cellUnder(table: Locator, row: Locator, header: string): Promise<Locator> {
  // allInnerTexts doesn't wait: wait for the row (the table is rendered with its header by then).
  await expect(row).toBeVisible();
  const headers = (await table.getByRole('columnheader').allInnerTexts()).map(it => it.trim());
  const index = headers.indexOf(header);
  expect(index, `column '${header}' in [${headers.join(', ')}]`).toBeGreaterThanOrEqual(0);
  return row.getByRole('cell').nth(index);
}
