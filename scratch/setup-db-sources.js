import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL missing');
    process.exit(1);
}

const sql = neon(connectionString);

async function setupDb() {
    try {
        console.log('🚀 Creating record_lead_sources table in Neon Postgres...');
        await sql`
            CREATE TABLE IF NOT EXISTS record_lead_sources (
                record_id TEXT PRIMARY KEY,
                object_type TEXT NOT NULL,
                lead_source TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;
        console.log('✅ Table record_lead_sources created successfully!');

        // Check table contents
        const rows = await sql`SELECT * FROM record_lead_sources LIMIT 5;`;
        console.log('Current rows count:', rows.length);
    } catch (err) {
        console.error('🔥 DB setup error:', err);
    }
}

setupDb();
