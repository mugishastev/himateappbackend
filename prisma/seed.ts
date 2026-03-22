const path = require('path');
const dotenv = require('dotenv');

// Load environment variables with absolute path
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

console.log('>>> DEBUG: SEED SCRIPT STARTING');
console.log('>>> DEBUG: ENV PATH:', envPath);
if (result.error) {
    console.error('>>> DEBUG: DOTENV ERROR:', result.error);
} else {
    console.log('>>> DEBUG: DOTENV SUCCESS');
}
console.log('>>> DEBUG: DB URL LENGTH:', process.env.DATABASE_URL?.length || 0);

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

console.log('>>> DEBUG: IMPORTS COMPLETED');

const prisma = new PrismaClient();

async function main() {
    console.log('>>> DEBUG: MAIN FUNCTION START');
    
    // Explicitly check connection
    try {
        await prisma.$connect();
        console.log('>>> DEBUG: PRISMA CONNECTED');
    } catch (e) {
        console.error('>>> DEBUG: PRISMA CONNECTION FAILED');
        throw e;
    }

    console.log('Seeding roles and permissions...');

    // 1. Create Roles
    const adminRole = await prisma.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: { name: 'ADMIN' },
    });

    const moderatorRole = await prisma.role.upsert({
        where: { name: 'MODERATOR' },
        update: {},
        create: { name: 'MODERATOR' },
    });

    const userRole = await prisma.role.upsert({
        where: { name: 'USER' },
        update: {},
        create: { name: 'USER' },
    });

    // 2. Create Permissions
    const permissions = [
        { action: 'MANAGE_USERS', roleId: adminRole.id },
        { action: 'DELETE_ANY_MESSAGE', roleId: adminRole.id },
        { action: 'DELETE_ANY_MESSAGE', roleId: moderatorRole.id },
        { action: 'VIEW_ALL_CONVERSATIONS', roleId: adminRole.id },
    ];

    for (const p of permissions) {
        // Check if permission already exists to avoid duplicates
        const existing = await prisma.permission.findFirst({
            where: { action: p.action, roleId: p.roleId }
        });
        if (!existing) {
            await prisma.permission.create({ data: p });
        }
    }

    console.log('Roles and permissions seeded.');

    // 3. Create Admin User
    const adminEmail = 'admin@himate.com';
    const adminPassword = 'AdminPassword123!';
    const adminUsername = 'HimateAdmin';

    const adminRoleInDb = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRoleInDb) {
        throw new Error('ADMIN role not found after seeding!');
    }

    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    console.log('Password hashed.');

    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingAdmin) {
        console.log(`Admin user with email ${adminEmail} already exists. Updating...`);
        await prisma.user.update({
            where: { email: adminEmail },
            data: {
                password: hashedPassword,
                isVerified: true,
                roleId: adminRoleInDb.id
            }
        });
        console.log('Updated existing admin user.');
    } else {
        await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                username: adminUsername,
                isVerified: true,
                roleId: adminRoleInDb.id
            }
        });
        console.log(`Admin user created successfully!`);
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error('An error occurred while seeding:');
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
