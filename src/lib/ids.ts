// Central id helpers. crypto.randomUUID is available in the Workers runtime.

export function newId(): string {
  return crypto.randomUUID();
}

// Public, non-guessable project token (36 chars, > 24 required).
export function newPublicToken(): string {
  return crypto.randomUUID();
}
