import "server-only";
import type { AuthPrincipal } from "@/server/auth/types";

export interface CurrentSessionDto {
  user: {
    id: string;
    firmId: string;
    name: string | null;
    email: string | null;
    role: string;
    avatar: string | null;
    phone: string | null;
  };
  capabilities: string[];
  authenticationMethod: AuthPrincipal["authenticationMethod"];
}

export function toCurrentSessionDto(principal: AuthPrincipal): CurrentSessionDto {
  const { user } = principal;
  return {
    user: {
      id: user.id,
      firmId: user.firmId,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
    },
    capabilities: [...principal.capabilities].sort(),
    authenticationMethod: principal.authenticationMethod,
  };
}
