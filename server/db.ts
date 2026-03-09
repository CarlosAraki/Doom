import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, localAuth, InsertLocalAuth, gameScores, InsertGameScore } from "../drizzle/schema";
import { ENV } from './_core/env';
import crypto from 'crypto';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL);
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _client = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Hash password using SHA-256
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Register a new user with email and password
 */
export async function registerUser(email: string, password: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const passwordHash = hashPassword(password);
    await db.insert(localAuth).values({
      email,
      passwordHash,
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error("Email já registrado");
    }
    throw error;
  }
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(email: string, password: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.select().from(localAuth).where(eq(localAuth.email, email)).limit(1);
    
    if (result.length === 0) {
      return false;
    }

    const passwordHash = hashPassword(password);
    return result[0].passwordHash === passwordHash;
  } catch (error) {
    console.error("[Database] Failed to authenticate user:", error);
    throw error;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.select().from(localAuth).where(eq(localAuth.email, email)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user by email:", error);
    throw error;
  }
}

/**
 * Save a game score to the database
 */
export async function saveGameScore(score: InsertGameScore): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.insert(gameScores).values(score);
  } catch (error) {
    console.error("[Database] Failed to save game score:", error);
    throw error;
  }
}

/**
 * Get top scores from the database (leaderboard)
 */
export async function getTopScores(limit: number = 10) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get scores: database not available");
    return [];
  }

  try {
    const result = await db
      .select({
        id: gameScores.id,
        userId: gameScores.userId,
        score: gameScores.score,
        gameMode: gameScores.gameMode,
        enemiesKilled: gameScores.enemiesKilled,
        timePlayedSeconds: gameScores.timePlayedSeconds,
        createdAt: gameScores.createdAt,
        userEmail: users.email,
      })
      .from(gameScores)
      .leftJoin(users, eq(gameScores.userId, users.id))
      .orderBy(desc(gameScores.score))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get top scores:", error);
    return [];
  }
}

/**
 * Get user's best score
 */
export async function getUserBestScore(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user score: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(gameScores)
      .where(eq(gameScores.userId, userId))
      .orderBy(desc(gameScores.score))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user best score:", error);
    return undefined;
  }
}

// TODO: add feature queries here as your schema grows.
