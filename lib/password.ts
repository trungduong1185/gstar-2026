import crypto from "node:crypto";

const KEYLEN = 64;
const SALTLEN = 16;
const SCRYPT_PARAMS: crypto.ScryptOptions = { N: 16384, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALTLEN);
    crypto.scrypt(password, salt, KEYLEN, SCRYPT_PARAMS, (err, derived) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt.toString("base64")}$${derived.toString("base64")}`);
    });
  });
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = stored.split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt") return resolve(false);
    const salt = Buffer.from(parts[1], "base64");
    const expected = Buffer.from(parts[2], "base64");
    crypto.scrypt(password, salt, expected.length, SCRYPT_PARAMS, (err, derived) => {
      if (err) return resolve(false);
      resolve(derived.length === expected.length && crypto.timingSafeEqual(derived, expected));
    });
  });
}
