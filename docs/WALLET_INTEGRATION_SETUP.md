# Wallet Integration Setup Guide

This document outlines the setup requirements for Apple Wallet and Google Wallet integration for SalsaNor Tickets.

## Apple Wallet Integration

### Prerequisites
- Apple Developer Account (✅ Already have)
- macOS computer (for certificate generation)
- Pass Type ID registration
- Certificates and signing keys

### Setup Steps

#### 1. Register Pass Type ID
1. Log in to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** → **+** (new identifier)
4. Choose **Pass Type IDs**
5. Register a new Pass Type ID:
   - Description: `SalsaNor Event Tickets`
   - Identifier: `pass.no.salsanor.tickets`
   - (Optionally create another for memberships: `pass.no.salsanor.memberships`)

#### 2. Create Pass Type ID Certificate
1. In the Pass Type ID you just created, click **Create Certificate**
2. On your Mac, open **Keychain Access**
3. Go to **Keychain Access** → **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
4. Fill in:
   - User Email Address: (your email)
   - Common Name: `SalsaNor Pass Signing`
   - Request is: **Saved to disk**
5. Save the `.certSigningRequest` file
6. Upload the CSR to Apple Developer Portal
7. Download the `.cer` file (Pass Type ID Certificate)
8. Double-click to install in Keychain Access

#### 3. Export Certificate and Private Key
1. Open **Keychain Access**
2. Find the Pass Type ID certificate you just installed
3. Expand it to show the private key
4. **Export the certificate**:
   - Right-click → **Export "SalsaNor Pass Signing"**
   - Save as: `pass_certificate.p12`
   - Set a password (remember this!)
5. **Export the private key**:
   - Right-click the private key → **Export "private key"**
   - Save as: `pass_key.p12`
   - Set a password (can be the same)

#### 4. Download WWDR Certificate
1. Download the Apple Worldwide Developer Relations (WWDR) Certificate:
   - [G4 Certificate](https://www.apple.com/certificateauthority/) - Use the current one
2. Double-click to install in Keychain Access
3. Export it:
   - Find "Apple Worldwide Developer Relations Certification Authority"
   - Right-click → **Export**
   - Save as: `wwdr.pem` (choose `.pem` format)

#### 5. Convert to PEM format (on Mac terminal)
```bash
# Convert pass certificate
openssl pkcs12 -in pass_certificate.p12 -clcerts -nokeys -out pass_cert.pem

# Convert pass private key
openssl pkcs12 -in pass_key.p12 -nocerts -nodes -out pass_key.pem

# Encode to Base64 for environment variables
cat pass_cert.pem | base64 > pass_cert_base64.txt
cat pass_key.pem | base64 > pass_key_base64.txt
cat wwdr.pem | base64 > wwdr_base64.txt
```

#### 6. Environment Variables
Add to `.env.local`:
```env
# Apple Wallet Configuration
APPLE_PASS_TYPE_ID=pass.no.salsanor.tickets
APPLE_TEAM_ID=YOUR_TEAM_ID  # Find in Apple Developer Portal (10-character string)
APPLE_WWDR_CERTIFICATE=<contents of wwdr_base64.txt>
APPLE_SIGNER_CERTIFICATE=<contents of pass_cert_base64.txt>
APPLE_SIGNER_KEY=<contents of pass_key_base64.txt>
APPLE_SIGNER_KEY_PASSPHRASE=<password you set during export>
```

---

## Google Wallet Integration

### Prerequisites
- Google Cloud Project
- Google Pay & Wallet Console access (✅ Already signed up)
- Service Account with Google Wallet API permissions

### Setup Steps

#### 1. Enable Google Wallet API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project for SalsaNor
3. Navigate to **APIs & Services** → **Library**
4. Search for "Google Wallet API"
5. Click **Enable**

#### 2. Create Service Account
1. In Google Cloud Console, go to **IAM & Admin** → **Service Accounts**
2. Click **+ CREATE SERVICE ACCOUNT**
3. Fill in:
   - Name: `salsanor-wallet-service`
   - Description: `Service account for Google Wallet pass generation`
4. Click **CREATE AND CONTINUE**
5. Grant role: **Google Wallet API Issuer**
6. Click **DONE**

#### 3. Create Service Account Key
1. Click on the service account you just created
2. Go to **KEYS** tab
3. Click **ADD KEY** → **Create new key**
4. Choose **JSON** format
5. Download the JSON file (keep it secure!)

#### 4. Get Issuer ID
1. Go to [Google Pay & Wallet Console](https://pay.google.com/business/console)
2. Navigate to **Google Wallet API**
3. Find your **Issuer ID** (format: `3388000000XXXXXXXXX`)
4. Note this down

#### 5. Create Pass Class (first time only)
This will be done programmatically, but you need the Issuer ID first.

#### 6. Environment Variables
Add to `.env.local`:
```env
# Google Wallet Configuration
GOOGLE_WALLET_ISSUER_ID=3388000000XXXXXXXXX  # Your actual Issuer ID
GOOGLE_WALLET_SERVICE_ACCOUNT=<base64 encoded contents of the JSON key file>
```

To encode the service account JSON:
```bash
cat service-account-key.json | base64 > service_account_base64.txt
```

---

## Testing

### Apple Wallet Testing
- Use iPhone (iOS 6+) or Apple Watch
- Development passes work in Simulator too
- Test pass updates and push notifications

### Google Wallet Testing  
- Use Android device (5.0+) with Google Play Services
- Can also test on web (save link opens in Google Wallet web view)
- Test on demo.wallet.google.com first

---

## Security Considerations

1. **Never commit certificates or keys to git**
   - Add to `.gitignore`:
     ```
     *.p12
     *.pem
     *_base64.txt
     service-account-key.json
     ```

2. **Use environment variables** for all sensitive data

3. **Rotate keys periodically** (recommended: yearly)

4. **Monitor API usage** in both Apple Developer and Google Cloud Console

5. **Set up alerts** for failed pass generation attempts

---

## File Structure

Recommended organization:
```
apps/web/src/
├── lib/
│   └── wallet/
│       ├── apple/
│       │   ├── pass-generator.ts      # Apple Wallet pass generation
│       │   ├── pass-template.ts       # Pass structure/design
│       │   └── pass-signer.ts         # Signing logic
│       ├── google/
│       │   ├── pass-generator.ts      # Google Wallet pass generation
│       │   ├── pass-class.ts          # Pass class definitions
│       │   └── jwt-generator.ts       # JWT creation for save links
│       └── types.ts                    # Shared types
└── app/
    └── api/
        └── tickets/
            └── [id]/
                └── wallet/
                    ├── apple/
                    │   └── route.ts   # GET /api/tickets/:id/wallet/apple
                    └── google/
                        └── route.ts   # GET /api/tickets/:id/wallet/google
```

---

## npm Packages Required

```json
{
  "dependencies": {
    "@walletpass/pass-js": "^9.0.0",
    "@google-cloud/wallet": "^1.0.0",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.0"
  }
}
```

---

## Next Steps

Once setup is complete:
1. Install required npm packages
2. Configure environment variables
3. Implement pass generation logic
4. Create API endpoints
5. Update UI with "Add to Wallet" buttons
6. Test on real devices
7. Deploy to production

---

## Support Resources

- [Apple Wallet Developer Guide](https://developer.apple.com/wallet/)
- [Apple PassKit Documentation](https://developer.apple.com/documentation/passkit)
- [Google Wallet API Documentation](https://developers.google.com/wallet)
- [Google Wallet Pass Designer](https://developers.google.com/wallet/generic/resources/pass-designer)
