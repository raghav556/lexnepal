import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import * as ts from "typescript";

const root = process.cwd();
const convexDir = path.join(root, "convex");
const srcDir = path.join(root, "src");
const outputDir = path.join(root, "doc", "migration");
const knownKinds = new Set([
  "query",
  "mutation",
  "action",
  "internalQuery",
  "internalMutation",
  "internalAction",
]);
const internalKinds = new Set(["internalQuery", "internalMutation", "internalAction"]);
const authHelpers = [
  "requireAuth",
  "requireRole",
  "requirePermission",
  "requireFirmId",
  "getUserByIdentity",
  "requireDocumentRead",
  "requireDocumentAccess",
  "requireCaseAccess",
  "assertDocument",
];

function walk(dir, extensions) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "_generated")
      continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute, extensions));
    else if (extensions.some((extension) => entry.name.endsWith(extension))) files.push(absolute);
  }
  return files.sort();
}

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function sourceFile(file) {
  const text = fs.readFileSync(file, "utf8");
  return {
    text,
    ast: ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  };
}

function lineOf(ast, node) {
  return ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
}

function compact(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function snakeCase(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function csvCell(value) {
  const stringValue = String(value ?? "");
  return /[",\r\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

function csv(columns, rows) {
  return `${columns.map(csvCell).join(",")}\n${rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")).join("\n")}\n`;
}

function propertyName(node, ast) {
  if (!node) return "";
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node))
    return node.text;
  return compact(node.getText(ast));
}

function objectProperty(object, name) {
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined;
  return object.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) &&
      propertyName(property.name, object.getSourceFile()) === name,
  )?.initializer;
}

function callName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return "";
}

function literals(regex, text) {
  return [...text.matchAll(regex)].map((match) => match[1]);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function observedReturnContract(handlerNode, ast) {
  if (!handlerNode || (!ts.isArrowFunction(handlerNode) && !ts.isFunctionExpression(handlerNode)))
    return "no handler found";
  if (!ts.isBlock(handlerNode.body))
    return `implicit return: ${compact(handlerNode.body.getText(ast))}`;
  const returns = [];
  function visit(node, root = false) {
    if (!root && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node)) {
      returns.push(node.expression ? compact(node.expression.getText(ast)) : "void");
      return;
    }
    ts.forEachChild(node, (child) => visit(child));
  }
  visit(handlerNode.body, true);
  return returns.length
    ? `observed return expressions: ${unique(returns).join(" | ")}`
    : "void/no explicit return";
}

