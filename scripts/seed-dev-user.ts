/**
 * Seed utilizador de teste (apenas desenvolvimento).
 * Lê TEST_USER_EMAIL e TEST_USER_PASSWORD do .env.dev
 */
import "dotenv/config";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { localAuth } from "../drizzle/schema";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function seed() {
  const email = process.env.TEST_USER_EMAIL || "teste@teste.com";
  const password = process.env.TEST_USER_PASSWORD || "teste123";
  const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

  if (!dbUrl) {
    console.warn("[Seed] DATABASE_URL not set, skipping test user seed");
    return;
  }

  const client = postgres(dbUrl);
  const db = drizzle(client);

  try {
    const existing = await db.select().from(localAuth).where(eq(localAuth.email, email)).limit(1);
    const passwordHash = hashPassword(password);

    if (existing.length > 0) {
      await db.update(localAuth).set({ passwordHash }).where(eq(localAuth.email, email));
      console.log("[Seed] Test user password updated:", email);
    } else {
      await db.insert(localAuth).values({ email, passwordHash });
      console.log("[Seed] Test user created:", email);
    }
  } catch (e) {
    console.warn("[Seed] Failed to seed test user:", e);
  } finally {
    await client.end();
  }
}

seed();
