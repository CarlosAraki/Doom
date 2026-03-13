import "dotenv/config";
import postgres from "postgres";

async function listTables() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not defined");
    process.exit(1);
  }

  try {
    const sql = postgres(dbUrl, { ssl: 'require' });
    
    console.log("Fetching tables...");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log("Tables in 'public' schema:");
    tables.forEach(t => console.log("-", t.table_name));
    
    await sql.end();
  } catch (error) {
    console.error("Failed to list tables:", error);
    process.exit(1);
  }
}

listTables();
