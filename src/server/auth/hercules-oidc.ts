import "server-only";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { AppError } from "@/shared/errors/api-error";
import type { IdentityVerifier, VerifiedIdentity } from "@/server/auth/types";

interface DiscoveryDocument {
  issuer: string;
  jwks_uri: string;
}

export class HerculesOidcVerifier implements IdentityVerifier {
  private discovery?: Promise<DiscoveryDocument>;

  constructor(
    private readonly authority: string,
    private readonly clientId: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private getDiscovery(): Promise<DiscoveryDocument> {
    if (!this.discovery) {
      this.discovery = (async () => {
        const url = new URL(
          ".well-known/openid-configuration",
          `${this.authority.replace(/\/$/, "")}/`,
        );
        const response = await this.fetcher(url, { headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(`OIDC discovery failed with ${response.status}`);
        const body = (await response.json()) as Partial<DiscoveryDocument>;
        if (!body.issuer || !body.jwks_uri)
          throw new Error("OIDC discovery response is incomplete");
        return { issuer: body.issuer, jwks_uri: body.jwks_uri };
      })();
    }
    return this.discovery;
  }

  async verifyAccessToken(token: string): Promise<VerifiedIdentity> {
    try {
      const discovery = await this.getDiscovery();
      const keys = createRemoteJWKSet(new URL(discovery.jwks_uri));
      const verified = await jwtVerify(token, keys, {
        issuer: discovery.issuer,
        audience: this.clientId,
        algorithms: ["RS256", "ES256"],
      });
      return identityFromClaims(verified.payload, discovery.issuer);
    } catch {
      throw new AppError(
        "UNAUTHENTICATED",
        "The identity-provider token is invalid or expired",
        401,
      );
    }
  }
}

function identityFromClaims(payload: JWTPayload, issuer: string): VerifiedIdentity {
  if (!payload.sub) throw new Error("OIDC subject is missing");
  const explicitIdentifier = payload.tokenIdentifier;
  return {
    subject: payload.sub,
    issuer,
    tokenIdentifier:
      typeof explicitIdentifier === "string" ? explicitIdentifier : `${issuer}|${payload.sub}`,
    ...(typeof payload.email === "string" ? { email: payload.email } : {}),
    ...(typeof payload.name === "string" ? { name: payload.name } : {}),
  };
}
