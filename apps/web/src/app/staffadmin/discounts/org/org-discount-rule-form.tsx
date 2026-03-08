'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { orgDiscountRuleSchema, OrgDiscountRuleFormData, DiscountScope } from '@/lib/schemas/discount'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useTransition, useCallback } from 'react'
import { createOrgDiscountRule, updateOrgDiscountRule } from '@/app/actions/discounts'
import { useRouter } from 'next/navigation'
import { MultiCourseTierEditor } from '@/components/discount/multi-course-tier-editor'

interface Props {
    organizerId: string
    tiers: Array<{
        id: string
        name: string
        slug: string
    }>
    existingRule?: {
        id: string
        code: string
        name: string
        priority: number
        enabled: boolean
        ruleType: string
        config: Record<string, unknown>
        appliesTo?: DiscountScope
    }
}

export function OrgDiscountRuleForm({ organizerId, tiers, existingRule }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [submitError, setSubmitError] = useState<string | null>(null)
    const isEditMode = !!existingRule
    
    // Extract tier IDs from existing rule config
    const existingTierIds = (existingRule?.config?.tierIds as string[] | undefined) ?? []
    const [selectedTiers, setSelectedTiers] = useState<string[]>(existingTierIds)

    // Extract config values for defaults
    const discountPercent = (existingRule?.config?.discountPercent as number | undefined) ?? undefined
    const tiersJson = existingRule?.config?.tiers ?? undefined

    const form = useForm<OrgDiscountRuleFormData>({
        resolver: zodResolver(orgDiscountRuleSchema),
        defaultValues: {
            organizerId,
            code: existingRule?.code ?? '',
            name: existingRule?.name ?? '',
            priority: existingRule?.priority ?? 0,
            enabled: existingRule?.enabled ?? true,
            ruleType: (existingRule?.ruleType as 'MEMBERSHIP_TIER_PERCENT' | 'MULTI_COURSE_TIERED' | 'PROMO_CODE_FIXED') ?? 'MEMBERSHIP_TIER_PERCENT',
            config: existingRule?.config ?? {},
            appliesTo: existingRule?.appliesTo ?? 'BOTH'
        }
    })

    const ruleType = form.watch('ruleType')

    async function onSubmit(data: OrgDiscountRuleFormData) {
        setSubmitError(null)
        const formData = new FormData()
        if (isEditMode) {
            formData.append('ruleId', existingRule.id)
        }
        formData.append('organizerId', data.organizerId)
        formData.append('code', data.code)
        formData.append('name', data.name)
        formData.append('priority', String(data.priority))
        formData.append('enabled', data.enabled ? 'on' : 'off')
        formData.append('ruleType', data.ruleType)
        formData.append('config', JSON.stringify(data.config))
        formData.append('appliesTo', data.appliesTo)

        startTransition(async () => {
            const result = isEditMode
                ? await updateOrgDiscountRule(null, formData)
                : await createOrgDiscountRule(null, formData)
            if (result?.error) {
                if (result.error._form) {
                    setSubmitError(result.error._form[0])
                } else if (result.error.code) {
                    setSubmitError(result.error.code[0])
                } else {
                    console.error(result.error)
                    setSubmitError(`Failed to ${isEditMode ? 'update' : 'create'} rule. Check your input.`)
                }
            } else {
                router.push('/staffadmin/discounts')
                router.refresh()
            }
        })
    }

    // Helper to update config nested keys
    const setConfig = useCallback((key: string, value: unknown) => {
        const current = form.getValues('config') || {}
        form.setValue('config', { ...current, [key]: value })
    }, [form])

    // Handler for multi-course tier changes
    const handleMultiCourseTierChange = useCallback((tiers: Array<{ count: number; discountCents: number }>) => {
        setConfig('tiers', tiers)
    }, [setConfig])

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {submitError && (
                    <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm font-medium">
                        {submitError}
                    </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Organization-level rule:</strong> This rule will apply to all course periods 
                        unless a period-specific rule is set to override it.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rule Code</FormLabel>
                                <FormControl>
                                    <Input placeholder="MEMBER_15" {...field} />
                                </FormControl>
                                <FormDescription>Uppercase, unique code</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>Evaluation order (0 = first)</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Member Discount 15%" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="ruleType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Rule Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="MEMBERSHIP_TIER_PERCENT">Membership Tier Discount (%)</SelectItem>
                                    <SelectItem value="MULTI_COURSE_TIERED">Multi-Course Tiered</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="appliesTo"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Applies To</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select scope" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="BOTH">Course Periods & Events</SelectItem>
                                    <SelectItem value="PERIODS">Course Periods Only</SelectItem>
                                    <SelectItem value="EVENTS">Events Only</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Choose where this discount should apply
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* DYNAMIC CONFIG SECTION */}
                <div className="p-4 border rounded-md bg-muted/20 space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        Configuration
                    </h3>

                    {ruleType === 'MEMBERSHIP_TIER_PERCENT' && (
                        <div className="space-y-4">
                            <FormItem>
                                <FormLabel>Discount Percentage</FormLabel>
                                <Input
                                    type="number"
                                    placeholder="15"
                                    min="0"
                                    max="100"
                                    defaultValue={discountPercent}
                                    onChange={(e) => {
                                        const value = Number(e.target.value)
                                        setConfig('discountPercent', value)
                                    }}
                                />
                                <FormDescription>Enter percentage (0-100)</FormDescription>
                            </FormItem>

                            {tiers.length > 0 && (
                                <FormItem>
                                    <FormLabel>Apply to Membership Tiers</FormLabel>
                                    <FormDescription>
                                        Leave unchecked to apply to all tiers
                                    </FormDescription>
                                    <div className="space-y-2 mt-2">
                                        {tiers.map((tier) => (
                                            <div key={tier.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`tier-${tier.id}`}
                                                    checked={selectedTiers.includes(tier.id)}
                                                    onCheckedChange={(checked: boolean) => {
                                                        const newTiers = checked
                                                            ? [...selectedTiers, tier.id]
                                                            : selectedTiers.filter(id => id !== tier.id)
                                                        setSelectedTiers(newTiers)
                                                        setConfig('tierIds', newTiers.length > 0 ? newTiers : undefined)
                                                    }}
                                                />
                                                <label
                                                    htmlFor={`tier-${tier.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {tier.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </FormItem>
                            )}

                            {tiers.length === 0 && (
                                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                                    No membership tiers configured. This rule will apply to all members.
                                </div>
                            )}
                        </div>
                    )}

                    {ruleType === 'MULTI_COURSE_TIERED' && (
                        <MultiCourseTierEditor
                            defaultTiers={tiersJson as Array<{ count: number; discountCents: number }> | undefined}
                            onChange={handleMultiCourseTierChange}
                        />
                    )}
                </div>

                <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Enabled</FormLabel>
                                <FormDescription>
                                    Activate this rule immediately
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <div className="flex gap-2">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Saving...' : (isEditMode ? 'Update Rule' : 'Create Rule')}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/staffadmin/discounts')}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </Form>
    )
}
