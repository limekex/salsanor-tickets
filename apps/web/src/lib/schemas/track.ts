
import { z } from 'zod'

export const courseTrackSchema = z.object({
    periodId: z.string().uuid(),
    title: z.string().min(1),
    levelLabel: z.string().optional(),
    weekday: z.coerce.number().min(1).max(7), // 1=Mon, 7=Sun
    timeStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be HH:MM"),
    timeEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be HH:MM"),
    capacityTotal: z.coerce.number().min(1),
    capacityLeaders: z.coerce.number().optional(),
    capacityFollowers: z.coerce.number().optional(),
    rolePolicy: z.enum(['LEADER', 'FOLLOWER', 'ANY']),
    waitlistEnabled: z.boolean(),
    priceSingleCents: z.coerce.number().min(0),
    pricePairCents: z.coerce.number().optional(),
    memberPriceSingleCents: z.coerce.number().optional(),
    memberPricePairCents: z.coerce.number().optional(),
})

export type CourseTrackFormValues = z.infer<typeof courseTrackSchema>
