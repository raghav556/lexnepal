import fs from "node:fs";
import path from "node:path";

const migrationFiles = fs
  .readdirSync("drizzle")
  .filter((file) => file.endsWith(".sql") && !file.endsWith(".down.sql"))
  .sort()
  .map((file) => path.join("drizzle", file));

function purposeFor(index) {
  if (index.name === "documents_search_fulltext_idx")
    return "Full-text document discovery by title description and extracted text";
  if (index.unique) return `Enforce ${index.table} business or tenant uniqueness`;
  const name = index.name;
  if (name.includes("case")) return `Firm-scoped ${index.table} lookup by case`;
  if (
    name.includes("user") ||
    name.includes("assignee") ||
    name.includes("lawyer") ||
    name.includes("author")
  )
    return `Firm-scoped ${index.table} lookup by responsible user`;
  if (
    name.includes("status") ||
    name.includes("approved") ||
    name.includes("active") ||
    name.includes("read")
  )
    return `Firm-scoped ${index.table} status queue or filter`;
  if (
    name.includes("date") ||
    name.includes("due") ||
    name.includes("created") ||
    name.includes("expiry")
  )
    return `Firm-scoped ${index.table} chronological or reminder query`;
  if (name.includes("document")) return `Firm-scoped ${index.table} lookup by document`;
  if (name.includes("client")) return `Firm-scoped ${index.table} lookup by client`;
  if (name.includes("parent")) return `Firm-scoped ${index.table} hierarchy traversal`;
  if (
    name.includes("category") ||
    name.includes("type") ||
    name.includes("practice") ||
    name.includes("role")
  )
    return `Firm-scoped ${index.table} classification filter`;
  return `Documented operational lookup for ${index.table}`;
}

const indexes = [];
const droppedTables = new Set();
const droppedIndexes = new Set();
for (const file of migrationFiles) {
  const sql = fs.readFileSync(file, "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    const droppedTable = statement.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?([a-zA-Z0-9_]+)"?/i);
    if (droppedTable) droppedTables.add(droppedTable[1]);
    const droppedIndex = statement.match(/DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?"?([a-zA-Z0-9_]+)"?/i);
    if (droppedIndex) droppedIndexes.add(droppedIndex[1]);
    const tableMatch = statement.match(/CREATE\s+TABLE\s+`?([a-zA-Z0-9_]+)`?/i);
    if (tableMatch) {
      for (const unique of statement.matchAll(
        /CONSTRAINT\s+`?([a-zA-Z0-9_]+)`?\s+UNIQUE\s*\(([^)]*)\)/gi,
      )) {
        const index = {
          table: tableMatch[1],
          index: unique[1],
          unique: true,
          columnsOrExpression: unique[2].replace(/\s+/g, " ").replaceAll("`", "").trim(),
          migration: file.replaceAll("\\", "/"),
        };
        indexes.push({ ...index, queryPattern: purposeFor({ ...index, name: index.index }) });
      }
    }
    const match = statement.match(
      /CREATE\s+(?:(UNIQUE|FULLTEXT)\s+)?INDEX\s+`?([a-zA-Z0-9_]+)`?\s+ON\s+`?([a-zA-Z0-9_]+)`?\s*\(([\s\S]*?)\)/i,
    );
    if (!match) continue;
    droppedIndexes.delete(match[2]);
    const index = {
      table: match[3],
      index: match[2],
      unique: match[1]?.toUpperCase() === "UNIQUE",
      columnsOrExpression: match[4].replace(/\s+/g, " ").replaceAll("`", "").trim(),
      migration: file.replaceAll("\\", "/"),
    };
    indexes.push({ ...index, queryPattern: purposeFor({ ...index, name: index.index }) });
  }
}

const activeIndexes = indexes.filter(
  (index) => !droppedTables.has(index.table) && !droppedIndexes.has(index.index),
);
activeIndexes.sort((a, b) => `${a.table}.${a.index}`.localeCompare(`${b.table}.${b.index}`));
fs.mkdirSync("doc/migration", { recursive: true });
fs.writeFileSync("db/index-manifest.json", `${JSON.stringify(activeIndexes, null, 2)}\n`);

const headers = [
  "Table",
  "Index",
  "Unique",
  "Columns/expression",
  "Documented query pattern",
  "Migration",
];
const quote = (value) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const rows = activeIndexes.map((index) => [
  index.table,
  index.index,
  index.unique ? "yes" : "no",
  index.columnsOrExpression,
  index.queryPattern,
  index.migration,
]);
fs.writeFileSync(
  "doc/migration/index-query-map.csv",
  `${[headers, ...rows].map((row) => row.map(quote).join(",")).join("\n")}\n`,
);
console.log(`Documented ${activeIndexes.length} active MySQL indexes.`);
