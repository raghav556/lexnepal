/**
 * R6 cutover dress-rehearsal domain catalog.
 * Maps migration CLI domains → UI backend flags, fixtures, and local soak guidance.
 */
import path from "node:path";

const firmA = "61000000-0000-4000-8000-000000000001";
const firmMap = "tests/fixtures/convex-identity-firm-map.json";
const storageFirmMap = "tests/fixtures/convex-export/firm-map.json";

export type CutoverDomain = {
  /** Migration CLI `--domain` name */
  domain: string;
  /** Human label for the cutover log */
  label: string;
  /** Historical `VITE_BACKEND_*` keys; unset = Next-only after Convex decommission */
  backendFlags: string[];
  exportPath: string;
  extraArgs: string[];
  /** Suggested local soak from REMAINING_WORK_PLAN R6 */
  localSoak: string;
  /** Optional npm script for deeper verify (slow); prove uses CLI verify by default */
  verifyNpmScript?: string;
  noOpImport?: boolean;
};

export const CUTOVER_DOMAINS: CutoverDomain[] = [
  {
    domain: "identity",
    label: "Identity / users / firm",
    backendFlags: ["VITE_BACKEND_IDENTITY"],
    exportPath: "tests/fixtures/convex-identity-export",
    extraArgs: ["--firm-map", firmMap],
    localSoak: "covered by every domain rehearsal",
    verifyNpmScript: "auth:verify-boundary",
  },
  {
    domain: "cms",
    label: "Public CMS",
    backendFlags: ["VITE_BACKEND_CMS"],
    exportPath: "tests/fixtures/convex-cms-export",
    extraArgs: ["--target-firm", firmA],
    localSoak: "1 day of normal local use",
    verifyNpmScript: "cms:verify-local",
  },
  {
    domain: "matters",
    label: "Cases / clients",
    backendFlags: ["VITE_BACKEND_CASES", "VITE_BACKEND_CLIENTS"],
    exportPath: "tests/fixtures/convex-matters-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
    localSoak: "2–3 days",
    verifyNpmScript: "matters:verify-local",
  },
  {
    domain: "work-management",
    label: "Tasks / hearings / appointments / research",
    backendFlags: [
      "VITE_BACKEND_TASKS",
      "VITE_BACKEND_HEARINGS",
      "VITE_BACKEND_APPOINTMENTS",
      "VITE_BACKEND_RESEARCH",
    ],
    exportPath: "tests/fixtures/convex-work-management-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
    localSoak: "1–2 days",
    verifyNpmScript: "work-management:verify-local",
  },
  {
    domain: "financial",
    label: "Billing / finance",
    backendFlags: ["VITE_BACKEND_FINANCE"],
    exportPath: "tests/fixtures/convex-financial-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
    localSoak: "3+ days",
    verifyNpmScript: "financial:verify-local",
  },
  {
    domain: "crm",
    label: "CRM / leads",
    backendFlags: ["VITE_BACKEND_LEADS"],
    exportPath: "tests/fixtures/convex-crm-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
    localSoak: "1–2 days",
    verifyNpmScript: "crm:verify-local",
  },
  {
    domain: "communication",
    label: "Messages / notifications",
    backendFlags: ["VITE_BACKEND_MESSAGES", "VITE_BACKEND_NOTIFICATIONS"],
    exportPath: "tests/fixtures/convex-communication-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
    localSoak: "1–2 days",
    verifyNpmScript: "communication:verify-local",
  },
  {
    domain: "documents",
    label: "Documents",
    backendFlags: ["VITE_BACKEND_DOCUMENTS"],
    exportPath: "tests/fixtures/convex-export",
    extraArgs: ["--firm-map", storageFirmMap],
    localSoak: "2–3 days",
    verifyNpmScript: "documents:verify-local",
  },
  {
    domain: "envelopes",
    label: "Signatures / envelopes",
    backendFlags: ["VITE_BACKEND_ENVELOPES"],
    exportPath: "tests/fixtures/convex-envelopes-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
    localSoak: "3+ days",
    verifyNpmScript: "envelopes:verify-local",
  },
  {
    domain: "hr",
    label: "HR",
    backendFlags: ["VITE_BACKEND_HR"],
    exportPath: "tests/fixtures/convex-hr-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
    localSoak: "1 day",
    verifyNpmScript: "hr:verify-local",
  },
  {
    domain: "analytics",
    label: "Analytics",
    backendFlags: ["VITE_BACKEND_ANALYTICS"],
    exportPath: "tests/fixtures/convex-identity-export",
    extraArgs: [],
    localSoak: "1 day",
    verifyNpmScript: "analytics:verify-local",
    noOpImport: true,
  },
  {
    domain: "storage",
    label: "Object storage migration",
    backendFlags: [],
    exportPath: "tests/fixtures/convex-export",
    extraArgs: ["--firm-map", storageFirmMap],
    localSoak: "covered with documents",
    verifyNpmScript: "storage:verify-local",
  },
];

export function resolveExportPath(relative: string): string {
  return path.resolve(process.cwd(), relative);
}
