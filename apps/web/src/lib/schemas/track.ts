
import { z } from 'zod'

export const courseTrackSchema = z.object({
    periodId: z.string().uuid(),
    title: z.string().min(1),
    slug: z.string().optional(), // Auto-generated from title if not provided
    description: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    levelLabel: z.string().optional(),
    weekday: z.coerce.number().min(1).max(7), // 1=Mon, 7=Sun
    timeStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be HH:MM"),
    timeEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be HH:MM"),
    // Location fields
    locationName: z.string().optional(),
    locationAddress: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    capacityTotal: z.coerce.number().min(1),
    capacityLeaders: z.coerce.number().optional(),
    capacityFollowers: z.coerce.number().optional(),
    rolePolicy: z.enum(['LEADER', 'FOLLOWER', 'ANY']),
    waitlistEnabled: z.boolean(),
    allowSelfCheckIn: z.boolean(),
    allowDashboardCheckIn: z.boolean(),
    geofenceEnabled: z.boolean(),
    geofenceRadius: z.coerce.number().min(10).max(5000).optional(),
    checkInWindowBefore: z.coerce.number().min(0).max(240).optional(),
    checkInWindowAfter: z.coerce.number().min(0).max(240).optional(),
    priceSingleCents: z.coerce.number().min(0),
    pricePairCents: z.coerce.number().optional(),
    memberPriceSingleCents: z.coerce.number().optional(),
    memberPricePairCents: z.coerce.number().optional(),
})

export type CourseTrackFormValues = z.infer<typeof courseTrackSchema>

// Image upload constraints
export const TRACK_IMAGE_CONSTRAINTS = {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    maxSizeMB: 2,
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    acceptedExtensions: '.jpg, .jpeg, .png, .webp',
    minWidth: 800,
    minHeight: 400,
    maxWidth: 2400,
    maxHeight: 1200,
    aspectRatioMin: 1.5, // width/height
    aspectRatioMax: 3.0,
} as const
