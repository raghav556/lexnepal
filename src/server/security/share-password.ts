import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const SHARE_PASSWORD_ITERATIONS = 210_000;

export function hashSharePassword(password: string): string {
  if (password.length < 10 || password.length > 128) {
    throw new Error("Share passwords must be between 10 and 128 characters");
  }
  const salt = randomBytes(16).toString("hex");
  const derived = pbkdf2Sync(password, Buffer.from(salt, "hex"), SHARE_PASSWORD_ITERATIONS, 32, "sha256");
  return `pbkdf2-sha256$${SHARE_PASSWORD_ITERATIONS}$${salt}$${derived.toString("hex")}`;
}

export function verifySharePassword(password: string, encoded: string): boolean {
  const [algorithm, iterationsRaw, saltHex, expectedHex] = encoded.split("$");
  const iterations = Number(iterationsRaw);
  if (algorithm !== "pbkdf2-sha256" || !saltHex || !expectedHex || !Number.isInteger(iterations)) {
    return false;
  }
  const expected = Buffer.from(expectedHex, "hex");
  const actual = pbkdf2Sync(password, Buffer.from(saltHex, "hex"), iterations, expected.length, "sha256");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
