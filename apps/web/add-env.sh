#!/bin/bash
# Add environment variables to Vercel from GitHub secrets

vercel env add DATABASE_URL production < <(gh secret get STAGE_DATABASE_URL)
vercel env add DIRECT_URL production < <(gh secret get STAGE_DIRECT_URL)
vercel env add NEXT_PUBLIC_SUPABASE_URL production < <(gh secret get STAGE_SUPABASE_URL)
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production < <(gh secret get STAGE_SUPABASE_ANON_KEY)
vercel env add SUPABASE_SERVICE_ROLE_KEY production < <(gh secret get STAGE_SUPABASE_SERVICE_ROLE_KEY)
vercel env add STRIPE_SECRET_KEY production < <(gh secret get STAGE_STRIPE_SECRET_KEY)
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production < <(gh secret get STAGE_STRIPE_PUBLISHABLE_KEY)
vercel env add BREVO_API_KEY production < <(gh secret get STAGE_BREVO_API_KEY)
vercel env add BREVO_SENDER_EMAIL production < <(gh secret get BREVO_SENDER_EMAIL)
vercel env add AUTH_SECRET production < <(gh secret get STAGE_AUTH_SECRET)
