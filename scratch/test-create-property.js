import dotenv from 'dotenv';
import { getHubSpotToken } from '../lib/hubspot.js';

dotenv.config();

const token = getHubSpotToken();

async function testCreateProperty() {
    console.log('\n--- Fetching Available Property Groups for Contacts ---');
    const groupsRes = await fetch('https://api.hubapi.com/crm/v3/properties/contacts/groups', {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Groups status:', groupsRes.status);
    if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        console.log('Groups:', groupsData.results.map(g => g.name));
    } else {
        console.log('Groups err:', await groupsRes.text());
    }

    console.log('\n--- Trying to Create lead_source Property on Contacts ---');
    const createRes = await fetch('https://api.hubapi.com/crm/v3/properties/contacts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: 'lead_source',
            label: 'Lead Source',
            type: 'string',
            fieldType: 'text',
            groupName: 'contactinformation'
        })
    });
    console.log('Create status:', createRes.status);
    console.log('Create response:', await createRes.text());
}

testCreateProperty();
