# Bug: Membership Card Fullscreen Modal Margins on Mobile

## Status
Open

## Priority
Low

## Description
When viewing the membership card in fullscreen mode on mobile (iPhone), there are unwanted margins appearing around the modal when the screen width is below a certain threshold. The modal should take up the entire screen without any margins on mobile devices.

## Current Behavior
- On narrow mobile screens, the fullscreen membership card modal displays with visible margins on the sides
- The margins appear despite using `!w-screen`, `!h-[100dvh]`, `!left-0`, `!top-0`, and related positioning classes
- The issue persists even with `!important` overrides on Tailwind classes

## Expected Behavior
- The fullscreen modal should occupy 100% of the viewport width and height on mobile
- No visible margins should appear around the modal on any mobile screen size
- The membership card content should extend edge-to-edge on mobile screens

## Technical Context
- Component: `/apps/web/src/components/membership-card.tsx`
- Dialog component: `/apps/web/src/components/ui/dialog.tsx`
- Current implementation uses Radix UI Dialog primitives
- The `DialogContent` has default classes including `max-w-[calc(100%-2rem)]` which may be interfering
- The `DialogOverlay` or other dialog wrapper elements might be adding constraints

## Current Workarounds Attempted
1. Added `!important` modifiers to override default dialog classes
2. Set explicit positioning: `!left-0 !top-0 !translate-x-0 !translate-y-0`
3. Removed max-width constraints with `!max-w-none`
4. Set full viewport dimensions: `!w-screen !h-[100dvh]`

## Possible Solutions to Investigate
1. Check if `DialogOverlay` or `DialogPortal` are adding width constraints
2. Inspect if there are CSS media queries interfering at specific breakpoints
3. Consider using a custom fullscreen container outside of the Dialog component for mobile
4. Investigate if browser safe areas or viewport units are causing issues
5. Check for conflicting z-index or positioning contexts

## Related Files
- `/apps/web/src/components/membership-card.tsx` (lines 236-238)
- `/apps/web/src/components/ui/dialog.tsx` (lines 48-82)

## Date Reported
19. desember 2025

## Device/Browser Info
- Device: iPhone
- Browser: Mobile Safari/WebKit
- Viewport: Narrow mobile screens (specific breakpoint TBD)
