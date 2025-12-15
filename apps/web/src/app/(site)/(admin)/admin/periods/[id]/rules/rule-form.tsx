
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { discountRuleSchema, DiscountRuleFormData } from '@/lib/schemas/discount'
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
import { useState, useTransition } from 'react'
import { createDiscountRule } from '@/app/actions/discounts'

interface Props {
    periodId: string
}

export function RuleForm({ periodId }: Props) {
    const [isPending, startTransition] = useTransition()
    const [submitError, setSubmitError] = useState<string | null>(null)

    const form = useForm<DiscountRuleFormData>({
        resolver: zodResolver(discountRuleSchema),
        defaultValues: {
            periodId,
            code: '',
            name: '',
            priority: 0,
            enabled: true,
            ruleType: 'MEMBERSHIP_PERCENT',
            config: {} // Start empty, will be filled by dynamic fields
        }
    })

    const ruleType = form.watch('ruleType')

    async function onSubmit(data: DiscountRuleFormData) {
        setSubmitError(null)
        const formData = new FormData()
        formData.append('periodId', data.periodId)
        formData.append('code', data.code)
        formData.append('name', data.name)
        formData.append('priority', String(data.priority))
        formData.append('enabled', data.enabled ? 'on' : 'off')
        formData.append('ruleType', data.ruleType)
        formData.append('config', JSON.stringify(data.config))

        startTransition(async () => {
            const result = await createDiscountRule(null, formData)
            if (result?.error) {
                if (result.error._form) {
                    setSubmitError(result.error._form[0])
                } else {
                    // map errors to fields
                    // simplified for now
                    console.error(result.error)
                }
            }
        })
    }

    // Helper to update config nested keys
    const setConfig = (key: string, value: any) => {
        const current = form.getValues('config') || {}
        form.setValue('config', { ...current, [key]: value })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                {submitError && (
                    <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm font-medium">
                        {submitError}
                    </div>
                )}

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
                                <FormDescription>Comparison order (0 = first)</FormDescription>
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
                                <Input placeholder="e.g. Salsanor Membership Discount" {...field} />
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
                                    <SelectItem value="MEMBERSHIP_PERCENT">Membership Discount (%)</SelectItem>
                                    <SelectItem value="MULTI_COURSE_TIERED">Multi-Course Tiered</SelectItem>
                                    <SelectItem value="PROMO_CODE_FIXED">Promo Code (Not Impl)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* DYNAMIC CONFIG SECTION */}
                <div className="p-4 border rounded-md bg-muted/20 space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        Configuration: {ruleType}
                    </h3>

                    {ruleType === 'MEMBERSHIP_PERCENT' && (
                        <div className="space-y-4">
                            <FormItem>
                                <FormLabel>Discount Percentage</FormLabel>
                                <Input
                                    type="number"
                                    placeholder="15"
                                    onChange={(e) => setConfig('discountPercent', Number(e.target.value))}
                                />
                                <FormDescription>Enter percentage (0-100)</FormDescription>
                            </FormItem>
                        </div>
                    )}

                    {ruleType === 'MULTI_COURSE_TIERED' && (
                        <div className="space-y-4">
                            <p className="text-sm">Work in progress: manually add JSON for tiers if needed or implement complex UI.</p>
                            {/* Simplified for MVP: Textarea for JSON config if complex */}
                            {/* Actually, let's just do a simple tiered builder? No, too complex for this step. */}
                            {/* We will just support ONE tier for MVP for now or use JSON input for power users */}
                            <FormItem>
                                <FormLabel>Tiers JSON</FormLabel>
                                <Input
                                    placeholder='[{ "count": 2, "discountCents": 20000 }]'
                                    onChange={(e) => {
                                        try {
                                            const json = JSON.parse(e.target.value)
                                            form.setValue('config', { tiers: json })
                                        } catch (err) {
                                            // ignore parse error while typing
                                        }
                                    }}
                                />
                                <FormDescription>Format: <code>[{`{ "count": 2, "discountCents": 20000 }`}]</code></FormDescription>
                            </FormItem>
                        </div>
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

                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : 'Create Rule'}
                </Button>
            </form>
        </Form>
    )
}
