# Stripe Connect Implementation

## Overview

Stripe Connect enables multi-tenant payment processing where each organizer can connect their own Stripe account and receive payments directly, with the platform taking a commission.

**Implementation Type:** Embedded Components (seamless in-app experience)

## Architecture

### Database Schema

**PaymentConfig**
- `useStripeConnect`: Boolean flag to enable Connect mode
- `platformAccountId`: Platform's Stripe account ID
- `platformFeePercent`: Percentage commission (e.g., 2.5 for 2.5%)
- `platformFeeFixed`: Fixed fee in øre per transaction

**Organizer**
- `stripeConnectAccountId`: Connected Stripe account ID
- `stripeOnboardingComplete`: Whether onboarding is complete
- `stripeChargesEnabled`: Can accept payments
- `stripePayoutsEnabled`: Can receive payouts

### Payment Flow

1. **Standard Mode** (`useStripeConnect = false`)
   - All payments go to one platform Stripe account
   - Configured at `/admin/settings/payments`

2. **Connect Mode** (`useStripeConnect = true`)
   - Each organizer has their own Stripe account
   - Payments go directly to organizer's account
   - Platform automatically receives commission via `application_fee_amount`

## Setup Guide

### 1. Enable Stripe Connect (Global Admin)

Navigate to `/admin/settings/payments`:

1. Enable Stripe
2. Toggle "Use Stripe Connect"
3. Enter your Platform Account ID (from Stripe Dashboard)
4. Configure platform fees:
   - **Platform Fee %**: Percentage commission (e.g., 2.5)
   - **Fixed Fee**: Per-transaction fee in øre (e.g., 100 = 1 NOK)
5. Save configuration

### 2. Organizer Onboarding

Each organizer connects their account at `/org/{slug}/settings/stripe`:

**Embedded Experience:**
1. Navigate to Settings from organization page
2. Onboarding form appears directly in the page (no redirect)
3. Complete Stripe verification inline
4. Status updates automatically
5. Switch to management view when complete

**Features:**
- Seamless in-app experience
- No external redirects
- Auto-saves progress
- Real-time status updates

### 3. Webhook Configuration

Set up webhooks in Stripe Dashboard to automatically sync account status:

**Step 1: Create Webhook Endpoint**

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://yourdomain.com/api/webhooks/stripe`
   - For testing: `http://localhost:3000/api/webhooks/stripe` (use Stripe CLI)
4. Select events to listen for:
   - `account.updated` - Updates organizer onboarding status
   - `checkout.session.completed` - Confirms payments

**Step 2: Configure Webhook Secret**

1. Copy the webhook signing secret (starts with `whsec_`)
2. Add to database via `/admin/settings/payments`:
   - Field: "Webhook Secret"
   - Save configuration

