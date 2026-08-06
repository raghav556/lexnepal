/** Parse TOTP secret from an otpauth:// URI returned by Better Auth. */
export function parseTotpSecret(otpauthUri: string): string | null {
  try {
    return new URL(otpauthUri).searchParams.get("secret");
  } catch {
    return null;
  }
}

export type TotpEnrollmentPayload = {
  otpauthUrl: string;
  secret: string | null;
  backupCodes: string[];
};

export function normalizeTotpEnrollment(data: {
  totpURI: string;
  backupCodes: string[];
}): TotpEnrollmentPayload {
  return {
    otpauthUrl: data.totpURI,
    secret: parseTotpSecret(data.totpURI),
    backupCodes: data.backupCodes,
  };
}
