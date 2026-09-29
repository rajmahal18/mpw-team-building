import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashSecret(secret: string, minLength = 1): Promise<string> {
  if (secret.length < minLength) throw new Error(`Secret must be at least ${minLength} characters`);
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(secret, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function hashPassword(password: string): Promise<string> {
  return hashSecret(password, 12);
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const [algorithm, salt, hashHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(secret, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const verifyPassword = verifySecret;