**Step 3: Test Webhook (Local Development)**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger account.updated
```

**Webhook Implementation**

The webhook handler at `/api/webhooks/stripe/route.ts` automatically:

1. Verifies webhook signature using secret from database
2. Handles `checkout.session.completed` → fulfills orders
3. Handles `account.updated` → syncs organizer Stripe status:
   - `stripeOnboardingComplete` from `details_submitted`
   - `stripeChargesEnabled` from `charges_enabled`
   - `stripePayoutsEnabled` from `payouts_enabled`

**Event Processing**:
```typescript
// account.updated event updates:
{
  stripeOnboardingComplete: account.details_submitted,
  stripeChargesEnabled: account.charges_enabled,
  stripePayoutsEnabled: account.payouts_enabled
}
```

## Fee Calculation Example

Example: 100 NOK payment with 2.5% + 1 NOK fee

```
Order Total:        100.00 NOK (10000 øre)
Platform Fee (%):     2.50 NOK (250 øre)
Fixed Fee:            1.00 NOK (100 øre)
Total Platform Fee:   3.50 NOK (350 øre)
---
Organizer Receives: 96.50 NOK (9650 øre)
```

## Payment Processing

When a customer makes a purchase:

1. System fetches order and organizer data
2. If Stripe Connect enabled and organizer has account:
   - Creates Checkout Session with `stripeAccount` header
   - Sets `application_fee_amount` for platform commission
3. Customer pays → funds go to organizer account
4. Platform commission automatically transferred

## Account Status

Organizers can have different account states:

- **Not Connected**: No Stripe account linked
- **Incomplete**: Account created but onboarding not finished
- **Connected**: Fully verified and operational
  - ✅ Charges Enabled: Can accept payments
  - ✅ Payouts Enabled: Can receive funds

## Testing Webhooks Locally

### Using Stripe CLI (Recommended)

1. **Install Stripe CLI**:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to localhost**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   This will give you a webhook secret like `whsec_...` - add it to your database.

4. **Trigger test events**:
   ```bash
   # Test account update
   stripe trigger account.updated
   
   # Test payment completion
   stripe trigger checkout.session.completed
   ```

5. **Monitor logs**:
   - Check terminal for webhook events
   - Check Next.js console for processing logs
   - Verify database updates in Prisma Studio

### Manual Testing

1. Complete onboarding in test mode
2. Check that `stripeOnboardingComplete` updates to `true`
3. Verify `stripeChargesEnabled` and `stripePayoutsEnabled` reflect actual status
4. Make test payment to verify commission splitting

## Troubleshooting

**Webhook not receiving events:**
- Verify webhook secret is saved in database
- Check Stripe Dashboard → Webhooks for failed deliveries
- Ensure endpoint URL is accessible (use ngrok for local testing)

**Status not updating:**
- Manually refresh payment settings page (fetches live status)
- Check webhook logs in Stripe Dashboard
- Verify `account.updated` event is configured

**Commission not calculated:**
- Ensure `useStripeConnect` is enabled
- Verify organizer has `stripeConnectAccountId`
- Check platform fee configuration

## Testing

### Test Mode Setup

1. Use Stripe test keys in settings
2. Use test Connected Accounts
3. Test cards: `4242 4242 4242 4242`

### Monitoring

- **Global Admin**: View all organizer payment configs
- **Organizer**: Access Stripe Dashboard via "Open Stripe Dashboard" button
- **Platform**: Monitor via Stripe Dashboard > Connect

## Security

- Secret keys stored in database (consider encryption at rest)
- Webhook signatures validated
- User authorization checked before account operations
- Platform never accesses organizer bank details

## API Keys Location

**Priority order**:
1. Database `PaymentConfig` (allows runtime changes)
2. Environment variables (fallback)

## Troubleshooting

### "Stripe Connect is not enabled"
- Check PaymentConfig: `useStripeConnect` must be `true`
- Global admin must enable at `/admin/settings/payments`

### "Charges Disabled"
- Organizer needs to complete onboarding
- Check for missing verification details in Stripe Dashboard

### "No Platform Fee"
- Ensure `platformFeePercent` or `platformFeeFixed` is set
- Fees apply per transaction in Connect mode

### Webhook Not Updating Status
- Verify webhook endpoint is reachable
- Check webhook signature validation
- Review webhook event types subscribed

## Migration from Standard to Connect

1. Enable Connect mode in settings
2. Existing orders continue with standard flow
3. Access Control

**Global Admin Settings:**
- Available at `/admin/settings/payments`
- Requires `ADMIN` role

**Organizer Settings:**
- Available at `/org/{slug}/settings/stripe`
- Requires `ORG_ADMIN`, `ORGANIZER`, or `ADMIN` role
- Settings button appears on org page for authorized users

## Organizers onboard at their own pace
4. New orders use Connect if organizer linked

## Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Account Types](https://stripe.com/docs/connect/accounts)
- [Platform Fees](https://stripe.com/docs/connect/direct-charges#collecting-fees)
- [Webhooks](https://stripe.com/docs/webhooks)
