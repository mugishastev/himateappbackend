const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing Prisma query...');
        const userId = 1;
        const conversations = await prisma.conversation.findMany({
            where: { participants: { some: { userId } } },
            include: {
                participants: { include: { user: true } },
                messages: {
                    where: { isDeleted: false },
                    take: 1,
                    orderBy: { timestamp: 'desc' },
                },
            },
        });
        console.log('Found conversations:', conversations.length);

        for (const conv of conversations) {
            const unreadCount = await prisma.message.count({
                where: {
                    conversationId: conv.id,
                    senderId: { not: userId },
                    isRead: false,
                    isDeleted: false,
                },
            });
            console.log(`Conv ${conv.id} unread count:`, unreadCount);
        }
        console.log('Query successful!');
    } catch (e) {
        console.error('Query failed!');
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
