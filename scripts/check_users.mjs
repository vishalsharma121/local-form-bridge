import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkUsers() {
  const sql = neon(process.env.DATABASE_URL);
  const users = await sql`SELECT id, name, email, role, is_active FROM app_users`;
  console.log('Users in DB:', users);
}

checkUsers().catch(err => console.error('DB Error:', err));
