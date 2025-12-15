
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient(); // This will default to DATABASE_URL from .env

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error('Please provide an email address as the first argument.');
        process.exit(1);
    }

    console.log(`Looking for user with email: ${email}...`);

    const user = await prisma.userAccount.findUnique({
        where: { email },
    });

    if (!user) {
        console.error(`User with email ${email} not found. Please sign up in the app first.`);
        process.exit(1);
    }

    console.log(`Found user ${user.id} (Supabase UID: ${user.supabaseUid}). Assigning ADMIN role...`);

    await prisma.userAccountRole.upsert({
        where: {
            userId_role: {
                userId: user.id,
                role: 'ADMIN',
            },
        },
        update: {},
        create: {
            userId: user.id,
            role: 'ADMIN',
        },
    });

    console.log(`Successfully assigned ADMIN role to ${email}.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
