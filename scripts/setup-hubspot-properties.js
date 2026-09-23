import dotenv from 'dotenv';
import { getHubSpotToken } from '../lib/hubspot.js';

dotenv.config();

const token = getHubSpotToken();

if (!token) {
    console.error('❌ HubSpot token not found in environment variables.');
    process.exit(1);
}

const objectTypes = [
    { name: 'contacts', group: 'contactinformation' },
    { name: 'companies', group: 'companyinformation' },
    { name: 'deals', group: 'dealinformation' },
];

const propertyPayload = (groupName) => ({
    name: 'lead_source',
    label: 'Lead Source',
    type: 'enumeration',
    fieldType: 'select',
    groupName: groupName,
    options: [
        { label: 'Website Form', value: 'Website Form', displayOrder: 0 },
        { label: 'Admin Dashboard', value: 'Admin Dashboard', displayOrder: 1 },
        { label: 'HubSpot Manual/Unknown', value: 'HubSpot Manual/Unknown', displayOrder: 2 },
        { label: 'HubSpot / Unknown', value: 'HubSpot / Unknown', displayOrder: 3 },
    ],
});

async function setupProperties() {
    console.log('🚀 Starting HubSpot Custom Property Setup for lead_source...\n');

    for (const obj of objectTypes) {
        const checkUrl = `https://api.hubapi.com/crm/v3/properties/${obj.name}/lead_source`;
        const createUrl = `https://api.hubapi.com/crm/v3/properties/${obj.name}`;

        try {
            // Check if property exists
            console.log(`🔍 Checking [${obj.name}] for property "lead_source"...`);
            const checkRes = await fetch(checkUrl, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (checkRes.ok) {
                const existing = await checkRes.json();
                console.log(`✅ [${obj.name}] Property "lead_source" already exists (Label: "${existing.label}"). Skipping creation.\n`);
                continue;
            }

            if (checkRes.status === 404) {
                console.log(`⚙️ [${obj.name}] Property "lead_source" does not exist. Creating now...`);
                const createRes = await fetch(createUrl, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(propertyPayload(obj.group)),
                });

                const createData = await createRes.json();

                if (createRes.ok) {
                    console.log(`🎉 [${obj.name}] Successfully created "lead_source" property!`);
                } else {
                    console.error(`❌ [${obj.name}] Failed to create "lead_source":`, createData);
                }
            } else {
                const errText = await checkRes.text();
                console.error(`⚠️ [${obj.name}] Unexpected check status ${checkRes.status}: ${errText}`);
            }
        } catch (err) {
            console.error(`🔥 [${obj.name}] Network/API error:`, err.message);
        }
        console.log('');
    }

    console.log('🏁 Property setup process finished.');
}

setupProperties();
