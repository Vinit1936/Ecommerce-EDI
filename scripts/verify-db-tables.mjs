import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            let value = trimmed.substring(eqIdx + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    }
  }
}

loadEnv();

const dbUrl = process.env.DATABASE_URL;

async function verifyTables() {
  try {
    const sql = neon(dbUrl);
    
    // Query all user tables created in public schema
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name ASC;
    `;

    // Query enums
    const enums = await sql`
      SELECT t.typname as enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname ASC;
    `;

    console.log('\n📊 DATABASE TABLES CREATED:');
    console.log('--------------------------------------------------');
    tables.forEach((t, i) => console.log(`${String(i + 1).padStart(2, ' ')}. ${t.table_name}`));
    console.log(`\nTotal Tables: ${tables.length}`);

    console.log('\n🏷️  DATABASE ENUMS CREATED:');
    console.log('--------------------------------------------------');
    enums.forEach(e => console.log(`• ${e.enum_name}: [${e.enum_values.join(', ')}]`));
    console.log('--------------------------------------------------\n');
  } catch (error) {
    console.error('Verification error:', error);
  }
}

verifyTables();
