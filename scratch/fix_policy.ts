import { Client } from "pg";

const connectionString = process.env.SUPABASE_DB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "postgres://postgres:postgres@").replace(".supabase.co", ":5432/postgres"); 
// Wait, I don't know the DB URL. Let me look at .env.local

async function main() {
  const fs = require('fs');
  const env = fs.readFileSync('.env.local', 'utf-8');
  let dbUrl = "";
  for (const line of env.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].trim();
      dbUrl = dbUrl.replace(/^"|"$/g, '');
    }
  }

  if (!dbUrl) {
    console.log("No DATABASE_URL found");
    return;
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log("Connected to DB");

  // Recreate the policy
  await client.query(`
    drop policy if exists "party sends message" on messages;
    create policy "party sends message"
      on messages for insert
      to authenticated
      with check (
        is_thread_party(thread_id)
        and sender_id = auth.uid()
      );
  `);
  console.log("Recreated policy");

  await client.end();
}

main().catch(console.error);
