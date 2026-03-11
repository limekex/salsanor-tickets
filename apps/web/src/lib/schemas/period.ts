
import { z } from 'zod'

export const courseTemplateTypeSchema = z.enum([
  'CUSTOM',
  'INDIVIDUAL',
  'PARTNER',
  'VIRTUAL',
  'WORKSHOP',
  'DROP_IN',
  'KIDS_YOUTH',
  'TEAM',
  'SUBSCRIPTION',
  'PRIVATE',
])

export const deliveryMethodSchema = z.enum([
  'IN_PERSON',
  'VIRTUAL',
  'HYBRID',
])

export const coursePeriodSchema = z.object({
    organizerId: z.string().uuid(),
    code: z.string().min(3),
    name: z.string().min(1),
    city: z.string().min(1),
    locationName: z.string().optional(),
    startDate: z.string().datetime().or(z.date()),
    endDate: z.string().datetime().or(z.date()),
    salesOpenAt: z.string().datetime().or(z.date()),
    salesCloseAt: z.string().datetime().or(z.date()),
    templateType: courseTemplateTypeSchema.optional(),
    deliveryMethod: deliveryMethodSchema.optional(),
})

export type CoursePeriodFormValues = z.infer<typeof coursePeriodSchema>
