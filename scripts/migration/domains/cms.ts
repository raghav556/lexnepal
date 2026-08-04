import { migrateCmsExport } from "../../../src/server/services/cms-migration";
import {
  blogPosts,
  careers,
  cmsSettings,
  jobApplications,
  legalPages,
  navigation,
  newsAndAwards,
  newsletterSubscribers,
  practiceAreas,
  resources,
  testimonials,
} from "../../../src/server/db/schema";
import {
  registerExportDomain,
  readLegacyIdsFromExport,
  softDeleteByLegacyIds,
} from "./create-export-domain";

registerExportDomain({
  name: "cms",
  tables: [
    "testimonials",
    "practiceAreas",
    "blogPosts",
    "resources",
    "newsAndAwards",
    "careers",
    "jobApplications",
    "legalPages",
    "cmsSettings",
    "newsletterSubscribers",
    "navigation",
  ],
  notes: ["CMS import uses --target-firm (or --orphan-firm / first firm-map value)."],
  migrate: async ({ exportPath, targetFirmId, orphanFirmId, firmMap }) => {
    const firmId = targetFirmId ?? orphanFirmId ?? Object.values(firmMap)[0];
    if (!firmId) throw new Error("CMS requires --target-firm or --firm-map / --orphan-firm");
    return migrateCmsExport({ exportPath, targetFirmId: firmId });
  },
  rollback: async ({ exportPath, isDryRun, log }) => {
    const pairs = [
      ["testimonials", testimonials],
      ["practiceAreas", practiceAreas],
      ["blogPosts", blogPosts],
      ["resources", resources],
      ["newsAndAwards", newsAndAwards],
      ["careers", careers],
      ["jobApplications", jobApplications],
      ["legalPages", legalPages],
      ["cmsSettings", cmsSettings],
      ["newsletterSubscribers", newsletterSubscribers],
      ["navigation", navigation],
    ] as const;
    for (const [tableName, table] of pairs) {
      const ids = await readLegacyIdsFromExport(exportPath, tableName);
      await softDeleteByLegacyIds({ tableName, table, legacyIds: ids, isDryRun, log });
    }
  },
});
