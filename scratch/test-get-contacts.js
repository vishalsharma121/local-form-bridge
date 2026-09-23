import dotenv from 'dotenv';
import handler from '../api/contacts.js';

dotenv.config();

const req = {
    method: 'GET',
    headers: {
        'x-admin-key': process.env.ADMIN_KEY
    }
};

const res = {
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(data) {
        console.log(`STATUS: ${this.statusCode}`);
        const found = (data.contacts || []).filter(c => c.lead_source !== 'HubSpot / Unknown');
        console.log(`Found ${found.length} non-unknown contacts out of ${data.contacts?.length}:`);
        console.log(JSON.stringify(found, null, 2));
    }
};

handler(req, res);
