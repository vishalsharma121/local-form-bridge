import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

async function backfill() {
    console.log('🚀 Backfilling lead sources from sync_activity...');

    const activities = await sql`
        SELECT record_email, target, action
        FROM sync_activity
        WHERE status = 'success';
    `;

    console.log(`Found ${activities.length} activity records.`);

    // Fetch contacts from HubSpot and match with sync_activity emails
    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN || process.env.HUBSPOT_ACCESS_TOKEN;
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=email', {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
        const data = await res.json();
        const emailToId = {};
        for (const c of data.results || []) {
            if (c.properties?.email) {
                emailToId[c.properties.email.toLowerCase().trim()] = c.id;
            }
        }

        let count = 0;
        for (const act of activities) {
            const email = (act.record_email || '').toLowerCase().trim();
            if (email && emailToId[email]) {
                const recordId = emailToId[email];
                await sql`
                    INSERT INTO record_lead_sources (record_id, object_type, lead_source)
                    VALUES (${recordId}, 'contact', 'Website Form')
                    ON CONFLICT (record_id) DO NOTHING;
                `;
                count++;
            }
        }
        console.log(`✅ Backfilled ${count} contacts into record_lead_sources!`);
    }
}

backfill();
