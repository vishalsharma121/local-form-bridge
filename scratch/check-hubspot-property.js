import dotenv from 'dotenv';
import { getHubSpotToken } from '../lib/hubspot.js';

dotenv.config();

const token = getHubSpotToken();
console.log('Token starts with:', token ? token.substring(0, 10) + '...' : 'NULL');

async function checkProperties() {
    try {
        console.log('\n--- Checking Contacts Properties ---');
        const res = await fetch('https://api.hubapi.com/crm/v3/properties/contacts/lead_source', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('GET lead_source status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log('Property exists:', data);
        } else {
            const text = await res.text();
            console.log('GET lead_source response:', text);
        }
    } catch (err) {
        console.error('Error checking property:', err);
    }
}

checkProperties();
