
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting seed...')

    // 1. Cleanup previous test data (Idempotency)
    const testPeriodCode = 'FALL2026'

    // We try to find it first
    const existingPeriod = await prisma.coursePeriod.findUnique({
        where: { code: testPeriodCode }
    })

    if (existingPeriod) {
        console.log('Deleting existing test period...')
        // Delete in correct order to handle foreign keys
        // 1. Delete waitlist entries first (references registrations)
        await prisma.waitlistEntry.deleteMany({
            where: {
                Registration: { periodId: existingPeriod.id }
            }
        })
        // 2. Delete registrations (references tracks and orders)
        await prisma.registration.deleteMany({ where: { periodId: existingPeriod.id } })
        // 3. Delete payments (references orders)
        await prisma.payment.deleteMany({
            where: {
                Order: { periodId: existingPeriod.id }
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
    // First, find existing test organizers to clean up all their data
    const existingOrganizers = await prisma.organizer.findMany({
        where: {
            slug: {
                in: ['salsanor-oslo', 'bergen-salsa-club']
            }
        }
    })

    for (const org of existingOrganizers) {
        // Delete events first
        await prisma.event.deleteMany({ where: { organizerId: org.id } })
        
        // Get all periods for this organizer
        const periods = await prisma.coursePeriod.findMany({
            where: { organizerId: org.id }
        })
        
        for (const p of periods) {
            // Clean up period data
            await prisma.waitlistEntry.deleteMany({
                where: { Registration: { periodId: p.id } }
            })
            await prisma.registration.deleteMany({ where: { periodId: p.id } })
            await prisma.payment.deleteMany({
                where: { Order: { periodId: p.id } }
            })
            await prisma.order.deleteMany({ where: { periodId: p.id } })
            await prisma.ticket.deleteMany({ where: { periodId: p.id } })
            await prisma.discountRule.deleteMany({ where: { periodId: p.id } })
            await prisma.courseTrack.deleteMany({ where: { periodId: p.id } })
            await prisma.coursePeriod.delete({ where: { id: p.id } })
        }
        
        // Delete user roles for this org
        await prisma.userAccountRole.deleteMany({ where: { organizerId: org.id } })
        
        // Finally delete the organizer
        await prisma.organizer.delete({ where: { id: org.id } })
    }
    
    console.log('Cleaned up existing test data')

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
            name: 'Fall 2026 Test',
            code: testPeriodCode,
            city: 'Oslo',
            startDate: new Date('2026-09-01'),
            endDate: new Date('2026-12-15'),
            salesOpenAt: new Date('2026-03-01'), // Already open (past)
            salesCloseAt: new Date('2026-09-15'), // After course starts
        }
    })
    console.log(`Created Period: ${period.name}`)

    // 3. Create Tracks
    const salsa = await prisma.courseTrack.create({
        data: {
            periodId: period.id,
            title: 'Salsa Level 1',
            description: 'Perfect for beginners! Learn the fundamentals of salsa dancing including basic steps, timing, and partner connection. No experience required.',
            weekday: 1, // Mon
            timeStart: '18:00',
            timeEnd: '19:00',
            levelLabel: 'Beginner',
            locationName: 'SalsaNor Studio',
            locationAddress: 'Torggata 15, 0181 Oslo',
            capacityTotal: 40,
            priceSingleCents: 150000,
            pricePairCents: 250000
        }
    })

    const bachataVIP = await prisma.courseTrack.create({
        data: {
            periodId: period.id,
            title: 'Bachata VIP (Low Cap)',
            description: 'Exclusive small-group bachata sensual class for advanced dancers. Focus on musicality, body movement, and intricate partner work.',
            weekday: 2, // Tue
            timeStart: '19:00',
            timeEnd: '20:30',
            levelLabel: 'Advanced',
            locationName: 'SalsaNor Studio',
            locationAddress: 'Torggata 15, 0181 Oslo',
            capacityTotal: 2, // TINY CAPACITY FOR WAITLIST TESTING
            priceSingleCents: 200000,
            pricePairCents: 350000
        }
    })

    const kizomba = await prisma.courseTrack.create({
        data: {
            periodId: period.id,
            title: 'Kizomba Flow',
            description: 'Develop your kizomba technique with focus on connection, lead/follow, and smooth transitions. Some dance experience recommended.',
            weekday: 3, // Wed
            timeStart: '20:00',
            timeEnd: '21:00',
            levelLabel: 'Intermediate',
            locationName: 'SalsaNor Studio',
            locationAddress: 'Torggata 15, 0181 Oslo',
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
            PersonProfile: {
                create: {
                    firstName: 'Alice',
                    lastName: 'Anderson',
                    email: 'alice@test.com',
                    phone: '+47 123 45 001'
                }
            }
        },
        include: { PersonProfile: true }
    })

    const order1 = await prisma.order.create({
        data: {
            organizerId: salsanorOslo.id,
            periodId: period.id,
            purchaserPersonId: user1.PersonProfile!.id,
            status: 'PAID',
            subtotalCents: 150000,
            discountCents: 0,
            subtotalAfterDiscountCents: 150000,
            mvaCents: 0,
            totalCents: 150000,
            pricingSnapshot: JSON.stringify({ subtotalCents: 150000, finalTotalCents: 150000 }),
            Registration: {
                create: {
                    periodId: period.id,
                    trackId: salsa.id,
                    personId: user1.PersonProfile!.id,
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
            PersonProfile: {
                create: {
                    firstName: 'Bob',
                    lastName: 'Builder',
                    email: 'bob@test.com',
                    phone: '+47 123 45 002'
                }
            }
        },
        include: { PersonProfile: true }
    })

    const order2 = await prisma.order.create({
        data: {
            organizerId: salsanorOslo.id,
            periodId: period.id,
            purchaserPersonId: user2.PersonProfile!.id,
            status: 'PAID',
            subtotalCents: 300000,
            discountCents: 20000, // Multi-course discount
            subtotalAfterDiscountCents: 280000,
            mvaCents: 0,
            totalCents: 280000,
            pricingSnapshot: JSON.stringify({ subtotalCents: 300000, discountTotalCents: 20000, finalTotalCents: 280000 }),
            Registration: {
                create: [
                    {
                        periodId: period.id,
                        trackId: salsa.id,
                        personId: user2.PersonProfile!.id,
                        status: 'ACTIVE',
                        chosenRole: 'FOLLOWER'
                    },
                    {
                        periodId: period.id,
                        trackId: kizomba.id,
                        personId: user2.PersonProfile!.id,
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
            PersonProfile: {
                create: {
                    firstName: 'Charlie',
                    lastName: 'Chaplin',
                    email: 'charlie@test.com'
                }
            }
        },
        include: { PersonProfile: true }
    })

    await prisma.order.create({
        data: {
            organizerId: salsanorOslo.id,
            periodId: period.id,
            purchaserPersonId: user3.PersonProfile!.id,
            status: 'PAID',
            subtotalCents: 200000,
            discountCents: 0,
            subtotalAfterDiscountCents: 200000,
            mvaCents: 0,
            totalCents: 200000,
            pricingSnapshot: JSON.stringify({ subtotalCents: 200000, finalTotalCents: 200000 }),
            Registration: {
                create: {
                    periodId: period.id,
                    trackId: bachataVIP.id,
                    personId: user3.PersonProfile!.id,
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
            PersonProfile: {
                create: {
                    firstName: 'Diana',
                    lastName: 'Dancer',
                    email: 'diana@test.com'
                }
            }
        },
        include: { PersonProfile: true }
    })

    await prisma.order.create({
        data: {
            organizerId: salsanorOslo.id,
            periodId: period.id,
            purchaserPersonId: user4.PersonProfile!.id,
            status: 'PAID',
            subtotalCents: 200000,
            discountCents: 0,
            subtotalAfterDiscountCents: 200000,
            mvaCents: 0,
            totalCents: 200000,
            pricingSnapshot: JSON.stringify({ subtotalCents: 200000, finalTotalCents: 200000 }),
            Registration: {
                create: {
                    periodId: period.id,
                    trackId: bachataVIP.id,
                    personId: user4.PersonProfile!.id,
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
            PersonProfile: {
                create: {
                    firstName: 'Eve',
                    lastName: 'Evans',
                    email: 'eve@test.com'
                }
            }
        },
        include: { PersonProfile: true }
    })

    const waitlistReg = await prisma.registration.create({
        data: {
            periodId: period.id,
            trackId: bachataVIP.id,
            personId: user5.PersonProfile!.id,
            status: 'WAITLIST',
            chosenRole: 'LEADER',
            WaitlistEntry: {
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
            PersonProfile: {
                create: {
                    firstName: 'Frank',
                    lastName: 'Franklin',
                    email: 'frank@test.com'
                }
            }
        },
        include: { PersonProfile: true }
    })

    await prisma.order.create({
        data: {
            organizerId: salsanorOslo.id,
            periodId: period.id,
            purchaserPersonId: user6.PersonProfile!.id,
            status: 'DRAFT',
            subtotalCents: 150000,
            discountCents: 0,
            subtotalAfterDiscountCents: 150000,
            mvaCents: 0,
            totalCents: 150000,
            pricingSnapshot: JSON.stringify({ subtotalCents: 150000, finalTotalCents: 150000 }),
            Registration: {
                create: {
                    periodId: period.id,
                    trackId: kizomba.id,
                    personId: user6.PersonProfile!.id,
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

    // 6. Create Test User Roles for RLS Testing
    console.log('Creating test user roles...')

    // Create admin user (global access)
    const adminUser = await prisma.userAccount.upsert({
        where: { email: 'admin@salsanor.no' },
        update: {},
        create: {
            supabaseUid: 'test-admin',
            email: 'admin@salsanor.no',
            PersonProfile: {
                create: {
                    firstName: 'Super',
                    lastName: 'Admin',
                    email: 'admin@salsanor.no',
                    phone: '+47 900 00 000'
                }
            }
        },
        include: { PersonProfile: true }
    })

    await prisma.userAccountRole.create({
        data: {
            userId: adminUser.id,
            role: 'ADMIN'
            // No organizerId for global ADMIN role
        }
    })

    // Create org admin for SalsaNor Oslo
    const orgAdminUser = await prisma.userAccount.upsert({
        where: { email: 'orgadmin@salsanor.no' },
        update: {},
        create: {
            supabaseUid: 'test-org-admin',
            email: 'orgadmin@salsanor.no',
            PersonProfile: {
                create: {
                    firstName: 'Org',
                    lastName: 'Admin',
                    email: 'orgadmin@salsanor.no',
                    phone: '+47 900 00 001'
                }
            }
        },
        include: { PersonProfile: true }
    })

    await prisma.userAccountRole.create({
        data: {
            userId: orgAdminUser.id,
            role: 'ORG_ADMIN',
            organizerId: salsanorOslo.id
        }
    })

    // Create finance manager for SalsaNor Oslo
    const financeUser = await prisma.userAccount.upsert({
        where: { email: 'finance@salsanor.no' },
        update: {},
        create: {
            supabaseUid: 'test-finance',
            email: 'finance@salsanor.no',
            PersonProfile: {
                create: {
                    firstName: 'Finance',
                    lastName: 'Manager',
                    email: 'finance@salsanor.no',
                    phone: '+47 900 00 002'
                }
            }
        },
        include: { PersonProfile: true }
    })

    await prisma.userAccountRole.create({
        data: {
            userId: financeUser.id,
            role: 'ORG_FINANCE',
            organizerId: salsanorOslo.id
        }
    })

    // Create check-in staff for SalsaNor Oslo
    const checkinUser = await prisma.userAccount.upsert({
        where: { email: 'checkin@salsanor.no' },
        update: {},
        create: {
            supabaseUid: 'test-checkin',
            email: 'checkin@salsanor.no',
            PersonProfile: {
                create: {
                    firstName: 'Checkin',
                    lastName: 'Staff',
                    email: 'checkin@salsanor.no',
                    phone: '+47 900 00 003'
                }
            }
        },
        include: { PersonProfile: true }
    })

    await prisma.userAccountRole.create({
        data: {
            userId: checkinUser.id,
            role: 'ORG_CHECKIN',
            organizerId: salsanorOslo.id
        }
    })

    // Create instructor for SalsaNor Oslo
    const instructorUser = await prisma.userAccount.upsert({
        where: { email: 'instructor@salsanor.no' },
        update: {},
        create: {
            supabaseUid: 'test-instructor',
            email: 'instructor@salsanor.no',
            PersonProfile: {
                create: {
                    firstName: 'Dance',
                    lastName: 'Instructor',
                    email: 'instructor@salsanor.no',
                    phone: '+47 900 00 004'
                }
            }
        },
        include: { PersonProfile: true }
    })

    await prisma.userAccountRole.create({
        data: {
            userId: instructorUser.id,
            role: 'INSTRUCTOR',
            organizerId: salsanorOslo.id
        }
    })

    // Create org admin for Bergen Salsa Club (different organization)
    const bergenAdminUser = await prisma.userAccount.upsert({
        where: { email: 'admin@bergensalsa.no' },
        update: {},
        create: {
            supabaseUid: 'test-bergen-admin',
            email: 'admin@bergensalsa.no',
            PersonProfile: {
                create: {
                    firstName: 'Bergen',
                    lastName: 'Admin',
                    email: 'admin@bergensalsa.no',
                    phone: '+47 900 00 005'
                }
            }
        },
        include: { PersonProfile: true }
    })

    await prisma.userAccountRole.create({
        data: {
            userId: bergenAdminUser.id,
            role: 'ORG_ADMIN',
            organizerId: bergenSalsa.id
        }
    })

    console.log('✅ Created 6 staff users with various roles:')
    console.log('  - Super Admin: ADMIN (global access)')
    console.log('  - Org Admin: ORG_ADMIN (SalsaNor Oslo)')
    console.log('  - Finance Manager: ORG_FINANCE (SalsaNor Oslo)')
    console.log('  - Checkin Staff: ORG_CHECKIN (SalsaNor Oslo)')
    console.log('  - Instructor: INSTRUCTOR (SalsaNor Oslo)')
    console.log('  - Bergen Admin: ORG_ADMIN (Bergen Salsa Club)')

    // 7. Create Test Events
    console.log('\nCreating test events...')

    // Delete existing test events
    await prisma.event.deleteMany({
        where: {
            slug: {
                in: ['salsa-social-april', 'bachata-workshop-may', 'summer-dance-festival', 'kizomba-night-bergen']
            }
        }
    })

    // Event 1: Salsa Social (Oslo) - Upcoming
    const salsaSocial = await prisma.event.create({
        data: {
            organizerId: salsanorOslo.id,
            slug: 'salsa-social-april',
            title: 'Salsa Social Night',
            eventType: 'SINGLE',
            shortDescription: 'Monthly salsa social with DJ and live band',
            longDescription: 'Join us for our monthly salsa social! The evening starts with a beginner workshop at 19:00, followed by open dancing until midnight. Live band from 21:00.',
            startDateTime: new Date('2026-04-18T19:00:00'),
            endDateTime: new Date('2026-04-19T00:00:00'),
            timezone: 'Europe/Oslo',
            locationName: 'Dansens Hus',
            locationAddress: 'Vulkan 1',
            city: 'Oslo',
            salesOpenAt: new Date('2026-03-01'),
            salesCloseAt: new Date('2026-04-18T18:00:00'),
            capacityTotal: 150,
            basePriceCents: 25000, // 250 kr
            memberPriceCents: 20000, // 200 kr for members
            status: 'PUBLISHED',
            published: true,
            featured: true
        }
    })

    // Event 2: Bachata Workshop (Oslo) - May
    const bachataWorkshop = await prisma.event.create({
        data: {
            organizerId: salsanorOslo.id,
            slug: 'bachata-workshop-may',
            title: 'Bachata Sensual Workshop',
            eventType: 'SINGLE',
            shortDescription: 'Intensive bachata sensual workshop with guest instructors',
            longDescription: 'A full day of bachata sensual with international guest instructors. Includes 4 hours of workshops and a social in the evening.',
            startDateTime: new Date('2026-05-09T12:00:00'),
            endDateTime: new Date('2026-05-09T22:00:00'),
            timezone: 'Europe/Oslo',
            locationName: 'SalsaNor Studio',
            locationAddress: 'Torggata 15',
            city: 'Oslo',
            salesOpenAt: new Date('2026-03-15'),
            salesCloseAt: new Date('2026-05-08T23:59:00'),
            capacityTotal: 60,
            requiresRole: true, // Leader/follower balance
            basePriceCents: 89900, // 899 kr
            memberPriceCents: 79900, // 799 kr
            status: 'PUBLISHED',
            published: true
        }
    })

    // Event 3: Summer Dance Festival (Oslo) - June - Multi-day
    const summerFestival = await prisma.event.create({
        data: {
            organizerId: salsanorOslo.id,
            slug: 'summer-dance-festival',
            title: 'Oslo Summer Dance Festival 2026',
            eventType: 'SINGLE', // Multi-day but single registration
            shortDescription: '3-day Latin dance festival with workshops, shows, and parties',
            longDescription: 'The biggest Latin dance event in Norway! Three days of workshops in salsa, bachata, and kizomba with international artists. Evening parties and shows.',
            startDateTime: new Date('2026-06-19T10:00:00'),
            endDateTime: new Date('2026-06-21T23:59:00'),
            timezone: 'Europe/Oslo',
            locationName: 'Oslo Spektrum',
            locationAddress: 'Sonja Henies plass 2',
            city: 'Oslo',
            salesOpenAt: new Date('2026-01-01'),
            salesCloseAt: new Date('2026-06-15T23:59:00'),
            capacityTotal: 500,
            basePriceCents: 249900, // 2499 kr full pass
            memberPriceCents: 229900, // 2299 kr
            status: 'PUBLISHED',
            published: true,
            featured: true
        }
    })

    // Event 4: Kizomba Night (Bergen) - Draft event
    const kizombaNight = await prisma.event.create({
        data: {
            organizerId: bergenSalsa.id,
            slug: 'kizomba-night-bergen',
            title: 'Kizomba Night Bergen',
            eventType: 'SINGLE',
            shortDescription: 'Monthly kizomba and urban kiz party',
            startDateTime: new Date('2026-04-25T20:00:00'),
            endDateTime: new Date('2026-04-26T02:00:00'),
            timezone: 'Europe/Oslo',
            locationName: 'Bergenhus Kulturhus',
            city: 'Bergen',
            salesOpenAt: new Date('2026-03-20'),
            salesCloseAt: new Date('2026-04-25T19:00:00'),
            capacityTotal: 80,
            basePriceCents: 20000, // 200 kr
            status: 'DRAFT',
            published: false
        }
    })

    console.log('✅ Created 4 test events:')
    console.log('  - Salsa Social Night (Oslo, April 18) - Published, Featured')
    console.log('  - Bachata Workshop (Oslo, May 9) - Published, Role-balanced')
    console.log('  - Summer Dance Festival (Oslo, June 19-21) - Published, Multi-day, Featured')
    console.log('  - Kizomba Night (Bergen, April 25) - Draft')

    console.log('\n✅ Seed complete!')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
