import type pg from "pg";

export type DatabaseTransaction = Pick<pg.PoolClient, "query">;

export async function withTransaction<T>(
  pool: pg.Pool,
  configure: (client: DatabaseTransaction) => Promise<void>,
  operation: (client: DatabaseTransaction) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  let transactionOpen = false;
  let discardClient = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await configure(client);
    const result = await operation(client);
    await client.query("COMMIT");
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        discardClient = true;
        throw new AggregateError([error, rollbackError], "Database transaction and rollback both failed");
      }
    }
    throw error;
  } finally {
    client.release(discardClient);
  }
}
