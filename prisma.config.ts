import { defineConfig } from 'prisma/config';
import fs from 'fs';
import path from 'path';

// Helper to load environment variables
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

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // CLI-only (migrate/studio). Prefer the unpooled DIRECT_URL for DDL;
    // the runtime client connects via DATABASE_URL in src/lib/db.ts.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});
