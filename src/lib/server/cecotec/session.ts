import { eq } from "drizzle-orm";
import { authenticate } from "$lib/server/cecotec/client";
import { decrypt } from "$lib/server/crypto";
import { db } from "$lib/server/db";
import { cecotecCredentials } from "$lib/server/db/schema";

export interface CecotecSession {
  accessToken: string;
  email: string;
}

// Looks up the user's linked Cecotec credentials and authenticates.
// Returns null if the user has no credentials linked; throws CecotecError
// (from authenticate()) if authentication fails, e.g. an expired password.
export async function getAuthenticatedCecotecSession(
  userId: string,
): Promise<CecotecSession | null> {
  const [creds] = await db
    .select()
    .from(cecotecCredentials)
    .where(eq(cecotecCredentials.userId, userId));

  if (!creds) return null;

  const { accessToken } = await authenticate(
    creds.email,
    decrypt(creds.encryptedPassword),
  );

  return { accessToken, email: creds.email };
}
