import "dotenv/config";
import postgres from "postgres";

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  console.log("Testing connection to:", dbUrl ? dbUrl.split('@')[1] : "UNDEFINED");
  
  if (!dbUrl) {
    console.error("DATABASE_URL is not defined");
    process.exit(1);
  }

  try {
    // Neon typically requires ssl: 'require' or ssl: true
    // The connection string already has sslmode=require
    const sql = postgres(dbUrl, {
      ssl: 'require',
      connect_timeout: 10,
    });
    
    console.log("Attempting to query...");
    const result = await sql`SELECT version()`;
    console.log("Success! Database version:", result[0].version);
    await sql.end();
  } catch (error) {
    console.error("Connection failed:", error);
    process.exit(1);
  }
}

testConnection();
