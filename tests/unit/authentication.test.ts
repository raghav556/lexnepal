import { describe, expect, it, vi } from "vitest";
import { toCurrentSessionDto } from "@/server/auth/dto";
import { SessionService, hashToken } from "@/server/auth/session-service";
import type {
  AuthUser,
  IdentityVerifier,
  NewSession,
  SessionRepository,
  StoredSession,
} from "@/server/auth/types";

const activeUser: AuthUser = {
  id: "user-1",
  firmId: "firm-1",
  tokenIdentifier: "https://id.example|subject-1",
  name: "Asha",
  email: "asha@example.com",
  role: "associate",
  isActive: true,
  isPending: false,
  avatar: null,
  phone: null,
  activationToken: "secret-activation",
  passwordHash: "secret-password-hash",
  totpSecret: "secret-totp",
};

class FakeRepository implements SessionRepository {
  user: AuthUser | null = activeUser;
  storedSession: StoredSession | null = null;
  created?: NewSession;
  revoked?: string;

  async findUserByTokenIdentifiers(): Promise<AuthUser | null> {
    return this.user;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    return tokenHash === hashToken("valid-token") ? this.storedSession : null;
  }

  async createSession(session: NewSession): Promise<{ id: string }> {
    this.created = session;
    return { id: "session-1" };
  }

  async touchSession(): Promise<void> {}

  async revokeSession(sessionId: string): Promise<void> {
    this.revoked = sessionId;
  }

  async getRolePermissions(): Promise<unknown> {
    return undefined;
  }
}

const verifier: IdentityVerifier = {
  verifyAccessToken: vi.fn(async () => ({
    subject: "subject-1",
    issuer: "https://id.example",
    tokenIdentifier: "https://id.example|subject-1",
  })),
};

function createService(repository = new FakeRepository()): SessionService {
  return new SessionService(repository, verifier, {
    cookieName: "lexnepal_session",
    ttlSeconds: 3600,
    now: () => new Date("2026-08-02T00:00:00.000Z"),
  });
}

describe("session security boundary", () => {
  it("rejects anonymous requests", async () => {
    await expect(createService().requireSession(new Request("http://local"))).rejects.toMatchObject(
      {
        code: "UNAUTHENTICATED",
        status: 401,
      },
    );
  });

  it.each([
    [{ ...activeUser, isActive: false }, "Account is suspended"],
    [{ ...activeUser, isPending: true }, "Account activation is pending"],
  ])("rejects suspended and pending users", async (user, message) => {
    const repository = new FakeRepository();
    repository.user = user;
    const request = new Request("http://local", {
      headers: { authorization: "Bearer oidc-token" },
    });
    await expect(createService(repository).requireSession(request)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message,
    });
  });

  it("exchanges only a verified bearer identity for a hashed local session", async () => {
    const repository = new FakeRepository();
    const issued = await createService(repository).issueSession(
      new Request("http://local", { headers: { authorization: "Bearer oidc-token" } }),
      { requestId: "request-1", ipAddress: "127.0.0.1", userAgent: "test" },
    );
    expect(issued.token).toHaveLength(43);
    expect(repository.created?.tokenHash).toBe(hashToken(issued.token));
    expect(repository.created?.tokenHash).not.toBe(issued.token);
    expect(repository.created).toMatchObject({ firmId: "firm-1", userId: "user-1" });
  });

  it("rejects expired and revoked browser sessions", async () => {
    const repository = new FakeRepository();
    repository.storedSession = {
      id: "session-1",
      firmId: "firm-1",
      userId: "user-1",
      identitySubject: "subject-1",
      expiresAt: new Date("2026-08-01T00:00:00.000Z"),
      revokedAt: null,
      user: activeUser,
    };
    const request = new Request("http://local", {
      headers: { cookie: "lexnepal_session=valid-token" },
    });
    await expect(createService(repository).requireSession(request)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("revokes the current local session", async () => {
    const repository = new FakeRepository();
    repository.storedSession = {
      id: "session-1",
      firmId: "firm-1",
      userId: "user-1",
      identitySubject: "subject-1",
      expiresAt: new Date("2026-08-03T00:00:00.000Z"),
      revokedAt: null,
      user: activeUser,
    };
    const service = createService(repository);
    const principal = await service.requireSession(
      new Request("http://local", { headers: { cookie: "lexnepal_session=valid-token" } }),
    );
    await service.revokeCurrentSession(principal);
    expect(repository.revoked).toBe("session-1");
  });
});

describe("safe session DTO", () => {
  it("excludes password, TOTP, activation and token identifiers", () => {
    const dto = toCurrentSessionDto({
      user: activeUser,
      firmId: activeUser.firmId,
      capabilities: new Set(["documents.read"]),
      sessionId: "session-1",
      authenticationMethod: "session_cookie",
    });
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("totpSecret");
    expect(serialized).not.toContain("activationToken");
    expect(serialized).not.toContain("tokenIdentifier");
    expect(dto.user).toMatchObject({ id: "user-1", firmId: "firm-1", role: "associate" });
  });
});
