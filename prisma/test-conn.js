const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://neondb_owner:npg_wX3qBnCfY0Ts@ep-steep-night-a886gcyq.eastus2.azure.neon.tech/himate?sslmode=require&channel_binding=require'
        },
    },
});

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
    }
}

main();
