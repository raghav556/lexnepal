import "server-only";
import type { MySqlRawQueryResult } from "drizzle-orm/mysql2";

export async function returningInsert<T>(
  insertedIds: PromiseLike<Array<{ id: string }>>,
  load: (id: string) => Promise<T[]>,
): Promise<T[]> {
  const [inserted] = await insertedIds;
  return inserted ? load(inserted.id) : [];
}

export async function returningMutation<T>(
  mutation: PromiseLike<MySqlRawQueryResult>,
  load: () => Promise<T[]>,
): Promise<T[]> {
  const [result] = await mutation;
  return result.affectedRows > 0 ? load() : [];
}

export async function returningUpsert<T>(
  mutation: PromiseLike<MySqlRawQueryResult>,
  load: () => Promise<T[]>,
): Promise<T[]> {
  await mutation;
  return load();
}

export async function returningDelete<T>(
  load: () => Promise<T[]>,
  remove: () => PromiseLike<MySqlRawQueryResult>,
): Promise<T[]> {
  const rows = await load();
  if (rows.length === 0) return [];
  const [result] = await remove();
  return result.affectedRows > 0 ? rows : [];
}
