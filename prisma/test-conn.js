const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Testing connection...');
    try {
        const count = await prisma.user.count();
        console.log(`Connection successful. User count: ${count}`);

        const admin = await prisma.user.findUnique({
            where: { email: 'admin@himate.com' },
            select: { email: true, username: true }
        });

        if (admin) {
            console.log('Admin user exists:', admin);
        } else {
            console.log('Admin user does not exist.');
        }
    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
