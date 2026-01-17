
import { DiscountRule } from '@salsanor/database'
import { DiscountRuleFormData, membershipTierConfigSchema, multiCourseConfigSchema } from '@/lib/schemas/discount'

/**
 * Norwegian Compliance: MVA/VAT Calculation
 * 
 * IMPORTANT: Prices entered in the system are FINAL prices (inclusive of VAT).
 * This function EXTRACTS the VAT component from the inclusive price for documentation.
 * 
 * Common rates in Norway:
 * - 0%: Educational services (some courses may qualify)
 * - 12%: Transportation, food
 * - 15%: Food services
 * - 25%: Standard rate for most goods and services
 * 
 * Dance courses are typically either 0% (educational) or 25% (recreational)
 * 
 * Formula for extracting VAT from inclusive price:
 * VAT = inclusivePrice - (inclusivePrice / (1 + vatRate))
 */
export interface MvaCalculation {
    subtotalCents: number              // Amount including MVA (this is the final price)
    mvaRate: number                    // MVA percentage (0, 12, 15, or 25)
    mvaCents: number                   // Extracted MVA amount (for documentation only)
    totalCents: number                 // Same as subtotalCents (price is already inclusive)
}

export function calculateMva(params: {
    subtotalCents: number  // Price INCLUSIVE of VAT
    mvaRate: number
}): MvaCalculation {
    // Extract VAT from inclusive price: VAT = total - (total / (1 + rate))
    const mvaCents = params.mvaRate > 0 
        ? Math.round(params.subtotalCents - (params.subtotalCents / (1 + params.mvaRate / 100)))
        : 0
    
    return {
        subtotalCents: params.subtotalCents,
        mvaRate: params.mvaRate,
        mvaCents,
        totalCents: params.subtotalCents  // Price is already inclusive, so total = subtotal
    }
}

/**
 * Full order calculation including discounts and MVA
 * 
 * IMPORTANT: All prices are VAT-INCLUSIVE. Discounts are applied to the inclusive price.
 * MVA is extracted for documentation purposes only - it doesn't change the final price.
 */
export interface OrderCalculation extends MvaCalculation {
    subtotalBeforeDiscountCents: number  // Original price (VAT-inclusive)
    discountCents: number                 // Discount amount
    subtotalAfterDiscountCents: number   // Price after discount (VAT-inclusive)
}

export function calculateOrderTotal(params: {
    subtotalCents: number   // Price INCLUSIVE of VAT
    discountCents: number   // Discount amount
    mvaRate: number         // VAT rate for documentation (0 if not VAT-registered)
}): OrderCalculation {
    const subtotalAfterDiscount = params.subtotalCents - params.discountCents
    const mva = calculateMva({
        subtotalCents: subtotalAfterDiscount,
        mvaRate: params.mvaRate
    })
    
    return {
        subtotalBeforeDiscountCents: params.subtotalCents,
        discountCents: params.discountCents,
        subtotalAfterDiscountCents: subtotalAfterDiscount,
        ...mva  // mvaCents is extracted for documentation, totalCents = subtotalAfterDiscount
    }
}

// In-memory types for calculation
export interface PricingTrack {
    id: string
    priceSingleCents: number
    pricePairCents: number | null
    memberPriceSingleCents?: number | null  // Fixed member price (if set, skip discount engine)
    memberPricePairCents?: number | null    // Fixed member price for pairs
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
    usesFixedMemberPrice?: boolean  // Flag to skip discount rules
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
    membershipTierId?: string // The specific tier ID for the active membership
}

export function calculatePricing(
    cartItems: CartItem[],
    rules: DiscountRule[],
    context: UserContext
): PricingResult {
    const appliedRules: AppliedRule[] = []

    // 1. Initialize Line Items with Base Price
    // If user is a member and track has fixed member price, use that instead of base price
    let lineItems: PricingLineItem[] = cartItems.map(item => {
        let basePrice: number
        let usesFixedMemberPrice = false
        
        // Check if member with fixed member price
        if (context.isMember) {
            const memberPrice = item.hasPartner && item.track.memberPricePairCents
                ? item.track.memberPricePairCents
                : item.track.memberPriceSingleCents
            
            if (memberPrice !== undefined && memberPrice !== null && memberPrice > 0) {
                basePrice = memberPrice
                usesFixedMemberPrice = true
            } else {
                // Fall back to regular price, discount engine will apply
                basePrice = item.hasPartner && item.track.pricePairCents
                    ? item.track.pricePairCents
                    : item.track.priceSingleCents
            }
        } else {
            // Non-member uses regular price
            basePrice = item.hasPartner && item.track.pricePairCents
                ? item.track.pricePairCents
                : item.track.priceSingleCents
        }

        return {
            trackId: item.trackId,
            basePriceCents: basePrice,
            discountCents: 0,
            finalPriceCents: basePrice,
            appliedRuleCodes: [],
            usesFixedMemberPrice // Track this to skip discount rules
        }
    })

    // Sort rules by priority (0 first)
    // Note: Mutating operations should be careful. 
    // We apply rules sequentially. Some rules apply to total, some to items.
    // For MVP, we calculate discounts and sum them up.

    const activeRules = rules.filter(r => r.enabled).sort((a, b) => a.priority - b.priority)

    for (const rule of activeRules) {
        if (rule.ruleType === 'MEMBERSHIP_TIER_PERCENT') {
            if (context.isMember && context.membershipTierId) {
                const config = rule.config as any // Validated by schema elsewhere
                const tierIds = config.tierIds || [] // Empty means all tiers
                const percent = config.discountPercent || 0

                // Check if this rule applies to the user's tier
                const appliesToTier = tierIds.length === 0 || tierIds.includes(context.membershipTierId)
                
                if (!appliesToTier) continue

                // Apply to all line items that have not been fully discounted
                // SKIP items that use fixed member price
                let ruleTotalDiscount = 0

                lineItems = lineItems.map(line => {
                    // Skip if using fixed member price
                    if ((line as any).usesFixedMemberPrice) return line
                    
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