function extractFunctions() {
  const functions = [];
  for (const file of walk(convexDir, [".ts"])) {
    if (
      file.includes(`${path.sep}lib${path.sep}`) ||
      file.endsWith("schema.ts") ||
      file.endsWith("crons.ts") ||
      file.endsWith("auth.config.ts")
    )
      continue;
    const { ast } = sourceFile(file);
    const moduleName = path.basename(file, ".ts");
    for (const statement of ast.statements) {
      if (
        !ts.isVariableStatement(statement) ||
        !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      )
        continue;
      for (const declaration of statement.declarationList.declarations) {
        if (
          !ts.isIdentifier(declaration.name) ||
          !declaration.initializer ||
          !ts.isCallExpression(declaration.initializer)
        )
          continue;
        const kind = callName(declaration.initializer.expression);
        if (!knownKinds.has(kind)) continue;
        const definition = declaration.initializer.arguments[0];
        const argsNode = objectProperty(definition, "args");
        const returnsNode = objectProperty(definition, "returns");
        const handlerNode = objectProperty(definition, "handler");
        const handlerText = handlerNode
          ? handlerNode.getText(ast)
          : declaration.initializer.getText(ast);
        const allText = declaration.initializer.getText(ast);
        const tableReads = literals(/\.(?:query)\(\s*["']([^"']+)["']/g, handlerText);
        const tableWrites = literals(/\.insert\(\s*["']([^"']+)["']/g, handlerText);
        const indexes = literals(/\.withIndex\(\s*["']([^"']+)["']/g, handlerText);
        const storage = unique(literals(/ctx\.storage\.([A-Za-z0-9_]+)/g, handlerText));
        const scheduled = unique([
          ...literals(/ctx\.scheduler\.([A-Za-z0-9_]+)/g, handlerText),
          ...literals(/ctx\.run(Action|Mutation|Query)\s*\(/g, handlerText).map(
            (value) => `run${value}`,
          ),
        ]);
        const authorization = unique(
          authHelpers.filter((helper) => new RegExp(`\\b${helper}\\s*\\(`).test(allText)),
        );
        const capabilities = unique(
          literals(/requirePermission\([^,]+,\s*["']([^"']+)["']/g, allText),
        );
        const roles = unique(
          literals(/requireRole\([^,]+,\s*\[([^\]]+)\]/g, allText).flatMap((value) =>
            literals(/["']([^"']+)["']/g, value),
          ),
        );
        const sideEffects = [];
        if (tableWrites.length) sideEffects.push(`inserts: ${unique(tableWrites).join("|")}`);
        if (/\.patch\s*\(/.test(handlerText)) sideEffects.push("database patch");
        if (/\.delete\s*\(/.test(handlerText)) sideEffects.push("database delete");
        if (/audit|writeUserAudit/i.test(handlerText)) sideEffects.push("audit");
        if (/notif|notifyUser/i.test(handlerText)) sideEffects.push("notification");
        if (/sendEmail|sendSms|email|sms/i.test(handlerText)) sideEffects.push("communication");
        if (storage.length) sideEffects.push(`storage: ${storage.join("|")}`);
        if (scheduled.length) sideEffects.push(`async: ${scheduled.join("|")}`);
        functions.push({
          module: moduleName,
          exportName: declaration.name.text,
          kind,
          visibility: internalKinds.has(kind) ? "internal" : "public",
          sourceFile: relative(file),
          sourceLine: lineOf(ast, declaration),
          args: argsNode ? compact(argsNode.getText(ast)) : "{}",
          returns: returnsNode
            ? `declared validator: ${compact(returnsNode.getText(ast))}`
            : observedReturnContract(handlerNode, ast),
          tables: unique([...tableReads, ...tableWrites]),
          indexes,
          storage,
          scheduled,
          authorization: authorization.length
            ? `${authorization.join("|")}${capabilities.length ? `; capabilities=${capabilities.join("|")}` : ""}${roles.length ? `; roles=${roles.join("|")}` : ""}`
            : "no explicit auth helper detected",
          tenant: /requireFirmId|firmId|requireDocument|requireCaseAccess/.test(allText)
            ? "tenant/resource scope detected"
            : "no explicit tenant scope detected",
          sideEffects: unique(sideEffects),
          rawText: allText,
        });
      }
    }
  }
  return functions.sort((a, b) =>
    `${a.module}.${a.exportName}`.localeCompare(`${b.module}.${b.exportName}`),
  );
}

function unwrap(node) {
  let current = node;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current))
  )
    current = current.expression;
  return current;
}

function apiPath(node) {
  const current = unwrap(node);
  if (!current) return null;
  if (ts.isIdentifier(current) && (current.text === "api" || current.text === "internal"))
    return { root: current.text, parts: [] };
  if (ts.isPropertyAccessExpression(current)) {
    const parent = apiPath(current.expression);
    return parent ? { root: parent.root, parts: [...parent.parts, current.name.text] } : null;
  }
  if (
    ts.isElementAccessExpression(current) &&
    current.argumentExpression &&
    ts.isStringLiteral(current.argumentExpression)
  ) {
    const parent = apiPath(current.expression);
    return parent
      ? { root: parent.root, parts: [...parent.parts, current.argumentExpression.text] }
      : null;
  }
  return null;
}

function enclosingHook(node) {
  let current = node;
  for (let depth = 0; current?.parent && depth < 8; depth += 1, current = current.parent) {
    if (ts.isCallExpression(current.parent)) {
      const name = callName(unwrap(current.parent.expression));
      if (["useQuery", "useMutation", "useAction"].includes(name)) return name;
    }
  }
  return "direct reference";
}

function extractConsumers() {
  const consumers = [];
  for (const file of walk(srcDir, [".ts", ".tsx"])) {
    if (
      file.endsWith(`${path.sep}convex-mock.tsx`) ||
      file.endsWith(`${path.sep}convex-client-stub.ts`)
    )
      continue;
    const { ast } = sourceFile(file);
    function visit(node) {
      const pathInfo = apiPath(node);
      const parentPath = node.parent ? apiPath(node.parent) : null;
      if (
        pathInfo?.root === "api" &&
        pathInfo.parts.length >= 2 &&
        (!parentPath || parentPath.parts.length <= pathInfo.parts.length)
      ) {
        consumers.push({
          file: relative(file),
          line: lineOf(ast, node),
          usage: enclosingHook(node),
          module: pathInfo.parts[0],
          exportName: pathInfo.parts[1],
          endpoint: `${pathInfo.parts[0]}.${pathInfo.parts[1]}`,
          unsafeCast: /as\s+any/.test(node.getText(ast)) ? "yes" : "no",
        });
        return;
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  const seen = new Set();
  return consumers
    .filter((consumer) => {
      const key = `${consumer.file}:${consumer.line}:${consumer.endpoint}:${consumer.usage}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) =>
      `${a.file}:${String(a.line).padStart(6, "0")}`.localeCompare(
        `${b.file}:${String(b.line).padStart(6, "0")}`,
      ),
    );
}

function baseDefineTable(node) {
  let current = node;
  while (ts.isCallExpression(current)) {
    if (ts.isIdentifier(current.expression) && current.expression.text === "defineTable")
      return current;
    if (ts.isPropertyAccessExpression(current.expression)) current = current.expression.expression;
    else break;
  }
  return null;
}

function chainedDefinitions(node, method, ast) {
  const definitions = [];
  let current = node;
  while (ts.isCallExpression(current)) {
    if (
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.name.text === method
    ) {
      definitions.push(
        compact(current.arguments.map((argument) => argument.getText(ast)).join(", ")),
      );
      current = current.expression.expression;
    } else if (ts.isPropertyAccessExpression(current.expression))
      current = current.expression.expression;
    else break;
  }
  return definitions.reverse();
}

function extractTables() {
  const file = path.join(convexDir, "schema.ts");
  const { ast } = sourceFile(file);
  const tables = [];
  function visit(node) {
    if (
      ts.isExportAssignment(node) &&
      ts.isCallExpression(node.expression) &&
      callName(node.expression.expression) === "defineSchema"
    ) {
      const schema = node.expression.arguments[0];
      if (schema && ts.isObjectLiteralExpression(schema)) {
        for (const property of schema.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const tableCall = baseDefineTable(property.initializer);
          if (!tableCall) continue;
          const validator = tableCall.arguments[0]?.getText(ast) ?? "{}";
          tables.push({
            table: propertyName(property.name, ast),
            line: lineOf(ast, property),
            validator: compact(validator),
            indexes: chainedDefinitions(property.initializer, "index", ast),
            searchIndexes: chainedDefinitions(property.initializer, "searchIndex", ast),
            firmId: /\bfirmId\s*:/.test(validator) ? "yes" : "no",
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return tables.sort((a, b) => a.table.localeCompare(b.table));
}

function extractDependencies() {
  const dependencies = [];
  for (const file of walk(convexDir, [".ts"])) {
    if (file.includes(`${path.sep}_generated${path.sep}`)) continue;
    const { text, ast } = sourceFile(file);
    for (const match of text.matchAll(/ctx\.storage\.([A-Za-z0-9_]+)/g)) {
      dependencies.push({
        type: "storage",
        source: relative(file),
        line: ast.getLineAndCharacterOfPosition(match.index).line + 1,
        operation: match[1],
        target: "Convex managed storage",
      });
    }
    for (const match of text.matchAll(
      /ctx\.scheduler\.(runAfter|runAt)\s*\([\s\S]{0,180}?internal\.([A-Za-z0-9_.]+)/g,
    )) {
      dependencies.push({
        type: "scheduler",
        source: relative(file),
        line: ast.getLineAndCharacterOfPosition(match.index).line + 1,
        operation: match[1],
        target: match[2],
      });
    }
    for (const match of text.matchAll(
      /ctx\.run(Action|Mutation|Query)\(\s*internal\.([A-Za-z0-9_.]+)/g,
    )) {
      dependencies.push({
        type: "internal call",
        source: relative(file),
        line: ast.getLineAndCharacterOfPosition(match.index).line + 1,
        operation: `run${match[1]}`,
        target: match[2],
      });
    }
    for (const match of text.matchAll(
      /crons\.(daily|hourly|weekly|monthly|interval|cron)\s*\([\s\S]{0,240}?internal\.([A-Za-z0-9_.]+)/g,
    )) {
      dependencies.push({
        type: "cron",
        source: relative(file),
        line: ast.getLineAndCharacterOfPosition(match.index).line + 1,
        operation: match[1],
        target: match[2],
      });
    }
  }
  for (const file of walk(srcDir, [".ts", ".tsx"])) {
    if (file.endsWith(`${path.sep}convex-mock.tsx`)) continue;
    const { text, ast } = sourceFile(file);
    const uploadPatterns = [
      /fetch\(\s*(postUrl|uploadUrl)\b/g,
      /\.open\(\s*["']POST["']\s*,\s*(postUrl|uploadUrl)\b/g,
    ];
    for (const regex of uploadPatterns) {
      for (const match of text.matchAll(regex)) {
        dependencies.push({
          type: "browser storage upload",
          source: relative(file),
          line: ast.getLineAndCharacterOfPosition(match.index).line + 1,
          operation: match[0].startsWith("fetch") ? "fetch POST" : "XHR POST",
          target: `${match[1]} from documents.generateUploadUrl or users.generateUploadUrl`,
        });
      }
    }
  }
  return dependencies.sort((a, b) =>
    `${a.source}:${String(a.line).padStart(6, "0")}`.localeCompare(
      `${b.source}:${String(b.line).padStart(6, "0")}`,
    ),
  );
}

function detectMockCoverage(endpoint) {
  const mock = fs.readFileSync(path.join(srcDir, "lib", "convex-mock.tsx"), "utf8");
  return mock.includes(`includes(\"${endpoint}\")`) ||
    mock.includes(`includes('${endpoint}')`) ||
    mock.includes(`includes(\"${endpoint.split(".")[1]}\")`) ||
    mock.includes(`includes('${endpoint.split(".")[1]}')`)
    ? "heuristic match"
    : "no explicit branch detected";
}

function domainFor(module) {
  const map = {
    users: "identity",
    settings: "administration",
    auditLog: "administration",
    analytics: "reporting",
    documents: "documents",
    documentSecurity: "documents",
    tags: "documents",
    envelopes: "signatures",
    cases: "matters",
    clients: "matters",
    conflictChecks: "matters",
    hearings: "court",
    court: "court",
    tasks: "work-management",
    appointments: "appointments",
    communications: "communications",
    messages: "communications",
    notifications: "communications",
    templates: "knowledge",
    research: "knowledge",
    cms: "website",
    leads: "crm",
    chatbots: "crm",
    hr: "hr",
    seed: "administration",
  };
  return map[module] ?? module;
}

function writeInventories() {
  const functions = extractFunctions();
  const consumers = extractConsumers();
  const tables = extractTables();
  const dependencies = extractDependencies();
  const functionByEndpoint = new Map(functions.map((fn) => [`${fn.module}.${fn.exportName}`, fn]));
  const callersByEndpoint = new Map();
  for (const consumer of consumers) {
    const list = callersByEndpoint.get(consumer.endpoint) ?? [];
    list.push(`${consumer.file}:${consumer.line} (${consumer.usage})`);
    callersByEndpoint.set(consumer.endpoint, list);
  }

  const endpointColumns = [
    "Domain",
    "Convex module",
    "Convex export",
    "Kind",
    "Source",
    "Frontend callers",
    "Tables",
    "Indexes",
    "Authorization",
    "Tenant scope",
    "Side effects",
    "Decision",
    "Next service",
    "Next endpoint/action",
    "Request contract",
    "Response contract",
    "Migration script",
    "Tests",
    "Status",
    "Owner",
    "Cutover",
    "Rollback",
  ];
  const endpointRows = functions.map((fn) => ({
    Domain: domainFor(fn.module),
    "Convex module": fn.module,
    "Convex export": fn.exportName,
    Kind: fn.kind,
    Source: `${fn.sourceFile}:${fn.sourceLine}`,
    "Frontend callers": (callersByEndpoint.get(`${fn.module}.${fn.exportName}`) ?? []).join(" | "),
    Tables: fn.tables.join(" | "),
    Indexes: fn.indexes.join(" | "),
    Authorization: fn.authorization,
    "Tenant scope": fn.tenant,
    "Side effects": fn.sideEffects.join(" | "),
    Decision: "migrate",
    "Next service": "TBD",
    "Next endpoint/action": internalKinds.has(fn.kind)
      ? "internal service/worker TBD"
      : "/api/v1 TBD",
    "Request contract": fn.args,
    "Response contract": fn.returns,
    "Migration script": "TBD",
    Tests:
      fn.module === "documents" || fn.module === "documentSecurity"
        ? "tests/characterization/document-security.test.mjs (partial)"
        : "TBD",
    Status: "inventoried",
    Owner: "TBD",
    Cutover: "TBD",
    Rollback: "restore Convex authority per rollback-runbook.md",
  }));
  fs.writeFileSync(path.join(outputDir, "endpoint-parity.csv"), csv(endpointColumns, endpointRows));

  const consumerColumns = [
    "Frontend file",
    "Line",
    "Usage",
    "Endpoint",
    "Convex export exists",
    "Mock behavior",
    "Unsafe cast",
    "Decision",
    "Status",
    "Notes",
  ];
  const consumerRows = consumers.map((consumer) => {
    const exists = functionByEndpoint.has(consumer.endpoint);
    return {
      "Frontend file": consumer.file,
      Line: consumer.line,
      Usage: consumer.usage,
      Endpoint: consumer.endpoint,
      "Convex export exists": exists ? "yes" : "no",
      "Mock behavior": detectMockCoverage(consumer.endpoint),
      "Unsafe cast": consumer.unsafeCast,
      Decision: exists ? "migrate" : "currently_simulated",
      Status: "inventoried",
      Notes: exists
        ? ""
        : "No matching Convex export; confirm intended behavior before replacement",
    };
  });
  fs.writeFileSync(
    path.join(outputDir, "frontend-consumers.csv"),
    csv(consumerColumns, consumerRows),
  );

  const tableColumns = [
    "Convex table",
    "Source",
    "Current validator",
    "Indexes",
    "Search indexes",
    "firmId field",
    "Target MySQL table",
    "Legacy ID strategy",
    "Decision",
    "Status",
    "Owner",
    "Notes",
  ];
  const phase3Implemented = fs.existsSync(path.join(root, "db", "schema.ts"));
  const normalizedChildren = {
    users: "user_educations | user_practice_areas | user_notable_cases",
    clients: "client_kyc_files",
    cases: "case_team_members",
    templates: "template_variables",
    documents: "document_tag_assignments",
    tasks: "task_watchers",
    sopTemplates: "sop_template_tasks",
    messages: "message_attachments | message_reads",
    researchNotes: "research_note_tags",
    careers: "career_requirements",
  };
  const tableRows = tables.map((table) => ({
    "Convex table": table.table,
    Source: `convex/schema.ts:${table.line}`,
    "Current validator": table.validator,
    Indexes: table.indexes.join(" | "),
    "Search indexes": table.searchIndexes.join(" | "),
    "firmId field": table.firmId,
    "Target MySQL table": snakeCase(table.table),
    "Legacy ID strategy":
      "new UUID primary key; preserve Convex ID in unique legacy_convex_id during migration",
    Decision: "migrate",
    Status: phase3Implemented ? "implemented" : "inventoried",
    Owner: phase3Implemented ? "Data owner role" : "TBD",
    Notes: phase3Implemented
      ? `${table.table === "firms" ? "Global firm registry" : "Target firm_id is NOT NULL"}${normalizedChildren[table.table] ? `; normalized children: ${normalizedChildren[table.table]}` : ""}`
      : table.firmId === "no"
        ? "Tenant ownership must be resolved during schema design"
        : "",
  }));
  fs.writeFileSync(path.join(outputDir, "table-mapping.csv"), csv(tableColumns, tableRows));

  const normalizationColumns = [
    "Convex table",
    "Convex array/object field",
    "Target table",
    "Target representation",
    "Tenant rule",
    "Status",
  ];
  const normalizationRows = [
    [
      "users",
      "education",
      "user_educations",
      "ordered rows",
      "firm_id NOT NULL and same-firm FK",
      "implemented",
    ],
    [
      "users",
      "practiceAreas",
      "user_practice_areas",
      "unique rows",
      "firm_id NOT NULL and same-firm FK",
      "implemented",
    ],
    [
      "users",
      "notableCases",
      "user_notable_cases",
      "ordered rows",
      "firm_id NOT NULL and same-firm FK",
      "implemented",
    ],
    [
      "clients",
      "kycDocuments/kycFiles",
      "client_kyc_files",
      "typed file rows",
      "firm_id NOT NULL and same-firm FK",
      "implemented",
    ],
    [
      "cases",
      "teamMemberIds",
      "case_team_members",
      "case/user join rows",
      "firm_id NOT NULL and same-firm FKs",
      "implemented",
    ],
    [
      "templates",
      "variables",
      "template_variables",
      "ordered unique rows",
      "firm_id NOT NULL and same-firm FK",
      "implemented",
    ],
    [
      "documents",
      "tags",
      "document_tag_assignments",
      "document/tag join rows",
      "firm_id NOT NULL and same-firm FKs",
      "implemented",
    ],
    [
      "tasks",
      "watchers",
      "task_watchers",
      "task/user join rows",
      "firm_id NOT NULL and same-firm FKs",
      "implemented",
    ],
    [
      "sopTemplates",
      "taskTitles",
      "sop_template_tasks",
      "ordered rows",
      "firm_id NOT NULL and same-firm FK",
      "implemented",
    ],
    [
      "messages",
      "attachmentIds",
      "message_attachments",
      "ordered file rows",
      "firm_id NOT NULL and same-firm FK",
      "implemented",
    ],
    [
      "messages",
      "readBy",
      "message_reads",
      "message/user rows with read_at",
      "firm_id NOT NULL and same-firm FKs",
      "implemented",
    ],
    [
      "researchNotes",
      "tags",
      "research_note_tags",
      "unique rows",
      "firm_id NOT NULL and same-firm FK",
      "implemented",
    ],
    [
      "careers",
      "requirements",
      "career_requirements",
      "ordered rows",
      "firm_id NOT NULL and same-firm FK",
      "implemented",
    ],
  ].map((values) =>
    Object.fromEntries(normalizationColumns.map((column, index) => [column, values[index]])),
  );
  fs.writeFileSync(
    path.join(outputDir, "normalization-map.csv"),
    csv(normalizationColumns, normalizationRows),
  );

  const dependencyColumns = [
    "Type",
    "Source",
    "Line",
    "Operation",
    "Target/dependency",
    "Decision",
    "Status",
    "Notes",
  ];
  const dependencyRows = dependencies.map((dependency) => ({
    Type: dependency.type,
    Source: dependency.source,
    Line: dependency.line,
    Operation: dependency.operation,
    "Target/dependency": dependency.target,
    Decision: "replace",
    Status: "inventoried",
    Notes:
      dependency.type === "storage" || dependency.type === "browser storage upload"
        ? "Replace with private object-storage adapter and quarantined upload grant"
        : dependency.type === "cron" || dependency.type === "scheduler"
          ? "Replace with durable scheduler/queue"
          : "Replace with internal domain-service call",
  }));
  fs.writeFileSync(
    path.join(outputDir, "runtime-dependencies.csv"),
    csv(dependencyColumns, dependencyRows),
  );

  const modules = unique(functions.map((fn) => fn.module));
  const domainColumns = [
    "Domain",
    "Convex module",
    "Queries",
    "Mutations",
    "Actions",
    "Internal functions",
    "Tables accessed",
    "Frontend consumer files",
    "Storage operations",
    "Async operations",
    "Decision",
    "Status",
    "Owner",
  ];
  const domainRows = modules.map((moduleName) => {
    const members = functions.filter((fn) => fn.module === moduleName);
    const moduleConsumers = consumers.filter((consumer) => consumer.module === moduleName);
    return {
      Domain: domainFor(moduleName),
      "Convex module": moduleName,
      Queries: members.filter((fn) => fn.kind === "query").length,
      Mutations: members.filter((fn) => fn.kind === "mutation").length,
      Actions: members.filter((fn) => fn.kind === "action").length,
      "Internal functions": members.filter((fn) => internalKinds.has(fn.kind)).length,
      "Tables accessed": unique(members.flatMap((fn) => fn.tables)).join(" | "),
      "Frontend consumer files": unique(moduleConsumers.map((consumer) => consumer.file)).join(
        " | ",
      ),
      "Storage operations": unique(members.flatMap((fn) => fn.storage)).join(" | "),
      "Async operations": unique(members.flatMap((fn) => fn.scheduled)).join(" | "),
      Decision: "migrate",
      Status: "inventoried",
      Owner: "TBD",
    };
  });
  fs.writeFileSync(path.join(outputDir, "domain-inventory.csv"), csv(domainColumns, domainRows));

  const missingEndpoints = unique(
    consumers
      .filter((consumer) => !functionByEndpoint.has(consumer.endpoint))
      .map((consumer) => consumer.endpoint),
  );
  const noTenantTables = tables
    .filter((table) => table.firmId === "no")
    .map((table) => table.table);
  const publicWithoutAuth = functions.filter(
    (fn) => fn.visibility === "public" && fn.authorization === "no explicit auth helper detected",
  );
  const summary = `# Phase 1 Inventory Summary\n\n**Regenerate with:** \`npm run migration:inventory\`\n\n## Counts\n\n| Item | Count |\n|---|---:|\n| Convex tables | ${tables.length} |\n| Convex exported functions | ${functions.length} |\n| Public queries | ${functions.filter((fn) => fn.kind === "query").length} |\n| Public mutations | ${functions.filter((fn) => fn.kind === "mutation").length} |\n| Public actions | ${functions.filter((fn) => fn.kind === "action").length} |\n| Internal functions | ${functions.filter((fn) => internalKinds.has(fn.kind)).length} |\n| Direct frontend API references | ${consumers.length} |\n| Frontend files with API references | ${unique(consumers.map((consumer) => consumer.file)).length} |\n| Runtime storage/scheduler/internal-call dependencies | ${dependencies.length} |\n| Frontend references without a Convex export | ${missingEndpoints.length} |\n| Tables without a direct \`firmId\` field | ${noTenantTables.length} |\n| Public exports without a detected auth helper | ${publicWithoutAuth.length} |\n\n## Classification\n\nAll existing Convex exports and tables are initially classified as \`migrate\`; this prevents silent retirement. Frontend endpoints without a matching export are classified as \`currently_simulated\`. Any later \`merge\`, \`replace\`, or \`retire\` decision requires owner approval and evidence in the parity ledger.\n\n## Static-analysis limitations\n\n- Request validators are captured exactly; observed return expressions are recorded because most current handlers do not declare \`returns\` validators.\n- Table access through shared helpers or an ID-only \`ctx.db.get/patch/delete\` cannot always be attributed statically.\n- Auth, tenant, audit and notification fields report detected calls, not proof of correctness.\n- Mock coverage is a heuristic based on branch text and must not be treated as behavioral parity.\n- Dynamic API construction beyond \`api.<module>.<export>\` requires manual review.\n\n## Unresolved references\n\n${missingEndpoints.length ? missingEndpoints.map((endpoint) => `- \`${endpoint}\``).join("\n") : "- None detected."}\n\n## Tables requiring tenant-ownership design\n\n${noTenantTables.map((table) => `- \`${table}\``).join("\n")}\n`;
  fs.writeFileSync(path.join(outputDir, "INVENTORY_SUMMARY.md"), summary);

  const invalidDecisions = [...endpointRows, ...consumerRows, ...tableRows].filter(
    (row) =>
      !["migrate", "merge", "replace", "retire", "currently_simulated"].includes(row.Decision),
  );
  if (invalidDecisions.length)
    throw new Error(`${invalidDecisions.length} rows do not have a controlled migration decision`);
  console.log(
    JSON.stringify(
      {
        tables: tables.length,
        functions: functions.length,
        consumers: consumers.length,
        dependencies: dependencies.length,
        missingEndpoints,
        publicWithoutDetectedAuth: publicWithoutAuth.length,
      },
      null,
      2,
    ),
  );
}

fs.mkdirSync(outputDir, { recursive: true });
writeInventories();
