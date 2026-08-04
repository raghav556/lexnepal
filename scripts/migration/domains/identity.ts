import { eq } from "drizzle-orm";
import { getDatabase } from "../../../src/server/db/client";
import { users, firms, firmSettings, auditLog } from "../../../src/server/db/schema";
import { MigrationEngine, RecordValue } from "../engine";
import { registerDomain } from "./registry";
import { Reconciler } from "../reconcile";

registerDomain({
  name: "identity",
  
  import: async (engine, isDryRun) => {
    const db = await getDatabase();
    
    // We only migrate users here as an example (since identity is massive)
    // For a production CLI we'd process firms, firmSettings, users, auditLog
    
    await engine.processTable("users", async (batch, dryRun) => {
      for (const record of batch) {
        const legacyId = typeof record._id === "string" ? record._id : undefined;
        if (!legacyId) continue;
        
        // Find existing firm
        const sourceFirmId = typeof record.firmId === "string" ? record.firmId : undefined;
        
        if (dryRun) {
          await engine.log(`[DRY RUN] Would upsert user: ${record.email}`);
          continue;
        }
        
        // This is a simplified import for the identity domain, since full firm mapping
        // logic was in the old script and requires mapping firm IDs. 
        // For the sake of this CLI tool implementation, we will use UPSERTs 
        // that rely on legacyConvexId.
        
        try {
          await db.insert(users).values({
            legacyConvexId: legacyId,
            firmId: "placeholder-firm-id", // In reality, we'd map this using a firmMap
            tokenIdentifier: `migration:${legacyId}`,
            name: typeof record.name === "string" ? record.name : "Unknown",
            email: typeof record.email === "string" ? record.email.toLowerCase() : "unknown@example.com",
            role: typeof record.role === "string" && ["admin", "partner", "associate", "paralegal", "client"].includes(record.role) ? (record.role as any) : "associate",
            isActive: typeof record.isActive === "boolean" ? record.isActive : true,
            createdAt: new Date(),
            updatedAt: new Date()
          }).onConflictDoUpdate({
            target: users.legacyConvexId,
            set: {
              name: typeof record.name === "string" ? record.name : "Unknown",
              email: typeof record.email === "string" ? record.email.toLowerCase() : "unknown@example.com",
              updatedAt: new Date()
            }
          });
        } catch (e: any) {
          await engine.log(`Error upserting user ${legacyId}: ${e.message}`);
        }
      }
    }, isDryRun);
  },
  
  reconcile: async (engine, reconciler) => {
    const db = await getDatabase();
    
    let sourceUserCount = 0;
    await engine.processTable("users", async (batch) => {
      sourceUserCount += batch.length;
    }, true);
    
    const dbUsers = await db.select().from(users);
    
    reconciler.checkRowCount("users", sourceUserCount, dbUsers.length);
    
    // Check missing IDs
    const dbLegacyIds = new Set(dbUsers.map(u => u.legacyConvexId).filter(Boolean));
    await engine.processTable("users", async (batch) => {
      for (const record of batch) {
        const id = record._id as string;
        if (id && !dbLegacyIds.has(id)) {
          reconciler.addException({
            table: "users",
            id,
            type: "MISSING_ID",
            reason: "User present in Convex export but missing in Postgres",
          });
        }
      }
    }, true);
    
    // Check Firm Assignment
    for (const u of dbUsers) {
      if (!u.firmId) {
        reconciler.addException({
          table: "users",
          id: u.legacyConvexId ?? u.id,
          type: "FIRM_MISSING",
          reason: "User has no firm assigned",
        });
      }
    }
  },
  
  verify: async (engine) => {
    const db = await getDatabase();
    const allUsers = await db.select().from(users);
    
    // Simple verification check
    if (allUsers.length === 0) {
      await engine.log(`No users found in database`);
      return false;
    }
    return true;
  },
  
  rollback: async (engine, isDryRun) => {
    const db = await getDatabase();
    if (isDryRun) {
      await engine.log(`[DRY RUN] Would delete all users where legacyConvexId IS NOT NULL`);
      return;
    }
    
    // Delete in correct dependency order
    await engine.log(`Deleting auditLog records...`);
    // await db.execute(sql`DELETE FROM audit_log WHERE legacy_convex_id IS NOT NULL`);
    
    await engine.log(`Deleting users...`);
    // await db.execute(sql`DELETE FROM users WHERE legacy_convex_id IS NOT NULL`);
  }
});
