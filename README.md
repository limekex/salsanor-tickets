# SalsaNor Tickets

A modern, scalable course registration and ticketing platform designed for dance organizations running multi-track course periods with complex pricing, role-based registration, and QR-based check-in.

## 🎯 Overview

SalsaNor Tickets replaces traditional registration systems (like LetsReg) with a comprehensive platform that handles:

- **Course Period Management**: 6-8 week course rounds with multiple parallel tracks
- **Complex Pricing**: Explainable discount logic (multi-course, membership, pair pricing, promo codes)
- **Role-Based Registration**: Leader/Follower/Pair registration with capacity management
- **Waitlist Management**: Automatic waitlist handling with promotion workflows
- **Digital Tickets**: QR code generation and validation
- **Check-in System**: Mobile-friendly scanning app for door staff
- **Membership Integration**: Import and sync member data for automatic discount eligibility
- **Multi-Organization Support**: Manage multiple dance organizations from a single platform

## ✨ Key Features

### For Participants
- Browse upcoming course periods and available tracks
- Add multiple tracks to cart with real-time pricing
- See detailed discount explanations
- Register as leader, follower, or as a pair
- Join waitlists when tracks are full
- Access digital tickets (QR codes) for check-in
- Track registration status and payment history

### For Administrators
- Create and manage course periods (6-8 week rounds)
- Set up parallel course tracks with day/time/level/capacity
- Configure complex discount rules with priority ordering
- Manage registrations and promote from waitlist
- View participant lists and export to CSV/Excel
- Handle multiple organizations with scoped access
- Monitor payments and financial reporting

### For Check-in Staff
- Scan QR codes at the door
- Instantly verify participant eligibility and payment
- Log attendance per session or period entry
- Offline-capable PWA for reliable door operations

## 🏗️ Technical Stack

### Frontend
- **Next.js 16** (App Router) with React 19
- **TypeScript** for type safety
- **Tailwind CSS** + **shadcn/ui** for UI components
- **PWA support** for installable apps
- **React Hook Form** + **Zod** for form validation

### Backend
- **Next.js Server Actions** + API Routes
- **Prisma ORM** for type-safe database access
- **Business logic** in dedicated packages for testability

### Database
- **PostgreSQL** (via Supabase)
- **Row Level Security (RLS)** for multi-tenant access control
- **Prisma migrations** for schema versioning

### Authentication
- **Supabase Auth** (email/password, magic links)
- Role-based access control (Admin, Organizer, Instructor, Check-in Staff, Participant)

### Payments
- **Stripe** integration (cards, Apple Pay, Google Pay)
- **Webhook-based fulfillment** for secure payment processing
- Extensible payment provider architecture (Vipps planned)

### Hosting
- **Vercel** for Next.js deployment
- **Supabase** for database, auth, and storage

## 📁 Project Structure

```
salsanor-tickets/
├── apps/
│   └── web/                    # Next.js application
│       ├── src/
│       │   ├── app/           # App router pages
│       │   │   ├── (site)/    # Public-facing pages
│       │   │   ├── (checkin)/ # Check-in app
│       │   │   ├── actions/   # Server actions
│       │   │   └── api/       # API routes (webhooks)
│       │   ├── components/    # React components
│       │   ├── lib/           # Utilities and business logic
│       │   │   ├── pricing/   # Pricing engine
│       │   │   ├── payments/  # Payment integrations
│       │   │   └── schemas/   # Zod validation schemas
│       │   └── utils/         # Helper functions
│       └── public/            # Static assets
├── packages/
│   ├── database/              # Prisma schema and migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── scripts/           # Database utility scripts
│   └── domain/                # Shared business logic
└── docs/
    └── spec.md                # Detailed technical specification
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ 
- PostgreSQL (or Supabase account)
- Stripe account (for payments)
- npm/pnpm/yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/limekex/salsanor-tickets.git
   cd salsanor-tickets
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create `.env` file in `apps/web/`:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/salsanor"
   DIRECT_URL="postgresql://user:password@localhost:5432/salsanor"
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   
   # Stripe
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   
   # App
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   cd packages/database
   npx prisma migrate dev
   npx prisma db seed  # Optional: seed with test data
   ```

5. **Run the development server**
   ```bash
   cd apps/web
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

The platform uses a comprehensive relational schema including:

- **UserAccount & Roles**: Authentication and role-based access
- **Organizer**: Multi-organization support
- **CoursePeriod & CourseTrack**: Course structure
- **Registration & PairGroup**: Enrollment management
- **Order & Payment**: Financial transactions
- **Ticket & CheckIn**: Digital ticketing and attendance
- **Membership**: Member status for discounts
- **DiscountRule**: Configurable pricing rules
- **WaitlistEntry**: Queue management

See [packages/database/prisma/schema.prisma](packages/database/prisma/schema.prisma) for the complete schema.

## 💰 Pricing Engine

The deterministic pricing engine supports:

- **Membership discounts** (percentage-based)
- **Multi-course discounts** (tiered: 2 courses, 3+ courses)
- **Pair pricing** (discounted rate for couples)
- **Promo codes** (flexible promotional discounts)
- **Stacking rules** with priority ordering
- **Explainable breakdowns** showing how final price was calculated

The pricing engine is located in [apps/web/src/lib/pricing/engine.ts](apps/web/src/lib/pricing/engine.ts).

## 🔐 Security

- **Row Level Security (RLS)** enforced at database level
- **Role-based access control** for all admin functions
- **Webhook signature verification** for payment webhooks
- **QR token hashing** for secure ticket validation
- **Server-side validation** for all user inputs

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests (when implemented)
npm run test:e2e
```

## 📦 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Manual Deployment

```bash
npm run build
npm start
```

## 🛠️ Development Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database migrations
cd packages/database
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Prisma Studio (DB GUI)
npx prisma studio
```

## 📚 Documentation

- **[Technical Specification](docs/spec.md)**: Comprehensive system design and requirements
- **[Prisma Schema](packages/database/prisma/schema.prisma)**: Database schema documentation
- **[API Documentation]**: Coming soon

## 🤝 Contributing

This is a private project for SalsaNor. For internal team members:

1. Create a feature branch
2. Make your changes
3. Submit a pull request
4. Wait for review and approval

## 🎯 Roadmap

### Current Status: MVP Development

- [x] Database schema and migrations
- [x] Core pricing engine
- [x] Stripe payment integration
- [x] Basic admin dashboard
- [x] Course browsing and cart
- [x] QR ticket generation
- [x] Check-in scanning UI
- [ ] Automated waitlist promotion
- [ ] Membership CSV import
- [ ] Email notifications
- [ ] Comprehensive testing
- [ ] Production pilot with Antigravity

See [docs/spec.md](docs/spec.md) for the complete implementation plan.

## 📄 License

Private - All rights reserved by SalsaNor

## 🙏 Acknowledgments

- Built for **SalsaNor** and dance organizations
- Initial pilot partner: **Antigravity Trondheim**

---

**Need help?** Contact the development team or check the [technical specification](docs/spec.md).
