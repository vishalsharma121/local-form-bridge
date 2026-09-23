import dotenv from 'dotenv';
import handler from '../api/create-contact.js';

dotenv.config();

const req = {
    method: 'POST',
    body: {
        name: 'John TestLead',
        email: `john.test.${Date.now()}@acmetest.com`,
        phone: '555-0199',
        subject: 'General Inquiry',
        message: 'Testing lead source safety net and submission end-to-end',
        companyName: 'Acme Test Corp',
        dealName: 'Acme Test Deal',
        dealAmount: '4500',
        dealStage: 'appointmentscheduled'
    },
    headers: {}
};

const res = {
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(data) {
        console.log(`\nRESPONSE STATUS: ${this.statusCode}`);
        console.log('RESPONSE BODY:', JSON.stringify(data, null, 2));
        return this;
    }
};

console.log('🚀 Running test form submission against /api/create-contact...');
handler(req, res);
