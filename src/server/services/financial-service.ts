import "server-only";
import type { AuditContext } from "@/server/audit/context";
import type { AuthPrincipal } from "@/server/auth/types";
import {
  assertResourceInFirm,
  requireCapability,
  requireCaseAccess,
  requireClientOwnership,
  requireFirmContext,
} from "@/server/policies/authorization";
import { PostgresFinancialRepository } from "@/server/repositories/financial-repository";
import { PostgresSecurityRepository } from "@/server/repositories/security-repository";
import type {
  ExpenseApproveInput,
  ExpenseCreateInput,
  ExpenseListInput,
  InitiateGatewayInput,
  InvoiceFromTimeInput,
  InvoiceListInput,
  InvoiceStatusUpdateInput,
  PayInvoiceInput,
  TimeEntryCreateInput,
  TimeEntryListInput,
  TrustCreateInput,
  TrustListInput,
} from "@/shared/contracts/financial";
import { AppError } from "@/shared/errors/api-error";

const repository = new PostgresFinancialRepository();
const security = new PostgresSecurityRepository();

function requireStaffWriter(principal: AuthPrincipal) {
  if (principal.user.role === "client") {
    throw new AppError("FORBIDDEN", "Clients cannot modify firm financial records", 403);
  }
  if (principal.capabilities.has("finance.manage") || principal.capabilities.has("cases.manage")) {
    return;
  }
  throw new AppError("FORBIDDEN", "Access denied: missing permission finance.manage", 403);
}

function requireFinanceManager(principal: AuthPrincipal) {
  requireCapability(principal, "finance.manage");
}

export class FinancialService {
  async listInvoices(principal: AuthPrincipal, filters: InvoiceListInput) {
    const { firmId } = requireFirmContext(principal);
    if (principal.user.role === "client") {
      const client = await security.getClientByUser(principal.user.id);
      if (!client) return [];
      return repository.listInvoices(firmId, { ...filters, clientId: client.id });
    }
    if (filters.caseId) await requireCaseAccess(principal, filters.caseId, security);
    return repository.listInvoices(firmId, filters);
  }

  async createInvoiceFromTimeEntries(
    principal: AuthPrincipal,
    input: InvoiceFromTimeInput,
    audit: AuditContext,
  ) {
    requireFinanceManager(principal);
    await requireCaseAccess(principal, input.caseId, security);
    const client = await security.getClient(input.clientId);
    assertResourceInFirm(principal, client?.firmId, "Client was not found");
    return repository.createInvoiceFromTimeEntries(requireFirmContext(principal).firmId, input, audit);
  }

  async updateInvoiceStatus(
    principal: AuthPrincipal,
    invoiceId: string,
    input: InvoiceStatusUpdateInput,
    audit: AuditContext,
  ) {
    requireFinanceManager(principal);
    return repository.updateInvoiceStatus(
      requireFirmContext(principal).firmId,
      invoiceId,
      input,
      audit,
    );
  }

  async payInvoice(
    principal: AuthPrincipal,
    invoiceId: string,
    input: PayInvoiceInput,
    audit: AuditContext,
  ) {
    const { firmId } = requireFirmContext(principal);
    const invoice = await repository.getInvoice(firmId, invoiceId);
    if (!invoice) throw new AppError("NOT_FOUND", "Invoice was not found", 404);
    if (principal.user.role === "client") {
      await requireClientOwnership(principal, String(invoice.clientId), security);
    } else {
      requireFinanceManager(principal);
    }
    return repository.payInvoice(firmId, invoiceId, input, audit);
  }

  async initiateGatewayPayment(
    principal: AuthPrincipal,
    invoiceId: string,
    input: InitiateGatewayInput,
    audit: AuditContext,
  ) {
    const { firmId } = requireFirmContext(principal);
    const invoice = await repository.getInvoice(firmId, invoiceId);
    if (!invoice) throw new AppError("NOT_FOUND", "Invoice was not found", 404);
    if (principal.user.role === "client") {
      await requireClientOwnership(principal, String(invoice.clientId), security);
    } else {
      requireFinanceManager(principal);
    }
    return repository.initiateGatewayPayment(firmId, invoiceId, input, audit);
  }

  async listTimeEntries(principal: AuthPrincipal, filters: TimeEntryListInput) {
    const { firmId } = requireFirmContext(principal);
    if (principal.user.role === "client") {
      throw new AppError("FORBIDDEN", "Clients cannot list staff time entries", 403);
    }
    if (filters.caseId) await requireCaseAccess(principal, filters.caseId, security);
    return repository.listTimeEntries(firmId, filters);
  }

  async createTimeEntry(principal: AuthPrincipal, input: TimeEntryCreateInput, audit: AuditContext) {
    requireStaffWriter(principal);
    await requireCaseAccess(principal, input.caseId, security);
    return repository.createTimeEntry(
      requireFirmContext(principal).firmId,
      principal.user.id,
      input,
      audit,
    );
  }

  async deleteTimeEntry(principal: AuthPrincipal, entryId: string, audit: AuditContext) {
    requireStaffWriter(principal);
    return repository.deleteTimeEntry(requireFirmContext(principal).firmId, entryId, audit);
  }

  async listTrustTransactions(principal: AuthPrincipal, filters: TrustListInput) {
    const { firmId } = requireFirmContext(principal);
    if (principal.user.role === "client") {
      const client = await security.getClientByUser(principal.user.id);
      if (!client) return [];
      return repository.listTrustTransactions(firmId, { ...filters, clientId: client.id });
    }
    return repository.listTrustTransactions(firmId, filters);
  }

  async createTrustTransaction(
    principal: AuthPrincipal,
    input: TrustCreateInput,
    audit: AuditContext,
  ) {
    requireFinanceManager(principal);
    const client = await security.getClient(input.clientId);
    assertResourceInFirm(principal, client?.firmId, "Client was not found");
    if (input.caseId) await requireCaseAccess(principal, input.caseId, security);
    return repository.createTrustTransaction(
      requireFirmContext(principal).firmId,
      principal.user.id,
      input,
      audit,
    );
  }

  async listExpenses(principal: AuthPrincipal, filters: ExpenseListInput) {
    requireStaffWriter(principal);
    const { firmId } = requireFirmContext(principal);
    if (filters.caseId) await requireCaseAccess(principal, filters.caseId, security);
    return repository.listExpenses(firmId, filters);
  }

  async getExpenseStats(principal: AuthPrincipal) {
    requireStaffWriter(principal);
    return repository.getExpenseStats(requireFirmContext(principal).firmId);
  }

  async createExpense(principal: AuthPrincipal, input: ExpenseCreateInput, audit: AuditContext) {
    requireStaffWriter(principal);
    if (input.caseId) await requireCaseAccess(principal, input.caseId, security);
    return repository.createExpense(
      requireFirmContext(principal).firmId,
      principal.user.id,
      input,
      audit,
    );
  }

  async approveExpense(
    principal: AuthPrincipal,
    expenseId: string,
    input: ExpenseApproveInput,
    audit: AuditContext,
  ) {
    requireFinanceManager(principal);
    return repository.approveExpense(
      requireFirmContext(principal).firmId,
      expenseId,
      principal.user.id,
      input,
      audit,
    );
  }

  async deleteExpense(principal: AuthPrincipal, expenseId: string, audit: AuditContext) {
    requireFinanceManager(principal);
    return repository.deleteExpense(requireFirmContext(principal).firmId, expenseId, audit);
  }
}

let service: FinancialService | undefined;
export function getFinancialService() {
  service ??= new FinancialService();
  return service;
}
