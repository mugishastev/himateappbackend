const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  console.log('CONNECTED TO DATABASE');

  try {
    // 1. Create Roles
    await client.query('INSERT INTO "Role" (name) VALUES (\'ADMIN\') ON CONFLICT (name) DO NOTHING');
    await client.query('INSERT INTO "Role" (name) VALUES (\'MODERATOR\') ON CONFLICT (name) DO NOTHING');
    await client.query('INSERT INTO "Role" (name) VALUES (\'USER\') ON CONFLICT (name) DO NOTHING');
    console.log('Roles created or already exist.');

    // 2. Get ADMIN Role ID
    const roleRes = await client.query('SELECT id FROM "Role" WHERE name = \'ADMIN\'');
    const adminRoleId = roleRes.rows[0].id;

    // 3. Create Admin User
    const adminEmail = 'admin@himate.com';
    const adminPasswordHash = '$2b$10$m8f/DUCMwlL6gpNT4uqxtea44j4Das2uAk5BpaZRLAME0ySkWZwnM6';
    const adminUsername = 'HimateAdmin';

    await client.query(`
      INSERT INTO "User" (email, password, username, "isVerified", "roleId") 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET 
        "roleId" = $5,
        "isVerified" = $4,
        password = $2
    `, [adminEmail, adminPasswordHash, adminUsername, true, adminRoleId]);

    console.log('Admin user created or updated successfully.');
    console.log('Email: admin@himate.com');
    console.log('Password: AdminPassword123!');

  } catch (err) {
    console.error('DATABASE ERROR:', err);
  } finally {
    await client.end();
  }
}

run();
