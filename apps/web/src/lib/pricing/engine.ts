
import { DiscountRule } from '@salsanor/database'
import { DiscountRuleFormData, membershipConfigSchema, multiCourseConfigSchema } from '@/lib/schemas/discount'

// In-memory types for calculation
export interface PricingTrack {
    id: string
    priceSingleCents: number
    pricePairCents: number | null
}

export interface CartItem {
    trackId: string // The track being purchased
    role: 'LEADER' | 'FOLLOWER' // Role in that track
    hasPartner: boolean // If true, applies pair price
    partnerEmail?: string // Meta
    track: PricingTrack // Snapshot of track data for calculation
}

export interface PricingLineItem {
    trackId: string
    basePriceCents: number
    discountCents: number
    finalPriceCents: number
    appliedRuleCodes: string[]
}

export interface AppliedRule {
    ruleId: string
    code: string
    name: string
    amountCents: number
    explanation: string
}

export interface PricingResult {
    subtotalCents: number
    discountTotalCents: number
    finalTotalCents: number
    lineItems: PricingLineItem[]
    appliedRules: AppliedRule[]
    isMember: boolean
}

interface UserContext {
    isMember: boolean
}

export function calculatePricing(
    cartItems: CartItem[],
    rules: DiscountRule[],
    context: UserContext
): PricingResult {
    const appliedRules: AppliedRule[] = []

    // 1. Initialize Line Items with Base Price
    let lineItems: PricingLineItem[] = cartItems.map(item => {
        const basePrice = item.hasPartner && item.track.pricePairCents
            ? item.track.pricePairCents
            : item.track.priceSingleCents

        return {
            trackId: item.trackId,
            basePriceCents: basePrice,
            discountCents: 0,
            finalPriceCents: basePrice,
            appliedRuleCodes: []
        }
    })

    // Sort rules by priority (0 first)
    // Note: Mutating operations should be careful. 
    // We apply rules sequentially. Some rules apply to total, some to items.
    // For MVP, we calculate discounts and sum them up.

    const activeRules = rules.filter(r => r.enabled).sort((a, b) => a.priority - b.priority)

    for (const rule of activeRules) {
        if (rule.ruleType === 'MEMBERSHIP_PERCENT') {
            if (context.isMember) {
                const config = rule.config as any // Validated by schema elsewhere
                const percent = config.discountPercent || 0

                // Apply to all line items that have not been fully discounted? 
                // Or just calculate global discount? 
                // Usually Membership applies to the ticket price.

                let ruleTotalDiscount = 0

                lineItems = lineItems.map(line => {
                    // Check if already 100% free?
                    if (line.finalPriceCents <= 0) return line

                    const discountAmount = Math.round(line.basePriceCents * (percent / 100))
                    // Ensure we don't discount below 0
                    const safeDiscount = Math.min(discountAmount, line.finalPriceCents)

                    if (safeDiscount > 0) {
                        ruleTotalDiscount += safeDiscount
                        return {
                            ...line,
                            discountCents: line.discountCents + safeDiscount,
                            finalPriceCents: line.finalPriceCents - safeDiscount,
                            appliedRuleCodes: [...line.appliedRuleCodes, rule.code]
                        }
                    }
                    return line
                })

                if (ruleTotalDiscount > 0) {
                    appliedRules.push({
                        ruleId: rule.id,
                        code: rule.code,
                        name: rule.name,
                        amountCents: ruleTotalDiscount,
                        explanation: `${percent}% Member Discount`
                    })
                }
            }
        }
        else if (rule.ruleType === 'MULTI_COURSE_TIERED') {
            const config = rule.config as any
            const tiers = config.tiers || []
            // Tiers: [{ count: 2, discountCents: 20000 }]
            // Check count of items
            const count = cartItems.length

            // Find highest applicable tier
            // Sort tiers desc by count
            const applicableTier = tiers
                .sort((a: any, b: any) => b.count - a.count)
                .find((t: any) => count >= t.count)

            if (applicableTier) {
                // Apply discount
                // Is this discount per Item or Total? 
                // "discountCents" usually implies a fixed amount off the total or per item?
                // Spec example says: "Multi-course: 15000" (amount).
                // Let's assume it's a GLOBAL discount amount for the bundle.

                // Distribute this discount across items for line-item accuracy, or just add to rule list?
                // We need lineItems to sum up to total.
                // Let's modify line items proportionally or just first item?
                // Proportional is fairest for refunds.

                let totalDiscountToApply = applicableTier.discountCents || 0

                // Safety: can't exceed remaining total
                const currentTotal = lineItems.reduce((sum, li) => sum + li.finalPriceCents, 0)
                totalDiscountToApply = Math.min(totalDiscountToApply, currentTotal)

                if (totalDiscountToApply > 0) {
                    let remainingToDistribute = totalDiscountToApply

                    lineItems = lineItems.map((line, index) => {
                        if (remainingToDistribute <= 0) return line

                        // Last item gets the remainder to avoid rounding issues
                        let share = 0
                        if (index === lineItems.length - 1) {
                            share = remainingToDistribute
                        } else {
                            // Simple split? Or weighted? Simple split for now.
                            // share = Math.round(totalDiscountToApply / lineItems.length)
                            // Actually weighted by price is better but complex.
                            // Let's do even split.
                            share = Math.floor(totalDiscountToApply / lineItems.length)
                        }

                        // Cap at line price
                        share = Math.min(share, line.finalPriceCents)
                        remainingToDistribute -= share

                        return {
                            ...line,
                            discountCents: line.discountCents + share,
                            finalPriceCents: line.finalPriceCents - share,
                            appliedRuleCodes: [...line.appliedRuleCodes, rule.code]
                        }
                    })

                    appliedRules.push({
                        ruleId: rule.id,
                        code: rule.code,
                        name: rule.name,
                        amountCents: totalDiscountToApply,
                        explanation: `Multi-course discount (${applicableTier.count}+ courses)`
                    })
                }
            }
        }
    }

    const subtotalCents = cartItems.reduce((sum, item) => {
        return sum + (item.hasPartner && item.track.pricePairCents ? item.track.pricePairCents : item.track.priceSingleCents)
    }, 0)

    const finalTotalCents = lineItems.reduce((sum, li) => sum + li.finalPriceCents, 0)
    const discountTotalCents = subtotalCents - finalTotalCents

    return {
        subtotalCents,
        discountTotalCents,
        finalTotalCents,
        lineItems,
        appliedRules,
        isMember: context.isMember
    }
}
