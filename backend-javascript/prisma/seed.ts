// prisma/seed.ts
import { PrismaClient, CategoryType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Clearing existing data...');
    // Remove existing records to avoid duplicates
    await prisma.tag.deleteMany({});
    await prisma.category.deleteMany({});

    console.log('🌱 Seeding categories with generated UUIDs...');
    const CATEGORY_IDS: Record<CategoryType, string> = {
        HOUSING_UTILITIES: '11111111-1111-1111-1111-111111111111',
        FOOD_DINING: '22222222-2222-2222-2222-222222222222',
        SHOPPING: '33333333-3333-3333-3333-333333333333',
        TRAVEL: '44444444-4444-4444-4444-444444444444',
        ENTERTAINMENT: '55555555-5555-5555-5555-555555555555',
        HEALTH: '66666666-6666-6666-6666-666666666666',
        TRANSPORTATION: '77777777-7777-7777-7777-777777777777',
        EDUCATION_SUPPLIES: '88888888-8888-8888-8888-888888888888',
        PERSONAL_LIFESTYLE: '99999999-9999-9999-9999-999999999999',
        INCOME: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        MISCELLANEOUS: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    };

    console.log('🌱 Seeding categories with fixed UUIDs...');
    for (const title of Object.values(CategoryType)) {
        const id = CATEGORY_IDS[title];
        await prisma.category.upsert({
            where: { id },
            update: {},
            create: { id, title },
        });
        console.log(`  ✔️ Category seeded: { id: ${id}, title: ${title} }`);
    }


    console.log('✅ Category seeding complete.');


    console.log('🌱 Seeding tags...');
    const tags = [
        'SHARED', 'REIMBURSABLE', 'ONE\_TIME', 'RECURRING',
        'ACADEMIC', 'BOOKS', 'STATIONERY', 'CAFE\_RUN',
        'MEAL\_PLAN', 'DINING\_OUT', 'SOCIAL', 'FITNESS',
        'HEALTH', 'TRANSPORTATION', 'TECH', 'SUBSCRIPTION',
        'EMERGENCY', 'SAVINGS', 'DONATION', 'MISCELLANEOUS'
    ];

    for (const name of tags) {
        await prisma.tag.upsert({
            where: { name },
            update: {},
            create: { name }
        });
        console.log(`  ✔️  Tag: ${name}`);
    }

    console.log('✅ Seeding complete.');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
