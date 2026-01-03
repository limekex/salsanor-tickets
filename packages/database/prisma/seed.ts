
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting seed...')

    // 1. Cleanup previous test data (Idempotency)
    const testPeriodCode = 'SPRING2025'

    // We try to find it first
    const existingPeriod = await prisma.coursePeriod.findUnique({
        where: { code: testPeriodCode }
    })

    if (existingPeriod) {
        console.log('Deleting existing test period...')
        // Delete in correct order to handle foreign keys
        // 1. Delete registrations (references tracks and orders)
        await prisma.registration.deleteMany({ where: { periodId: existingPeriod.id } })
        // 2. Delete waitlist entries
        await prisma.waitlistEntry.deleteMany({
            where: {
                registration: { periodId: existingPeriod.id }
            }
        })
        // 3. Delete payments (references orders)
        await prisma.payment.deleteMany({
            where: {
                order: { periodId: existingPeriod.id }
            }
        })
        // 4. Delete orders
        await prisma.order.deleteMany({ where: { periodId: existingPeriod.id } })
        // 4. Delete tickets
        await prisma.ticket.deleteMany({ where: { periodId: existingPeriod.id } })
        // 5. Delete person profiles and user accounts (if they're test users)
        const testUsers = await prisma.userAccount.findMany({
            where: { email: { contains: '@test.com' } }
        })
        for (const user of testUsers) {
            await prisma.personProfile.deleteMany({ where: { userId: user.id } })
            await prisma.userAccount.delete({ where: { id: user.id } })
        }
        // 6. Delete discount rules
        await prisma.discountRule.deleteMany({ where: { periodId: existingPeriod.id } })
        // 7. Delete tracks
        await prisma.courseTrack.deleteMany({ where: { periodId: existingPeriod.id } })
        // 8. Finally delete period
        await prisma.coursePeriod.delete({ where: { id: existingPeriod.id } })
    }

    // 2. Create Organizers
    // Delete existing test organizers if they exist
    await prisma.organizer.deleteMany({
        where: {
            slug: {
                in: ['salsanor-oslo', 'bergen-salsa-club']
            }
        }
    })

    const salsanorOslo = await prisma.organizer.create({
        data: {
            slug: 'salsanor-oslo',
            name: 'SalsaNor Oslo',
            description: 'Oslo\'s premier salsa and bachata dance school',
            city: 'Oslo',
            country: 'Norway',
            contactEmail: 'oslo@salsanor.no',
            website: 'https://salsanor.no'
        }
    })

    const bergenSalsa = await prisma.organizer.create({
        data: {
            slug: 'bergen-salsa-club',
            name: 'Bergen Salsa Club',
            description: 'Bergen\'s vibrant salsa community',
            city: 'Bergen',
            country: 'Norway',
            contactEmail: 'info@bergensalsa.no'
        }
    })

    console.log(`Created 2 organizers: ${salsanorOslo.name}, ${bergenSalsa.name}`)

    // 3. Create Period
    const period = await prisma.coursePeriod.create({
        data: {
            organizerId: salsanorOslo.id,
            name: 'Spring 2026 Test',
            code: testPeriodCode,
            city: 'Oslo',
            startDate: new Date('2026-01-20'),
            endDate: new Date('2026-05-20'),
            salesOpenAt: new Date('2025-01-01'), // Open now (past current date)
            salesCloseAt: new Date('2026-02-01'), // Future
        }
    })
    console.log(`Created Period: ${period.name}`)

    // 3. Create Tracks
    const salsa = await prisma.courseTrack.create({
        data: {
            periodId: period.id,
            title: 'Salsa Level 1',
            weekday: 1, // Mon
            timeStart: '18:00',
            timeEnd: '19:00',
            levelLabel: 'Beginner',
            capacityTotal: 40,
            priceSingleCents: 150000,
            pricePairCents: 250000
        }
    })

    const bachataVIP = await prisma.courseTrack.create({
        data: {
            periodId: period.id,
            title: 'Bachata VIP (Low Cap)',
            weekday: 2, // Tue
            timeStart: '19:00',
            timeEnd: '20:30',
            levelLabel: 'Advanced',
            capacityTotal: 2, // TINY CAPACITY FOR WAITLIST TESTING
            priceSingleCents: 200000,
            pricePairCents: 350000
        }
    })

    const kizomba = await prisma.courseTrack.create({
        data: {
            periodId: period.id,
            title: 'Kizomba Flow',
            weekday: 3, // Wed
            timeStart: '20:00',
            timeEnd: '21:00',
            levelLabel: 'Intermediate',
            capacityTotal: 30,
            priceSingleCents: 150000,
            pricePairCents: 250000
        }
    })
    console.log(`Created 3 Tracks (Bachata VIP cap: ${bachataVIP.capacityTotal})`)

    // 4. Create Discount Rules

    // Membership 10%
    await prisma.discountRule.create({
        data: {
            periodId: period.id,
            code: 'MEMBERSHIP_10',
            name: 'Member Discount',
            priority: 0,
            ruleType: 'MEMBERSHIP_PERCENT',
            enabled: true,
            config: {
                discountPercent: 10
            }
        }
    })

    // Multi-Course: Buy 2 get 200kr off
    await prisma.discountRule.create({
        data: {
            periodId: period.id,
            code: 'MULTI_2_200',
            name: 'Multi Course Discount',
            priority: 10,
            ruleType: 'MULTI_COURSE_TIERED',
            enabled: true,
            config: {
                tiers: [
                    { count: 2, discountCents: 20000 },
                    { count: 3, discountCents: 40000 }
                ]
            }
        }
    })
    console.log('Created Discount Rules')

    // 5. Create Test Users and Registrations
    console.log('Creating test users and registrations...')

    // User 1: Active registration on Salsa
    const user1 = await prisma.userAccount.create({
        data: {
            supabaseUid: 'test-user-1',
            email: 'alice@test.com',
            personProfile: {
                create: {
                    firstName: 'Alice',
                    lastName: 'Anderson',
                    email: 'alice@test.com',
                    phone: '+47 123 45 001'
                }
            }
        },
        include: { personProfile: true }
    })

    const order1 = await prisma.order.create({
        data: {
            organizerId: salsanorOslo.id,
            periodId: period.id,
            purchaserPersonId: user1.personProfile!.id,
            status: 'PAID',
            subtotalCents: 150000,
            discountCents: 0,
            subtotalAfterDiscountCents: 150000,
            mvaCents: 0,
            totalCents: 150000,
            pricingSnapshot: JSON.stringify({ subtotalCents: 150000, finalTotalCents: 150000 }),
            registrations: {
                create: {
                    periodId: period.id,
                    trackId: salsa.id,
                    personId: user1.personProfile!.id,
                    status: 'ACTIVE',
                    chosenRole: 'LEADER'
                }
            }
        }
    })

    // User 2: 2 Active registrations (Salsa + Kizomba) - tests multi-course
    const user2 = await prisma.userAccount.create({
        data: {
            supabaseUid: 'test-user-2',
            email: 'bob@test.com',
            personProfile: {
                create: {
                    firstName: 'Bob',
                    lastName: 'Builder',
                    email: 'bob@test.com',
                    phone: '+47 123 45 002'
                }
            }
        },
        include: { personProfile: true }
    })

    const order2 = await prisma.order.create({
        data: {
            organizerId: salsanorOslo.id,
            periodId: period.id,
            purchaserPersonId: user2.personProfile!.id,
            status: 'PAID',
            subtotalCents: 300000,
            discountCents: 20000, // Multi-course discount
            subtotalAfterDiscountCents: 280000,
            mvaCents: 0,
            totalCents: 280000,
            pricingSnapshot: JSON.stringify({ subtotalCents: 300000, discountTotalCents: 20000, finalTotalCents: 280000 }),
            registrations: {
                create: [
                    {
                        periodId: period.id,
                        trackId: salsa.id,
                        personId: user2.personProfile!.id,
                        status: 'ACTIVE',
                        chosenRole: 'FOLLOWER'
                    },
                    {
                        periodId: period.id,
                        trackId: kizomba.id,
                        personId: user2.personProfile!.id,
                        status: 'ACTIVE',
                        chosenRole: 'FOLLOWER'
                    }
                ]
            }
        }
    })

    // User 3 & 4: Fill Bachata VIP to capacity (2 spots)
    const user3 = await prisma.userAccount.create({
        data: {
            supabaseUid: 'test-user-3',
            email: 'charlie@test.com',
            personProfile: {
                create: {
                    firstName: 'Charlie',
                    lastName: 'Chaplin',
                    email: 'charlie@test.com'
                }
            }
        },
        include: { personProfile: true }
    })

    await prisma.order.create({
        data: {
            organizerId: salsanorOslo.id,
            periodId: period.id,
            purchaserPersonId: user3.personProfile!.id,
            status: 'PAID',
            subtotalCents: 200000,
            discountCents: 0,
            subtotalAfterDiscountCents: 200000,
            mvaCents: 0,
            totalCents: 200000,
            pricingSnapshot: JSON.stringify({ subtotalCents: 200000, finalTotalCents: 200000 }),
            registrations: {
                create: {
                    periodId: period.id,
                    trackId: bachataVIP.id,
                    personId: user3.personProfile!.id,
                    status: 'ACTIVE',
                    chosenRole: 'LEADER'
                }
            }
        }
    })

    const user4 = await prisma.userAccount.create({
        data: {
            supabaseUid: 'test-user-4',
            email: 'diana@test.com',
            personProfile: {
                create: {
                    firstName: 'Diana',
                    lastName: 'Dancer',
                    email: 'diana@test.com'
                }
            }
        },
        include: { personProfile: true }
    })

    await prisma.order.create({
        data: {
            organizerId: salsanorOslo.id,
            periodId: period.id,
            purchaserPersonId: user4.personProfile!.id,
            status: 'PAID',
            subtotalCents: 200000,
            discountCents: 0,
            subtotalAfterDiscountCents: 200000,
            mvaCents: 0,
            totalCents: 200000,
            pricingSnapshot: JSON.stringify({ subtotalCents: 200000, finalTotalCents: 200000 }),
            registrations: {
                create: {
                    periodId: period.id,
                    trackId: bachataVIP.id,
                    personId: user4.personProfile!.id,
                    status: 'ACTIVE',
                    chosenRole: 'FOLLOWER'
                }
            }
        }
    })

    // User 5: WAITLIST for Bachata VIP (capacity full)
    const user5 = await prisma.userAccount.create({
        data: {
            supabaseUid: 'test-user-5',
            email: 'eve@test.com',
            personProfile: {
                create: {
                    firstName: 'Eve',
                    lastName: 'Evans',
                    email: 'eve@test.com'
                }
            }
        },
        include: { personProfile: true }
    })

    const waitlistReg = await prisma.registration.create({
        data: {
            periodId: period.id,
            trackId: bachataVIP.id,
            personId: user5.personProfile!.id,
            status: 'WAITLIST',
            chosenRole: 'LEADER',
            waitlist: {
                create: {
                    status: 'ON_WAITLIST'
                }
            }
        }
    })

    // User 6: DRAFT order (unpaid)
    const user6 = await prisma.userAccount.create({
        data: {
            supabaseUid: 'test-user-6',
            email: 'frank@test.com',
            personProfile: {
                create: {
                    firstName: 'Frank',
                    lastName: 'Franklin',
                    email: 'frank@test.com'
                }
            }
        },
        include: { personProfile: true }
    })

    await prisma.order.create({
        data: {
            organizerId: salsanorOslo.id,
            periodId: period.id,
            purchaserPersonId: user6.personProfile!.id,
            status: 'DRAFT',
            subtotalCents: 150000,
            discountCents: 0,
            subtotalAfterDiscountCents: 150000,
            mvaCents: 0,
            totalCents: 150000,
            pricingSnapshot: JSON.stringify({ subtotalCents: 150000, finalTotalCents: 150000 }),
            registrations: {
                create: {
                    periodId: period.id,
                    trackId: kizomba.id,
                    personId: user6.personProfile!.id,
                    status: 'DRAFT',
                    chosenRole: 'ANY'
                }
            }
        }
    })

    console.log('✅ Created 6 test users with various registration statuses')
    console.log('  - Alice: 1 ACTIVE (Salsa)')
    console.log('  - Bob: 2 ACTIVE (Salsa + Kizomba, multi-course discount)')
    console.log('  - Charlie: 1 ACTIVE (Bachata VIP)')
    console.log('  - Diana: 1 ACTIVE (Bachata VIP)')
    console.log('  - Eve: 1 WAITLIST (Bachata VIP - full)')
    console.log('  - Frank: 1 DRAFT (Kizomba - unpaid)')

    console.log('✅ Seed complete!')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
