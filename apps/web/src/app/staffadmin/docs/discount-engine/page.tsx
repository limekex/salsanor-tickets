'use client'

/**
 * Discount Engine — Staff Documentation
 *
 * i18n-ready: all user-visible strings are kept in the `content` object below.
 * When a translation library is introduced, replace each property with t('key').
 */

import {
    Percent,
    Tag,
    Users,
    ShieldCheck,
    BookOpen,
    Layers,
    AlertCircle,
    CheckCircle2,
    Building2,
    CalendarDays,
    Ticket,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// ---------------------------------------------------------------------------
// i18n-ready content object
// Replace values with t('staffadmin.docs.discountEngine.key') when i18n is set up
// ---------------------------------------------------------------------------
const content = {
    pageTitle: 'The Discount Engine',
    pageSubtitle:
        'How prices, membership discounts, and multi-course bundles are calculated at checkout.',

    sections: {
        overview: {
            title: 'Overview',
            body: 'The Discount Engine runs every time a participant proceeds through checkout. It applies discount rules in a defined priority order, calculates the final price per line item, and surfaces an itemised breakdown of every reduction that was applied.',
        },

        ruleTypes: {
            title: 'Rule Types',
            subtitle: 'Two rule types are supported. Both can live at the organisation level or the period level.',
            rules: [
                {
                    id: 'MEMBERSHIP_TIER_PERCENT',
                    icon: Percent,
                    label: 'Membership Tier Percent',
                    badge: 'Courses & Events',
                    description:
                        "Applies a percentage discount to all line items for a participant who holds an active membership. The percentage is stored in the rule's config field, not on the tier itself.",
                    configExample: '{ "discountPercent": 15 }',
                    tip: 'A rule with an empty tierIds array applies to every membership tier. Add specific tier IDs to restrict the discount to one tier.',
                },
                {
                    id: 'MULTI_COURSE_TIERED',
                    icon: Layers,
                    label: 'Multi-Course Tiered',
                    badge: 'Courses only',
                    description:
                        'Grants a fixed-amount (NOK) discount when a participant registers for two or more courses in a single order. Tiers are additive — the highest matching tier wins.',
                    configExample:
                        '{ "tiers": [{ "count": 2, "discountCents": 20000 }, { "count": 3, "discountCents": 40000 }] }',
                    tip: 'Discount amounts are distributed proportionally across line items so that partial refunds work correctly.',
                },
            ],
        },

        scope: {
            title: 'Rule Scope',
            subtitle: 'Rules can be attached at two levels. An organisation-level rule applies to every period unless overridden.',
            levels: [
                {
                    icon: Building2,
                    label: 'Organisation level',
                    path: 'Discounts → Organisation rules',
                    description:
                        'Applies to all course periods and (optionally) events for the organisation. Use the "Applies to" setting to scope a rule to periods, events, or both.',
                },
                {
                    icon: CalendarDays,
                    label: 'Period level',
                    path: 'Discounts → [select period]',
                    description:
                        'Applies only to the specific course period. Period rules are evaluated after organisation rules and can override or complement them.',
                },
            ],
        },

        memberPricingPriority: {
            title: 'Member Pricing Priority',
            subtitle:
                'When a logged-in participant has an active membership, the engine resolves the member price using this priority chain (highest wins):',
            steps: [
                {
                    number: '1',
                    label: 'Fixed member price per track',
                    description:
                        "Set under the track's \"Member Pricing\" section as a fixed NOK amount. For PRIVATE (slot-booking) tracks this acts as the per-slot member price. If this is set, the discount engine is skipped entirely for that line item.",
                    location: 'Tracks → Edit track → Member Pricing → Set fixed member prices',
                },
                {
                    number: '2',
                    label: 'Organisation membership rule',
                    description:
                        'The MEMBERSHIP_TIER_PERCENT rule attached at the organisation level. The percentage is applied to the regular base price.',
                    location: 'Discounts → Organisation rules',
                },
                {
                    number: '3',
                    label: 'Period membership rule',
                    description:
                        'The MEMBERSHIP_TIER_PERCENT rule attached to the specific course period. Only used if no organisation rule is found.',
                    location: 'Discounts → [select period]',
                },
            ],
            gateNote:
                'Member pricing is never surfaced to participants unless the organisation has at least one active default membership tier configured.',
        },

        checkoutFlow: {
            title: 'Checkout Calculation Flow',
            steps: [
                'Line items are created from the cart. Each item starts with its regular base price.',
                'If the participant is a logged-in member and the track has a fixed member price, that price replaces the base price and rule evaluation is skipped for that item.',
                'For PRIVATE (slot-booking) tracks without a fixed member price, the base price is pricePerSlotCents × number of sessions booked.',
                'Active discount rules are sorted by priority (lowest number first) and applied sequentially.',
                'MEMBERSHIP_TIER_PERCENT rules reduce each line item by the configured percentage.',
                'MULTI_COURSE_TIERED rules reduce the total by the configured NOK amount, distributed evenly across all line items.',
                'The engine returns a full breakdown: subtotal, total discount, final total, per-item detail, and a list of applied rules with amounts.',
            ],
        },

        memberDiscountMode: {
            title: 'Per-Track Discount Control',
            subtitle:
                'Each track has a memberDiscountMode setting that controls how (or whether) member discounts apply.',
            modes: [
                {
                    value: 'ENABLED',
                    label: 'Enabled (default)',
                    description: 'Member discount rules apply normally.',
                },
                {
                    value: 'FIXED',
                    label: 'Fixed',
                    description:
                        'Display mode only — shown on listing pages to indicate the fixed price is already set. The engine uses the fixed memberPriceSingleCents value.',
                },
                {
                    value: 'DISABLED',
                    label: 'Disabled',
                    description:
                        'No member discount is applied or shown for this track, regardless of rules.',
                },
            ],
        },

        displayVsCheckout: {
            title: 'Display vs. Checkout',
            body: 'Listing pages (course list, organiser page) show a pre-computed resolvedMemberDiscountPercent to give participants a preview. The actual price is always recalculated at checkout by the engine — the display figure is for UI only and never used as the authoritative price.',
        },

        whereToManage: {
            title: 'Where to Manage Discounts',
            links: [
                {
                    icon: Building2,
                    label: 'Organisation discount rules',
                    path: '/staffadmin/discounts/org',
                    description: 'Create or edit org-wide membership and other rules.',
                },
                {
                    icon: CalendarDays,
                    label: 'Period discount rules',
                    path: '/staffadmin/discounts',
                    description: 'Select a period to manage period-specific rules.',
                },
                {
                    icon: Ticket,
                    label: 'Track member pricing',
                    path: '/staffadmin/tracks',
                    description: 'Edit a track and go to the Member Pricing section.',
                },
                {
                    icon: Users,
                    label: 'Membership tiers',
                    path: '/staffadmin/memberships/tiers',
                    description: 'Configure which tiers exist and which is the default.',
                },
            ],
        },

        faq: {
            title: 'Common Questions',
            items: [
                {
                    q: 'A member is not seeing a discount at checkout — why?',
                    a: "Check that: (1) the organisation has an active default membership tier, (2) a MEMBERSHIP_TIER_PERCENT rule exists at org or period level, (3) the track's memberDiscountMode is not DISABLED, and (4) the participant's membership has not expired.",
                },
                {
                    q: 'The multi-course discount is not applying — why?',
                    a: 'The MULTI_COURSE_TIERED rule only fires when the cart contains at least the minimum number of different tracks defined in the lowest tier. Ensure rules are attached to the correct period and are enabled.',
                },
                {
                    q: 'Can both a member discount and a multi-course discount apply in the same order?',
                    a: 'Yes. Rules run sequentially in priority order. The member percent discount reduces each line item first; the multi-course discount is then applied to the remaining total.',
                },
                {
                    q: 'Where does the membership discount percentage actually come from?',
                    a: 'It lives in the rule config — the discountPercent field inside OrgDiscountRule or DiscountRule with ruleType MEMBERSHIP_TIER_PERCENT. It is not stored on the MembershipTier model.',
                },
                {
                    q: 'I set a fixed member price on a PRIVATE track — will the percentage discount also apply?',
                    a: 'No. A fixed member price short-circuits the discount engine for that line item. Only one or the other applies.',
                },
            ],
        },
    },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DiscountEngineDocsPage() {
    const s = content.sections

    return (
        <div className="space-y-rn-8 max-w-4xl">

            {/* Header */}
            <div>
                <h1 className="rn-h1 flex items-center gap-rn-3">
                    <Percent className="h-8 w-8 text-rn-primary" />
                    {content.pageTitle}
                </h1>
                <p className="rn-body text-rn-text-muted mt-rn-2">{content.pageSubtitle}</p>
            </div>

            {/* Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-rn-primary" />
                        {s.overview.title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="rn-body">{s.overview.body}</p>
                </CardContent>
            </Card>

            {/* Rule Types */}
            <section className="space-y-rn-4">
                <div>
                    <h2 className="rn-h2">{s.ruleTypes.title}</h2>
                    <p className="rn-meta text-rn-text-muted mt-1">{s.ruleTypes.subtitle}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {s.ruleTypes.rules.map(rule => (
                        <Card key={rule.id} className="flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <rule.icon className="h-4 w-4 text-rn-primary shrink-0" />
                                    {rule.label}
                                </CardTitle>
                                <Badge variant="secondary" className="w-fit">{rule.badge}</Badge>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-3">
                                <p className="rn-body">{rule.description}</p>
                                <div className="bg-rn-surface rounded-lg p-3">
                                    <code className="text-xs font-mono text-rn-text-muted break-all">{rule.configExample}</code>
                                </div>
                                <div className="flex items-start gap-2 bg-rn-surface rounded-lg p-3">
                                    <AlertCircle className="h-4 w-4 text-rn-primary mt-0.5 shrink-0" />
                                    <p className="rn-meta text-rn-text-muted">{rule.tip}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Scope */}
            <section className="space-y-rn-4">
                <div>
                    <h2 className="rn-h2">{s.scope.title}</h2>
                    <p className="rn-meta text-rn-text-muted mt-1">{s.scope.subtitle}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {s.scope.levels.map(level => (
                        <Card key={level.label}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <level.icon className="h-4 w-4 text-rn-primary" />
                                    {level.label}
                                </CardTitle>
                                <CardDescription className="font-mono text-xs">{level.path}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="rn-body">{level.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <Separator />

            {/* Member Pricing Priority */}
            <section className="space-y-rn-4">
                <div>
                    <h2 className="rn-h2">{s.memberPricingPriority.title}</h2>
                    <p className="rn-meta text-rn-text-muted mt-1">{s.memberPricingPriority.subtitle}</p>
                </div>
                <div className="space-y-3">
                    {s.memberPricingPriority.steps.map(step => (
                        <Card key={step.number}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-3 text-base">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rn-primary text-white text-xs font-bold">
                                        {step.number}
                                    </span>
                                    {step.label}
                                </CardTitle>
                                <CardDescription className="font-mono text-xs ml-9">{step.location}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="rn-body">{step.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="flex items-start gap-3 bg-rn-surface rounded-lg p-4">
                    <ShieldCheck className="h-4 w-4 text-rn-primary mt-0.5 shrink-0" />
                    <p className="rn-meta text-rn-text-muted">
                        <strong className="text-rn-text">Gate condition: </strong>
                        {s.memberPricingPriority.gateNote}
                    </p>
                </div>
            </section>

            {/* Checkout Flow */}
            <section className="space-y-rn-4">
                <h2 className="rn-h2">{s.checkoutFlow.title}</h2>
                <Card>
                    <CardContent className="pt-6">
                        <ol className="space-y-3">
                            {s.checkoutFlow.steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rn-surface text-rn-text-muted text-xs font-semibold mt-0.5">
                                        {i + 1}
                                    </span>
                                    <p className="rn-body">{step}</p>
                                </li>
                            ))}
                        </ol>
                    </CardContent>
                </Card>
            </section>

            <Separator />

            {/* Per-Track Discount Control */}
            <section className="space-y-rn-4">
                <div>
                    <h2 className="rn-h2">{s.memberDiscountMode.title}</h2>
                    <p className="rn-meta text-rn-text-muted mt-1">{s.memberDiscountMode.subtitle}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    {s.memberDiscountMode.modes.map(mode => (
                        <Card key={mode.value}>
                            <CardHeader className="pb-2">
                                <Badge
                                    variant={mode.value === 'DISABLED' ? 'destructive' : mode.value === 'FIXED' ? 'secondary' : 'default'}
                                    className="w-fit"
                                >
                                    {mode.value}
                                </Badge>
                                <CardTitle className="text-sm">{mode.label}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{mode.description}</CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="flex items-start gap-3 bg-rn-surface rounded-lg p-4">
                    <Tag className="h-4 w-4 text-rn-primary mt-0.5 shrink-0" />
                    <div>
                        <p className="rn-meta font-semibold text-rn-text">{s.displayVsCheckout.title}</p>
                        <p className="rn-meta text-rn-text-muted mt-1">{s.displayVsCheckout.body}</p>
                    </div>
                </div>
            </section>

            {/* Where to Manage */}
            <section className="space-y-rn-4">
                <h2 className="rn-h2">{s.whereToManage.title}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {s.whereToManage.links.map(link => (
                        <a key={link.path} href={link.path} className="block group">
                            <Card className="h-full transition-shadow group-hover:shadow-md">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <link.icon className="h-4 w-4 text-rn-primary" />
                                        {link.label}
                                    </CardTitle>
                                    <CardDescription className="font-mono text-xs">{link.path}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription>{link.description}</CardDescription>
                                </CardContent>
                            </Card>
                        </a>
                    ))}
                </div>
            </section>

            <Separator />

            {/* FAQ */}
            <section className="space-y-rn-4">
                <h2 className="rn-h2">{s.faq.title}</h2>
                <div className="space-y-3">
                    {s.faq.items.map((item, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-start gap-2 text-sm font-semibold">
                                    <CheckCircle2 className="h-4 w-4 text-rn-primary mt-0.5 shrink-0" />
                                    {item.q}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{item.a}</CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    )
}
