import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { Client } from "pg";

export async function GET(req: NextRequest) {
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace("https://", "postgres://postgres:postgres@").replace(".supabase.co", ":5432/postgres");
    // Usually it requires the actual db password. 
  }
  
  return NextResponse.json({ dbUrl: !!dbUrl });
}
