# Implement PWA Configuration for Check-in and Participant Apps

## Priority
**HIGH** - Critical for offline functionality and mobile experience

## Description
Configure the application as a Progressive Web App (PWA) to enable:
- Installable app experience on mobile devices
- Offline capability for check-in scanning
- Home screen installation
- App-like feel without native app development

## Current Status
- ⚠️ No PWA configuration exists
- ⚠️ No manifest.json
- ⚠️ No service worker
- ✅ QR scanner component exists but needs offline support

## Requirements

### Manifest Configuration
- [ ] Create `/public/manifest.json` with:
  - App name: "SalsaNor Tickets"
  - Short name: "SalsaNor"
  - Start URL: "/"
  - Display: "standalone"
  - Theme color: `#0B2A3C` (deep navy)
  - Background color: `#F7FAFC`
  - Icons (multiple sizes: 192x192, 512x512)
  - Description
  - Categories: ["lifestyle", "entertainment"]

### Service Worker
- [ ] Configure Next.js for service worker support
- [ ] Implement caching strategies:
  - Cache-first for static assets
  - Network-first for API calls with fallback
  - Cache QR validation responses for offline check-in
- [ ] Handle offline scenarios gracefully
- [ ] Background sync for check-ins when connection restored

### Next.js Configuration
- [ ] Install `next-pwa` package or similar
- [ ] Update `next.config.ts` with PWA settings
- [ ] Configure workbox options
- [ ] Set cache strategies per route type

### Icons & Assets
- [ ] Create app icons in multiple sizes
- [ ] Create splash screens for iOS
- [ ] Create maskable icon for Android
- [ ] Add favicon variations

### Meta Tags
- [ ] Add PWA meta tags to layout
- [ ] Configure iOS-specific meta tags
- [ ] Add theme-color meta tag
- [ ] Add apple-touch-icon links

### Installation Prompts
- [ ] Implement custom install prompt UI
- [ ] Show "Add to Home Screen" banner for eligible users
- [ ] Handle beforeinstallprompt event
- [ ] Track installation analytics

## Technical Implementation

### Package Installation
```bash
npm install next-pwa
npm install --save-dev @types/serviceworker
```

### next.config.ts Example
```typescript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Custom caching strategies
  ]
})

module.exports = withPWA({
  // existing config
})
```

### Offline Check-in Strategy
- Queue check-in events when offline
- Display offline indicator
- Sync queued events when back online
- Show success confirmation after sync

## Testing Checklist
- [ ] Test installation on iOS Safari
- [ ] Test installation on Android Chrome
- [ ] Test offline check-in scanning
- [ ] Test service worker updates
- [ ] Test cache invalidation
- [ ] Verify icons display correctly
- [ ] Test background sync
- [ ] Lighthouse PWA audit score > 90

## Success Criteria
- App can be installed on mobile home screen
- Check-in scanning works offline (with sync queue)
- Lighthouse PWA score: 90+
- Icons and splash screens display correctly
- Service worker caches appropriate resources

## Dependencies
- Check-in scanner functionality (exists ✅)
- QR validation API endpoint
- Network status detection
- IndexedDB for offline queue

## Related Issues
- #[check-in-fulfillment] - Ticket generation and validation
- #[check-in-backend] - Check-in API endpoints

## References
- [Next.js PWA Documentation](https://ducanh-next-pwa.vercel.app/)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- Specs: Phase 6 — Ticketing & Check-in control app (PWA)
