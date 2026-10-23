/** Legacy immutable SQL compares zero timestamps, rejected by MySQL 8's zero-date modes.
 * Keep strict validation and restore the exact original connection settings on every exit.
 * The caller must use this same dedicated connection for all migration statements.
 */
export async function withMigrationSession(connection, run) {
  const [[original]] = await connection.query(
    "SELECT @@session.sql_mode AS sqlMode, @@session.time_zone AS timezone",
  );
  const legacyMode = original.sqlMode
    .split(",")
    .filter((mode) => !["NO_ZERO_DATE", "NO_ZERO_IN_DATE"].includes(mode))
    .join(",");
  try {
    await connection.query("SET SESSION sql_mode = ?", [legacyMode]);
    await connection.query("SET SESSION time_zone = '+00:00'");
    return await run();
  } finally {
    await connection.query("SET SESSION sql_mode = ?", [original.sqlMode]);
    await connection.query("SET SESSION time_zone = ?", [original.timezone]);
  }
}
