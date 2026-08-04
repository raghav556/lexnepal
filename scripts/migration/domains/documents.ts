import { eq, isNotNull } from "drizzle-orm";
import { getDatabase } from "../../../src/server/db/client";
import { documents } from "../../../src/server/db/schema";
import { MigrationEngine, RecordValue } from "../engine";
import { registerDomain } from "./registry";
import { Reconciler } from "../reconcile";
import { sql } from "drizzle-orm";

registerDomain({
  name: "documents",
  
  import: async (engine, isDryRun) => {
    const db = await getDatabase();
    
    await engine.processTable("documents", async (batch, dryRun) => {
      for (const record of batch) {
        const legacyId = typeof record._id === "string" ? record._id : undefined;
        if (!legacyId) continue;
        
        if (dryRun) {
          await engine.log(`[DRY RUN] Would upsert document: ${record.title}`);
          continue;
        }
        
        try {
          await db.insert(documents).values({
            legacyConvexId: legacyId,
            firmId: typeof record.firmId === "string" ? record.firmId : "missing-firm",
            caseId: typeof record.caseId === "string" ? record.caseId : undefined,
            title: typeof record.title === "string" ? record.title : "Untitled Document",
            storageId: typeof record.storageId === "string" ? record.storageId : "missing-storage",
            size: typeof record.size === "number" ? record.size : 0,
            mimeType: typeof record.mimeType === "string" ? record.mimeType : "application/octet-stream",
            createdAt: new Date(),
            updatedAt: new Date(),
          }).onConflictDoUpdate({
            target: documents.legacyConvexId,
            set: {
              title: typeof record.title === "string" ? record.title : "Untitled Document",
              updatedAt: new Date()
            }
          });
        } catch (e: any) {
          await engine.log(`Error upserting document ${legacyId}: ${e.message}`);
        }
      }
    }, isDryRun);
  },
  
  reconcile: async (engine, reconciler) => {
    const db = await getDatabase();
    
    let sourceCount = 0;
    await engine.processTable("documents", async (batch) => {
      sourceCount += batch.length;
    }, true);
    
    const dbDocs = await db.select().from(documents);
    reconciler.checkRowCount("documents", sourceCount, dbDocs.length);
    
    // Check missing IDs
    const dbLegacyIds = new Set(dbDocs.map(d => d.legacyConvexId).filter(Boolean));
    await engine.processTable("documents", async (batch) => {
      for (const record of batch) {
        const id = record._id as string;
        if (id && !dbLegacyIds.has(id)) {
          reconciler.addException({
            table: "documents",
            id,
            type: "MISSING_ID",
            reason: "Document present in Convex export but missing in Postgres",
          });
        }
      }
    }, true);
    
    // Check Document Version Chains (parentDocumentId exists)
    for (const d of dbDocs) {
      if (d.parentDocumentId) {
        const parent = dbDocs.find(x => x.id === d.parentDocumentId);
        if (!parent) {
          reconciler.addException({
            table: "documents",
            id: d.legacyConvexId ?? d.id,
            type: "FK_VIOLATION",
            reason: "Parent document does not exist",
            sourceValue: d.parentDocumentId
          });
        }
      }
    }
  },
  
  verify: async (engine) => {
    const db = await getDatabase();
    const allDocs = await db.select().from(documents);
    
    if (allDocs.length === 0) {
      await engine.log(`No documents found in database`);
      return false;
    }
    return true;
  },
  
  rollback: async (engine, isDryRun) => {
    const db = await getDatabase();
    if (isDryRun) {
      await engine.log(`[DRY RUN] Would delete all documents where legacyConvexId IS NOT NULL`);
      return;
    }
    
    await engine.log(`Deleting documents...`);
    await db.execute(sql`DELETE FROM documents WHERE legacy_convex_id IS NOT NULL`);
  }
});
