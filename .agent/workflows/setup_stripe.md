---
description: How to install and authenticate Stripe CLI for webhook testing
---

1. Install Stripe CLI using Homebrew
```bash
brew install stripe/stripe-cli/stripe
```

2. Login to your Stripe account
```bash
stripe login
```
*This will open a browser window. Follow the prompts to authorize.*

3. Start listening for webhooks
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Copy the Webhook Secret
*The command above will output a secret starting with `whsec_...`*
*Copy this secret.*

5. Configure the Application
*Go to `http://localhost:3000/admin/settings/payments`*
*Paste the secret into the "Webhook Secret" field and save.*
