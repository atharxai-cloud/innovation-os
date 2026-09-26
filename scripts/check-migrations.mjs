import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "supabase/migrations");
const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();

if (!files.length) {
  throw new Error("No Supabase migration files found.");
}

const pattern = /^(\d{14})_[a-z0-9_]+\.sql$/;
const versions = new Set();

for (const file of files) {
  const match = file.match(pattern);
  if (!match) {
    throw new Error(`Invalid migration filename: ${file}. Expected YYYYMMDDHHMMSS_name.sql`);
  }

  const version = match[1];
  if (versions.has(version)) {
    throw new Error(`Duplicate migration version: ${version}`);
  }
  versions.add(version);
}

console.log(`Verified ${files.length} Supabase migration files with unique 14-digit versions.`);
