import "server-only";

export const USER_ROLES = [
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
  "admin",
  "client",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const CAPABILITIES = [
  "users.manage",
  "users.view_directory",
  "clients.view_all",
  "clients.manage",
  "kyc.review",
  "cases.view_all",
  "cases.manage",
  "conflicts.manage",
  "finance.manage",
  "hr.manage",
  "cms.manage",
  "cms.content_submit",
  "audit.view",
  "settings.manage",
  "documents.read",
  "documents.upload",
  "documents.share",
  "documents.delete",
  "records.dispose",
  "legalHold.manage",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export interface AuthUser {
  id: string;
  firmId: string;
  tokenIdentifier: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  isPending: boolean;
  avatar: string | null;
  phone: string | null;
  twoFactorEnabled?: boolean;
  twoFactorRequired?: boolean;
  activationToken?: string | null;
  passwordHash?: string | null;
  totpSecret?: string | null;
}

export interface AuthPrincipal {
  user: AuthUser;
  firmId: string;
  capabilities: ReadonlySet<Capability>;
  sessionId: string | null;
  authenticationMethod: "hercules_bearer" | "session_cookie";
}

export interface VerifiedIdentity {
  subject: string;
  issuer: string;
  tokenIdentifier: string;
  email?: string;
  name?: string;
}

export interface StoredSession {
  id: string;
  firmId: string;
  userId: string;
  identitySubject: string | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  user: AuthUser;
}

export interface NewSession {
  firmId: string;
  userId: string;
  identitySubject: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  requestId: string;
}

export interface SessionRepository {
  findUserByTokenIdentifiers(tokenIdentifiers: readonly string[]): Promise<AuthUser | null>;
  findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null>;
  createSession(session: NewSession): Promise<{ id: string }>;
  touchSession(sessionId: string, at: Date): Promise<void>;
  revokeSession(sessionId: string, actorId: string, reason: string, at: Date): Promise<void>;
  getRolePermissions(firmId: string): Promise<unknown>;
}

export interface IdentityVerifier {
  verifyAccessToken(token: string): Promise<VerifiedIdentity>;
}
