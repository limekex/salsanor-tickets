
import { z } from 'zod'

export const coursePeriodSchema = z.object({
    organizerId: z.string().uuid(),
    code: z.string().min(3),
    name: z.string().min(1),
    city: z.string().min(1),
    locationName: z.string().optional(),
    startDate: z.string().datetime().or(z.date()), // accepts ISO string or Date
    endDate: z.string().datetime().or(z.date()),
    salesOpenAt: z.string().datetime().or(z.date()),
    salesCloseAt: z.string().datetime().or(z.date()),
})

export type CoursePeriodFormValues = z.infer<typeof coursePeriodSchema>
