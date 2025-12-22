
import { z } from 'zod'

export const ruleTypeEnum = z.enum([
    'MEMBERSHIP_TIER_PERCENT',  // Updated to support tiers
    'MULTI_COURSE_TIERED',
    'PROMO_CODE_FIXED'
    // Add more as needed
])

export const membershipTierConfigSchema = z.object({
    tierIds: z.array(z.string()).optional(), // If empty, applies to all tiers
    discountPercent: z.number().min(0).max(100),
})

export const multiCourseConfigSchema = z.object({
    tiers: z.array(z.object({
        count: z.number().min(2),
        discountCents: z.number().optional(),
        discountPercent: z.number().optional(),
    })).min(1)
})

export const discountRuleSchema = z.object({
    periodId: z.string().uuid(),
    code: z.string().min(2).max(20).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
    name: z.string().min(2),
    priority: z.coerce.number().int(),
    enabled: z.boolean(),
    ruleType: ruleTypeEnum,
    config: z.any()
})
    // Refinement
    .superRefine((data, ctx) => {
        if (data.ruleType === 'MEMBERSHIP_TIER_PERCENT') {
            const result = membershipTierConfigSchema.safeParse(data.config)
            if (!result.success) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Invalid membership tier config',
                    path: ['config']
                })
            }
        }
        if (data.ruleType === 'MULTI_COURSE_TIERED') {
            const result = multiCourseConfigSchema.safeParse(data.config)
            if (!result.success) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Invalid multi-course config',
                    path: ['config']
                })
            }
        }
    })

export type DiscountRuleFormData = z.infer<typeof discountRuleSchema>
