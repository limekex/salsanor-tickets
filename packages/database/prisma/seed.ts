
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting seed...')

    // 1. Cleanup previous test data (Idempotency)
    const testPeriodCode = 'FALL2026'
    const templateTestPeriodCode = 'TEMPLATES2026'

    // Helper to delete all data for a period by code
    async function deletePeriodByCode(code: string) {
        const existing = await prisma.coursePeriod.findUnique({ where: { code } })
        if (!existing) return
        console.log(`Deleting existing period ${code}...`)
        await prisma.waitlistEntry.deleteMany({ where: { Registration: { periodId: existing.id } } })
        await prisma.registration.deleteMany({ where: { periodId: existing.id } })
        await prisma.payment.deleteMany({ where: { Order: { periodId: existing.id } } })
        await prisma.order.deleteMany({ where: { periodId: existing.id } })
        await prisma.ticket.deleteMany({ where: { periodId: existing.id } })
        await prisma.discountRule.deleteMany({ where: { periodId: existing.id } })
        await prisma.courseTrack.deleteMany({ where: { periodId: existing.id } })
        await prisma.coursePeriod.delete({ where: { id: existing.id } })
    }

    await deletePeriodByCode(testPeriodCode)
    await deletePeriodByCode(templateTestPeriodCode)

    // Delete @test.com users (comprehensive cleanup for all FK relations)
    const testUsers = await prisma.userAccount.findMany({
        where: { email: { contains: '@test.com' } }
    })
    for (const user of testUsers) {
        const profiles = await prisma.personProfile.findMany({ where: { userId: user.id } })
        for (const profile of profiles) {
            // Delete in order respecting FK constraints:
            // 1. Attendance → Registration
            const regs = await prisma.registration.findMany({ where: { personId: profile.id } })
            for (const reg of regs) {
                await prisma.attendance.deleteMany({ where: { registrationId: reg.id } })
            }
            // 2. WaitlistEntry → Registration
            await prisma.waitlistEntry.deleteMany({ where: { Registration: { personId: profile.id } } })
            // 3. Registration → PersonProfile
            await prisma.registration.deleteMany({ where: { personId: profile.id } })
            // 4. Order FKs: CreditNote, Invoice, Payment, EventRegistration, Membership (order-related) → Order → PersonProfile
            const orders = await prisma.order.findMany({ where: { purchaserPersonId: profile.id } })
            for (const order of orders) {
                await prisma.creditNote.deleteMany({ where: { orderId: order.id } })
                await prisma.invoice.deleteMany({ where: { orderId: order.id } })
                await prisma.payment.deleteMany({ where: { orderId: order.id } })
                await prisma.eventRegistration.deleteMany({ where: { orderId: order.id } })
            }
            await prisma.order.deleteMany({ where: { purchaserPersonId: profile.id } })
            // 5. CheckIn → Ticket → PersonProfile, then Ticket → PersonProfile
            const tickets = await prisma.ticket.findMany({ where: { personId: profile.id } })
            for (const ticket of tickets) {
                await prisma.checkIn.deleteMany({ where: { ticketId: ticket.id } })
            }
            await prisma.ticket.deleteMany({ where: { personId: profile.id } })
            // 6. Membership → PersonProfile
            await prisma.membership.deleteMany({ where: { personId: profile.id } })
            // 7. EventTicket → PersonProfile
            await prisma.eventTicket.deleteMany({ where: { personId: profile.id } })
        }
        await prisma.personProfile.deleteMany({ where: { userId: user.id } })
        await prisma.userAccount.delete({ where: { id: user.id } })
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
        // Delete events and their related data first
        const events = await prisma.event.findMany({ where: { organizerId: org.id } })
        for (const event of events) {
            await prisma.eventRegistration.deleteMany({ where: { eventId: event.id } })
            await prisma.eventSession.deleteMany({ where: { eventId: event.id } })
            await prisma.eventTicket.deleteMany({ where: { eventId: event.id } })
        }
        await prisma.event.deleteMany({ where: { organizerId: org.id } })
        
        // Get all periods for this organizer
        const periods = await prisma.coursePeriod.findMany({
            where: { organizerId: org.id }
        })
        
        for (const p of periods) {
            // Clean up period data - respecting FK constraints
            // 1. Attendance → Registration
            await prisma.attendance.deleteMany({
                where: { Registration: { periodId: p.id } }
            })
            await prisma.waitlistEntry.deleteMany({
                where: { Registration: { periodId: p.id } }
            })
            await prisma.registration.deleteMany({ where: { periodId: p.id } })
            // Order FKs: Invoice, CreditNote, Payment
            await prisma.invoice.deleteMany({
                where: { Order: { periodId: p.id } }
            })
            await prisma.creditNote.deleteMany({
                where: { Order: { periodId: p.id } }
            })
            await prisma.payment.deleteMany({
                where: { Order: { periodId: p.id } }
            })
            await prisma.order.deleteMany({ where: { periodId: p.id } })
            // 2. CheckIn → Ticket
            const tickets = await prisma.ticket.findMany({ where: { periodId: p.id } })
            for (const ticket of tickets) {
                await prisma.checkIn.deleteMany({ where: { ticketId: ticket.id } })
            }
            await prisma.ticket.deleteMany({ where: { periodId: p.id } })
            await prisma.discountRule.deleteMany({ where: { periodId: p.id } })
            // 3. TrackSession → CourseTrack
            const tracks = await prisma.courseTrack.findMany({ where: { periodId: p.id } })
            for (const track of tracks) {
                await prisma.trackSession.deleteMany({ where: { trackId: track.id } })
            }
            await prisma.courseTrack.deleteMany({ where: { periodId: p.id } })
            await prisma.coursePeriod.delete({ where: { id: p.id } })
        }
        
        // Delete user roles for this org
        await prisma.userAccountRole.deleteMany({ where: { organizerId: org.id } })
        
        // Delete remaining organizer-level FKs (in dependency order)
        await prisma.auditLog.deleteMany({ where: { organizerId: org.id } })
        await prisma.scheduledTask.deleteMany({ where: { organizerId: org.id } })
        await prisma.invoice.deleteMany({ where: { organizerId: org.id } })
        await prisma.creditNote.deleteMany({ where: { Order: { organizerId: org.id } } })
        await prisma.payment.deleteMany({ where: { Order: { organizerId: org.id } } })
        await prisma.eventRegistration.deleteMany({ where: { Order: { organizerId: org.id } } })
        await prisma.registration.deleteMany({ where: { Order: { organizerId: org.id } } })
        await prisma.order.deleteMany({ where: { organizerId: org.id } })
        await prisma.membership.deleteMany({ where: { organizerId: org.id } })
        await prisma.membershipTier.deleteMany({ where: { organizerId: org.id } })
        await prisma.orgDiscountRule.deleteMany({ where: { organizerId: org.id } })
        await prisma.emailTemplate.deleteMany({ where: { organizerId: org.id } })
        await prisma.userInvitation.deleteMany({ where: { organizerId: org.id } })
        
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

    // 8. Create Template Test Period (demonstrates all new course template types and custom fields)
    console.log('\nCreating template test period...')

    const templatePeriod = await prisma.coursePeriod.create({
        data: {
            organizerId: salsanorOslo.id,
            name: 'Course Templates Test 2026',
            code: templateTestPeriodCode,
            city: 'Oslo',
            startDate: new Date('2026-09-01'),
            endDate: new Date('2026-12-15'),
            salesOpenAt: new Date('2026-03-01'),
            salesCloseAt: new Date('2026-09-15'),
            templateType: 'INDIVIDUAL',
            deliveryMethod: 'IN_PERSON',
            description: 'Test period showcasing all course template types introduced in Issue #13',
        }
    })

    // --- INDIVIDUAL: Yoga class with health custom fields ---
    await prisma.courseTrack.create({
        data: {
            periodId: templatePeriod.id,
            templateType: 'INDIVIDUAL',
            deliveryMethod: 'IN_PERSON',
            title: 'Morning Yoga (Individual)',
            description: 'A weekly yoga class for all levels. No partner required. Individual registration only.',
            weekday: 1, // Monday
            timeStart: '07:00',
            timeEnd: '08:00',
            levelLabel: 'All levels',
            locationName: 'SalsaNor Studio',
            locationAddress: 'Torggata 15, 0181 Oslo',
            latitude: 59.9171,
            longitude: 10.7506,
            capacityTotal: 20,
            priceSingleCents: 120000,
            memberPriceSingleCents: 100000, // Member discount
            waitlistEnabled: true,
            allowSelfCheckIn: true,
            checkInWindowBefore: 30,
            checkInWindowAfter: 15,
        }
    })

    // --- PARTNER: Salsa with role selection and custom fields ---
    const partnerTrack = await prisma.courseTrack.create({
        data: {
            periodId: templatePeriod.id,
            templateType: 'PARTNER',
            deliveryMethod: 'IN_PERSON',
            title: 'Salsa Beginner (Partner)',
            description: 'Classic partner salsa course for beginners. Choose your role (Leader/Follower) at registration.',
            weekday: 2, // Tuesday
            timeStart: '19:00',
            timeEnd: '20:00',
            levelLabel: 'Beginner',
            locationName: 'SalsaNor Studio',
            locationAddress: 'Torggata 15, 0181 Oslo',
            latitude: 59.9171,
            longitude: 10.7506,
            capacityTotal: 30,
            capacityLeaders: 15,
            capacityFollowers: 15,
            rolePolicy: 'ANY',
            roleALabel: 'Leader',
            roleBLabel: 'Follower',
            priceSingleCents: 150000,
            pricePairCents: 250000,
            memberPriceSingleCents: 125000,
            memberPricePairCents: 200000,
            waitlistEnabled: true,
            allowSelfCheckIn: true,
            checkInWindowBefore: 30,
            checkInWindowAfter: 30,
        }
    })

    // Update the period with custom fields that apply to this template test
    // (Custom fields are stored at the period level, so all tracks share them)
    await prisma.coursePeriod.update({
        where: { id: templatePeriod.id },
        data: {
            customFields: [
                {
                    id: 'exp-level',
                    type: 'SELECT',
                    label: 'Dance experience level',
                    required: true,
                    options: [
                        { value: 'none', label: 'Complete beginner (no experience)' },
                        { value: 'some', label: 'Some experience (0–1 year)' },
                        { value: 'intermediate', label: 'Intermediate (1–3 years)' },
                        { value: 'advanced', label: 'Advanced (3+ years)' }
                    ],
                    order: 0
                },
                {
                    id: 'hear-about',
                    type: 'RADIO',
                    label: 'How did you hear about us?',
                    required: false,
                    options: [
                        { value: 'friend', label: 'Friend or family' },
                        { value: 'social', label: 'Social media' },
                        { value: 'google', label: 'Google / web search' },
                        { value: 'other', label: 'Other' }
                    ],
                    order: 1
                },
                {
                    id: 'tshirt',
                    type: 'SELECT',
                    label: 'T-shirt size (included with registration)',
                    required: true,
                    options: [
                        { value: 'xs', label: 'XS' },
                        { value: 's', label: 'S' },
                        { value: 'm', label: 'M' },
                        { value: 'l', label: 'L' },
                        { value: 'xl', label: 'XL' },
                        { value: 'xxl', label: 'XXL' }
                    ],
                    order: 2
                },
                {
                    id: 'notes',
                    type: 'TEXTAREA',
                    label: 'Any additional notes for the instructor?',
                    required: false,
                    placeholder: 'e.g. injuries, special requests…',
                    order: 3
                }
            ]
        }
    })

    // --- VIRTUAL: Online fitness class via Zoom ---
    await prisma.courseTrack.create({
        data: {
            periodId: templatePeriod.id,
            templateType: 'VIRTUAL',
            deliveryMethod: 'VIRTUAL',
            title: 'Online Fitness (Virtual)',
            description: 'Live-streamed fitness class via Zoom. Join from anywhere in the world. Link provided after registration.',
            weekday: 3, // Wednesday
            timeStart: '18:00',
            timeEnd: '19:00',
            levelLabel: 'All levels',
            capacityTotal: 100,
            capacityLeaders: 50,
            capacityFollowers: 50,
            rolePolicy: 'ANY',
            priceSingleCents: 80000,
            pricePairCents: 140000,
            memberPriceSingleCents: 65000,
            meetingUrl: 'https://zoom.us/j/1234567890',
            meetingPassword: 'fitness2026',
            waitlistEnabled: true,
        }
    })

    // --- WORKSHOP: One-time masterclass (non-recurring) ---
    await prisma.courseTrack.create({
        data: {
            periodId: templatePeriod.id,
            templateType: 'WORKSHOP',
            deliveryMethod: 'IN_PERSON',
            title: 'Bachata Masterclass (Workshop)',
            description: 'Single-session masterclass with international guest instructor. Non-recurring event. Pair discount available.',
            weekday: 6, // Saturday
            timeStart: '13:00',
            timeEnd: '16:00',
            levelLabel: 'Intermediate+',
            locationName: 'SalsaNor Studio',
            locationAddress: 'Torggata 15, 0181 Oslo',
            latitude: 59.9171,
            longitude: 10.7506,
            capacityTotal: 40,
            priceSingleCents: 59900,
            pricePairCents: 99900,
            memberPriceSingleCents: 49900,
            memberPricePairCents: 89900,
            waitlistEnabled: true,
            allowSelfCheckIn: true,
            checkInWindowBefore: 60,
            checkInWindowAfter: 30,
        }
    })

    // --- DROP_IN: Open gym / practice session (pay per visit, no commitment) ---
    await prisma.courseTrack.create({
        data: {
            periodId: templatePeriod.id,
            templateType: 'DROP_IN',
            deliveryMethod: 'IN_PERSON',
            title: 'Open Practice (Drop-In)',
            description: 'No commitment required. Drop in whenever you like. Pay per session. Perfect for practicing with a partner.',
            weekday: 5, // Friday
            timeStart: '20:00',
            timeEnd: '22:00',
            levelLabel: 'All levels',
            locationName: 'SalsaNor Studio',
            locationAddress: 'Torggata 15, 0181 Oslo',
            latitude: 59.9171,
            longitude: 10.7506,
            capacityTotal: 50,
            priceSingleCents: 15000, // 150 kr per session
            memberPriceSingleCents: 10000, // 100 kr for members
            waitlistEnabled: false, // No waitlist for drop-in
            allowSelfCheckIn: true,
            checkInWindowBefore: 15,
            checkInWindowAfter: 60,
        }
    })

    // --- KIDS_YOUTH: After-school dance class (age restricted) ---
    await prisma.courseTrack.create({
        data: {
            periodId: templatePeriod.id,
            templateType: 'KIDS_YOUTH',
            deliveryMethod: 'IN_PERSON',
            title: 'Kids Dance Class (Kids/Youth)',
            description: 'Fun dance class for kids aged 6–12. Parent/guardian contact required at registration. Pickup instructions provided.',
            weekday: 4, // Thursday
            timeStart: '16:00',
            timeEnd: '17:00',
            levelLabel: 'Beginner',
            locationName: 'SalsaNor Studio',
            locationAddress: 'Torggata 15, 0181 Oslo',
            latitude: 59.9171,
            longitude: 10.7506,
            capacityTotal: 15,
            priceSingleCents: 100000,
            memberPriceSingleCents: 85000,
            minAge: 6,  // Age restriction!
            maxAge: 12, // Age restriction!
            waitlistEnabled: true,
            allowSelfCheckIn: false, // Kids need supervised check-in
        }
    })

    // --- TEAM: Group / corporate booking (team size restrictions) ---
    await prisma.courseTrack.create({
        data: {
            periodId: templatePeriod.id,
            templateType: 'TEAM',
            deliveryMethod: 'IN_PERSON',
            title: 'Team Building Dance (Team)',
            description: 'Corporate team-building dance session. Register your team of 4-8 people. Price is per team, not per person.',
            weekday: 2, // Tuesday
            timeStart: '17:00',
            timeEnd: '18:30',
            levelLabel: 'All levels',
            locationName: 'SalsaNor Studio',
            locationAddress: 'Torggata 15, 0181 Oslo',
            latitude: 59.9171,
            longitude: 10.7506,
            capacityTotal: 8, // 8 teams max
            priceSingleCents: 500000, // 5000 kr per TEAM
            memberPriceSingleCents: 400000, // Member discount per team
            teamMinSize: 4, // Min team size
            teamMaxSize: 8, // Max team size
            waitlistEnabled: true,
        }
    })

    // --- SUBSCRIPTION: Unlimited monthly access (recurring billing) ---
    await prisma.courseTrack.create({
        data: {
            periodId: templatePeriod.id,
            templateType: 'SUBSCRIPTION',
            deliveryMethod: 'HYBRID', // Can attend in-person or online
            title: 'Unlimited Monthly Access (Subscription)',
            description: 'Subscribe for unlimited classes! Attend any regular class in person or join virtual sessions. Auto-renews monthly. Cancel anytime.',
            weekday: 0, // Sunday (indicates any day for subscription)
            timeStart: '00:00',
            timeEnd: '23:59',
            levelLabel: 'All levels',
            locationName: 'All SalsaNor Locations',
            locationAddress: 'Multiple venues in Oslo',
            capacityTotal: 200, // Max subscribers
            priceSingleCents: 199900, // 1999 kr / month
            memberPriceSingleCents: 179900, // 1799 kr member discount
            waitlistEnabled: true, // Waitlist if max subscribers reached
            meetingUrl: 'https://zoom.us/j/subscription', // Access to virtual classes
        }
    })

    // --- PRIVATE: 1-on-1 coaching with slot booking ---
    await prisma.courseTrack.create({
        data: {
            periodId: templatePeriod.id,
            templateType: 'PRIVATE',
            deliveryMethod: 'IN_PERSON',
            title: 'Private Lesson (Private/1-on-1)',
            description: 'Book a private lesson with our head instructor. Slots available from 10:00-15:00 on Saturdays. 45-minute sessions with 15-minute breaks. Book up to 2 consecutive slots for extended sessions.',
            weekday: 6, // Saturday
            timeStart: '10:00',
            timeEnd: '15:00', // Calculated from slots but stored for reference
            levelLabel: 'All levels',
            locationName: 'SalsaNor Private Studio',
            locationAddress: 'Torggata 15, 0181 Oslo',
            latitude: 59.9171,
            longitude: 10.7506,
            capacityTotal: 1, // 1 person per slot
            priceSingleCents: 89900, // Base price (not used for slot booking)
            memberPriceSingleCents: 79900, // Member base price
            // SLOT BOOKING CONFIG:
            slotStartTime: '10:00', // First slot at 10:00
            slotDurationMinutes: 45, // 45 min per slot
            slotBreakMinutes: 15, // 15 min break between
            slotCount: 5, // 5 slots available (10:00, 11:00, 12:00, 13:00, 14:00)
            pricePerSlotCents: 89900, // 899 kr per 45-min slot
            maxContinuousSlots: 2, // Max 2 slots in a row (90 min session)
            waitlistEnabled: true,
        }
    })

    // --- CUSTOM: Fully configurable for specialized use cases ---
    await prisma.courseTrack.create({
        data: {
            periodId: templatePeriod.id,
            templateType: 'CUSTOM',
            deliveryMethod: 'HYBRID',
            title: 'Cooking Class (Custom)',
            description: 'An advanced cooking workshop combining in-person instruction with online recipe access. All fields enabled for maximum flexibility. Pair discount for couples!',
            weekday: 3, // Wednesday
            timeStart: '18:30',
            timeEnd: '21:00',
            levelLabel: 'Intermediate',
            locationName: 'Matkurs Studio',
            locationAddress: 'Mathallen, Vulkan 5, 0178 Oslo',
            latitude: 59.9225,
            longitude: 10.7520,
            capacityTotal: 24,
            capacityLeaders: 12, // 12 chef stations
            capacityFollowers: 12, // +1 assistant per station
            rolePolicy: 'ANY', // Book as chef or assistant
            roleALabel: 'Chef', // Custom role labels
            roleBLabel: 'Sous Chef',
            priceSingleCents: 149900, // 1499 kr single
            pricePairCents: 249900, // 2499 kr pair
            memberPriceSingleCents: 129900,
            memberPricePairCents: 219900,
            minAge: 18, // Adults only
            meetingUrl: 'https://recipes.example.com/class', // Online recipe access
            waitlistEnabled: true,
            allowSelfCheckIn: true,
            checkInWindowBefore: 30,
            checkInWindowAfter: 15,
        }
    })

    // Add a test registration with customFieldValues to demonstrate the full flow
    const templateUser = await prisma.userAccount.create({
        data: {
            supabaseUid: 'test-template-user',
            email: 'template@test.com',
            PersonProfile: {
                create: {
                    firstName: 'Template',
                    lastName: 'Tester',
                    email: 'template@test.com',
                    phone: '+47 123 99 000'
                }
            }
        },
        include: { PersonProfile: true }
    })

    await prisma.order.create({
        data: {
            organizerId: salsanorOslo.id,
            periodId: templatePeriod.id,
            purchaserPersonId: templateUser.PersonProfile!.id,
            status: 'PAID',
            subtotalCents: 150000,
            discountCents: 0,
            subtotalAfterDiscountCents: 150000,
            mvaCents: 0,
            totalCents: 150000,
            pricingSnapshot: JSON.stringify({ subtotalCents: 150000, finalTotalCents: 150000 }),
            Registration: {
                create: {
                    periodId: templatePeriod.id,
                    trackId: partnerTrack.id,
                    personId: templateUser.PersonProfile!.id,
                    status: 'ACTIVE',
                    chosenRole: 'LEADER',
                    customFieldValues: {
                        'exp-level': 'intermediate',
                        'hear-about': 'social',
                        'tshirt': 'l',
                        'notes': 'Minor left knee issue, please notify instructor.'
                    }
                }
            }
        }
    })

    console.log(`✅ Created template test period "${templatePeriod.name}" (${templateTestPeriodCode})`)
    console.log('   Tracks: Individual (Yoga), Partner (Salsa), Virtual (Online Fitness),')
    console.log('           Workshop (Bachata Masterclass), Drop-In (Open Practice),')
    console.log('           Kids/Youth (Kids Dance), Team (Team Building), Subscription, Private, Custom')
    console.log('   Custom fields: exp-level (SELECT), hear-about (RADIO), tshirt (SELECT), notes (TEXTAREA)')
    console.log('   Test registration with customFieldValues: template@test.com')

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
