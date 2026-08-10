import { Client } from "pg";
import fs from "fs";
import path from "path";

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "postgresql://postgres:postgres@").replace(".supabase.co", ":5432/postgres");

async function main() {
  if (!process.env.SUPABASE_DB_URL) {
    console.error("Missing SUPABASE_DB_URL in environment.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database");

    const migrationPath = path.join(__dirname, "../supabase/migrations/006_storage_buckets.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");
    
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
