import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
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

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
