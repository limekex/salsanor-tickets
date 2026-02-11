import { EventCard, CourseCard, OrganizerCard, OrderCard } from '@/components'

export default function DemoCardsPage() {
  // Mock data for EventCard
  const mockEvent = {
    id: '1',
    slug: 'salsa-social-oslo',
    title: 'Salsa Social - Oslo City',
    shortDescription: 'Join us for an amazing night of salsa dancing with live music and great atmosphere. Perfect for beginners and experienced dancers alike!',
    startDateTime: new Date('2026-03-15T20:00:00'),
    endDateTime: new Date('2026-03-15T23:00:00'),
    locationName: 'Oslo Dance Studio',
    city: 'Oslo',
    featured: true,
    imageUrl: null,
    basePriceCents: 0,
    memberPriceCents: null,
    capacityTotal: 100,
    Category: [],
    Tag: [],
    Organizer: {
      id: 'org-1',
      name: 'Oslo Salsa Club',
      slug: 'oslo-salsa-club',
      logoUrl: null,
    },
    EventRegistration: [
      { quantity: 35 },
      { quantity: 32 },
    ],
  }

  const mockEventFull = {
    ...mockEvent,
    id: '2',
    slug: 'bachata-night',
    title: 'Bachata Night - Sold Out',
    shortDescription: 'Popular bachata night with the best DJs in town.',
    startDateTime: new Date('2026-02-28T21:00:00'),
    capacityTotal: 50,
    EventRegistration: [
      { quantity: 30 },
      { quantity: 20 },
    ],
  }

  const mockEventPast = {
    ...mockEvent,
    id: '3',
    slug: 'past-event',
    title: 'Past Salsa Workshop',
    shortDescription: 'This event has already happened.',
    startDateTime: new Date('2026-01-15T19:00:00'),
    endDateTime: new Date('2026-01-15T22:00:00'),
    featured: false,
  }

  // Mock data for CourseCard
  const mockCourseTrack = {
    id: 'track-1',
    title: 'Beginner Salsa - Monday Evening',
    weekday: 1, // Monday
    timeStart: '19:00',
    timeEnd: '20:30',
    levelLabel: 'Beginner',
    priceSingleCents: 240000, // 2400,-
    pricePairCents: 400000, // 4000,-
    capacityTotal: 24,
  }

  const mockCoursePeriod = {
    id: 'period-1',
    name: 'Spring Semester 2026',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-05-31'),
    salesOpenAt: new Date('2026-02-01'),
    salesCloseAt: new Date('2026-03-10'),
    organizerId: 'org-1',
  }

  const mockCourseTrackFull = {
    ...mockCourseTrack,
    id: 'track-2',
    title: 'Intermediate Salsa - Wednesday',
    weekday: 3, // Wednesday
    levelLabel: 'Intermediate',
    capacityTotal: 20,
  }

  const mockCoursePeriodClosed = {
    ...mockCoursePeriod,
    id: 'period-2',
    name: 'Winter Semester 2026',
    salesCloseAt: new Date('2026-01-15'),
  }

  const mockCourseTrackClosed = {
    ...mockCourseTrack,
    id: 'track-3',
    title: 'Advanced Salsa - Friday',
    weekday: 5, // Friday
    levelLabel: 'Advanced',
  }

  // Mock data for OrganizerCard
  const mockOrganizer = {
    id: 'org-1',
    name: 'Oslo Salsa Club',
    slug: 'oslo-salsa-club',
    description:
      'Leading salsa and bachata dance organization in Oslo. We offer courses, workshops, and social events for all levels. Join our vibrant community!',
    logoUrl: null,
    city: 'Oslo',
  }

  const mockOrganizerWithLogo = {
    id: 'org-2',
    name: 'Bergen Bachata',
    slug: 'bergen-bachata',
    description: 'Bachata specialists bringing the best Dominican style to Bergen.',
    logoUrl: '/logo-placeholder.jpg',
    city: 'Bergen',
  }

  // Mock data for OrderCard
  const mockOrderCompleted = {
    id: 'order-1',
    orderNumber: 'ORD-2026-001234',
    status: 'COMPLETED' as const,
    totalCents: 2850,
    createdAt: new Date('2026-02-05T14:30:00'),
    organizerId: 'org-1',
    organizer: {
      name: 'Oslo Salsa Club',
      slug: 'oslo-salsa-club',
    },
    eventRegistrations: [
      {
        id: 'reg-1',
        event: {
          id: 'evt-1',
          title: 'Salsa Social Night',
          startDateTime: new Date('2026-03-15T20:00:00'),
        },
        quantity: 2,
        pricePerTicket: 250,
      },
    ],
    courseRegistrations: [
      {
        id: 'reg-2',
        courseTrack: {
          id: 'track-1',
          courseLevel: 'BEGINNER',
          weekday: 'MONDAY',
          coursePeriod: {
            title: 'Spring Semester 2026',
          },
        },
        finalPrice: 2400,
      },
    ],
  }

  const mockOrderPending = {
    id: 'order-2',
    orderNumber: 'ORD-2026-001235',
    status: 'PENDING_PAYMENT' as const,
    totalCents: 500,
    createdAt: new Date('2026-02-09T10:15:00'),
    organizerId: 'org-1',
    organizer: {
      name: 'Bergen Bachata',
      slug: 'bergen-bachata',
    },
    eventRegistrations: [
      {
        id: 'reg-3',
        event: {
          id: 'evt-2',
          title: 'Bachata Workshop',
          startDateTime: new Date('2026-02-28T18:00:00'),
        },
        quantity: 1,
        pricePerTicket: 500,
      },
    ],
    courseRegistrations: [],
  }

  const mockOrderCancelled = {
    id: 'order-3',
    orderNumber: 'ORD-2026-001236',
    status: 'CANCELLED' as const,
    totalCents: 250,
    createdAt: new Date('2026-01-20T16:45:00'),
    organizerId: 'org-1',
    organizer: {
      name: 'Oslo Salsa Club',
      slug: 'oslo-salsa-club',
    },
    eventRegistrations: [
      {
        id: 'reg-4',
        event: {
          id: 'evt-3',
          title: 'New Years Party',
          startDateTime: new Date('2026-01-31T22:00:00'),
        },
        quantity: 1,
        pricePerTicket: 250,
      },
    ],
    courseRegistrations: [],
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Component Demo</h1>
          <p className="text-lg text-slate-600">
            Reusable cards for events, courses, organizers, and orders
          </p>
        </div>

        {/* EventCard Section */}
        <section className="mb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">EventCard</h2>
            <p className="text-slate-600">
              Display event information with registration status and capacity
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Featured Event</p>
              <EventCard event={mockEvent} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Sold Out</p>
              <EventCard event={mockEventFull} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Past Event</p>
              <EventCard event={mockEventPast} />
            </div>
          </div>
        </section>

        {/* CourseCard Section */}
        <section className="mb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">CourseCard</h2>
            <p className="text-slate-600">
              Display course track with schedule, pricing, and registration
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Available Course</p>
              <CourseCard 
                track={mockCourseTrack}
                period={mockCoursePeriod}
                weekDayLabel="Monday"
                isSalesOpen={true}
                organizerId="org-1"
                organizerName="Oslo Salsa Club"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Full Course</p>
              <CourseCard 
                track={mockCourseTrackFull}
                period={mockCoursePeriod}
                weekDayLabel="Wednesday"
                isSalesOpen={true}
                organizerId="org-1"
                organizerName="Oslo Salsa Club"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Registration Closed</p>
              <CourseCard 
                track={mockCourseTrackClosed}
                period={mockCoursePeriodClosed}
                weekDayLabel="Friday"
                isSalesOpen={false}
                organizerId="org-1"
                organizerName="Oslo Salsa Club"
              />
            </div>
          </div>
        </section>

        {/* OrganizerCard Section */}
        <section className="mb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">OrganizerCard</h2>
            <p className="text-slate-600">Display organizer information with event counts</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Featured Organizer</p>
              <OrganizerCard
                organizer={mockOrganizer}
                eventCount={12}
                courseCount={4}
                featured
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">With Logo</p>
              <OrganizerCard
                organizer={mockOrganizerWithLogo}
                eventCount={8}
                courseCount={2}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Standard</p>
              <OrganizerCard organizer={mockOrganizer} eventCount={5} courseCount={1} />
            </div>
          </div>
        </section>

        {/* OrderCard Section */}
        <section className="mb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">OrderCard</h2>
            <p className="text-slate-600">Display order history with status and items</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Completed Order</p>
              <OrderCard order={mockOrderCompleted} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Pending Payment</p>
              <OrderCard order={mockOrderPending} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Cancelled Order</p>
              <OrderCard order={mockOrderCancelled} />
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="bg-white rounded-lg shadow-md p-8 border border-slate-200">
          <h3 className="text-xl font-semibold text-slate-800 mb-4">Component Usage</h3>
          <div className="space-y-4 text-slate-700">
            <div>
              <code className="bg-slate-100 px-2 py-1 rounded text-sm">EventCard</code>
              <p className="mt-1 text-sm">
                Used on event listings, search results, and organizer profiles. Shows capacity
                and registration status.
              </p>
            </div>
            <div>
              <code className="bg-slate-100 px-2 py-1 rounded text-sm">CourseCard</code>
              <p className="mt-1 text-sm">
                Used on course listings with cart integration. Shows schedule, pricing, and
                availability.
              </p>
            </div>
            <div>
              <code className="bg-slate-100 px-2 py-1 rounded text-sm">OrganizerCard</code>
              <p className="mt-1 text-sm">
                Used on organizer listings and search. Shows logo, location, and content counts.
              </p>
            </div>
            <div>
              <code className="bg-slate-100 px-2 py-1 rounded text-sm">OrderCard</code>
              <p className="mt-1 text-sm">
                Used in order history and confirmations. Shows status, items, and total amount.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
