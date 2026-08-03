import bcrypt from "bcryptjs";

// bcryptjs is pure-JS so it runs in the Workers runtime (native bcrypt/argon2
// C-bindings do not). Cost 10 is a fine balance for a 2-user internal login.
const COST = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
