type Page<T> = { data: T[] | null; error: unknown };

const DEFAULT_PAGE_SIZE = 1000;

/**
 * Pages through a PostgREST query until the server runs out of rows.
 *
 * A single `select()` is capped server-side, so a plain query silently drops
 * everything past that cap. For an export that is presented to the owner as a
 * full backup, losing rows without saying so is worse than failing outright.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<Page<T>>,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);

    if (error) {
      throw new Error(
        `Не удалось выгрузить данные: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (!data?.length) break;

    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return rows;
}
