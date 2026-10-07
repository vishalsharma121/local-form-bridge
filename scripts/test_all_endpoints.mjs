import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function testAllEndpoints() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET missing');
    return;
  }

  // Create valid tokens for each role
  const superAdminToken = jwt.sign({ userId: 1, name: 'Vishal Sharma', email: 'vishal.sharma@starkedge.com', role: 'super_admin' }, secret, { expiresIn: '1h' });
  const adminToken = jwt.sign({ userId: 2, name: 'Harman', email: 'harman.starkedge@gmail.com', role: 'admin' }, secret, { expiresIn: '1h' });
  const viewerToken = jwt.sign({ userId: 3, name: 'Dev View', email: 'dev@starkedge.com', role: 'viewer' }, secret, { expiresIn: '1h' });

  const endpoints = [
    '/api/contacts',
    '/api/companies',
    '/api/deals',
    '/api/sync-errors',
    '/api/sync-activity',
    '/api/cron-auto-retry',
    '/api/settings',
    '/api/users'
  ];

  console.log('--- Testing Endpoints with Super Admin Token ---');
  for (const ep of endpoints) {
    const res = await fetch(`http://localhost:5173${ep}`, {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    console.log(`[${res.status}] ${ep}`);
  }

  console.log('\n--- Testing Endpoints with Viewer Token ---');
  for (const ep of endpoints) {
    const res = await fetch(`http://localhost:5173${ep}`, {
      headers: { 'Authorization': `Bearer ${viewerToken}` }
    });
    console.log(`[${res.status}] ${ep}`);
  }
}

testAllEndpoints().catch(err => console.error('Error:', err));
