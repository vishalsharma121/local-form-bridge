import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function testGetAuthWithToken() {
  const secret = process.env.JWT_SECRET;
  const token = jwt.sign({ userId: 1, name: 'Vishal Sharma', email: 'vishal.sharma@starkedge.com', role: 'super_admin' }, secret, { expiresIn: '1h' });

  console.log('Sending GET /api/auth with Bearer token...');
  const res = await fetch('http://localhost:5173/api/auth', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response JSON:', data);
}

testGetAuthWithToken().catch(err => console.error(err));
