import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Helper to parse .env or .env.local
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

if (!dbUrl || dbUrl.includes('YOUR_PASSWORD') || dbUrl.includes('ep-sample')) {
  console.error('❌ Error: DATABASE_URL is not configured properly in .env or .env.local');
  console.error(`Current value: ${dbUrl || '(empty)'}`);
  process.exit(1);
}

console.log('🔄 Connecting to Neon PostgreSQL database...');
console.log(`📡 Host target: ${dbUrl.split('@')[1]?.split('/')[0] || 'hidden'}`);

async function testConnection() {
  try {
    const sql = neon(dbUrl);
    const result = await sql`
      SELECT 
        NOW() as current_time, 
        current_database() as database_name, 
        current_user as current_user, 
        version() as pg_version;
    `;

    console.log('\n✅ Database connection successful!');
    console.log('--------------------------------------------------');
    console.log(`🕒 Server Time:    ${result[0].current_time}`);
    console.log(`🗄️  Database:       ${result[0].database_name}`);
    console.log(`👤 User:           ${result[0].current_user}`);
    console.log(`🐘 PostgreSQL:     ${result[0].pg_version.split(' ')[0]} ${result[0].pg_version.split(' ')[1]}`);
    console.log('--------------------------------------------------\n');
  } catch (error) {
    console.error('\n❌ Connection failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

testConnection();
