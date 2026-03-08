'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Info } from 'lucide-react'

interface Tier {
    count: number
    discountCents: number
}

interface Props {
    /** Initial tiers from existing rule config */
    defaultTiers?: Tier[]
    /** Callback when tiers change - receives array ready for JSON config */
    onChange: (tiers: Tier[]) => void
}

/**
 * User-friendly editor for multi-course tiered discount configuration.
 * Allows staff to define discount tiers based on number of courses purchased.
 * 
 * Example: 
 *   - 2 courses → 200 NOK off
 *   - 3 courses → 350 NOK off
 *   - 4+ courses → 500 NOK off
 */
export function MultiCourseTierEditor({ defaultTiers, onChange }: Props) {
    // Local state for editing - convert cents to NOK for display
    const [tiers, setTiers] = useState<Array<{ count: number; discountNok: number }>>(() => {
        if (defaultTiers && defaultTiers.length > 0) {
            return defaultTiers.map(t => ({
                count: t.count,
                discountNok: t.discountCents / 100
            })).sort((a, b) => a.count - b.count)
        }
        // Start with a default tier
        return [{ count: 2, discountNok: 200 }]
    })

    // Emit changes whenever tiers update
    useEffect(() => {
        const configTiers: Tier[] = tiers
            .filter(t => t.count >= 2 && t.discountNok > 0)
            .map(t => ({
                count: t.count,
                discountCents: Math.round(t.discountNok * 100)
            }))
            .sort((a, b) => a.count - b.count)
        
        onChange(configTiers)
    }, [tiers, onChange])

    const addTier = () => {
        // Find the highest count and suggest next
        const maxCount = Math.max(...tiers.map(t => t.count), 1)
        setTiers([...tiers, { count: maxCount + 1, discountNok: 0 }])
    }

    const removeTier = (index: number) => {
        if (tiers.length <= 1) return // Keep at least one tier
        setTiers(tiers.filter((_, i) => i !== index))
    }

    const updateTier = (index: number, field: 'count' | 'discountNok', value: number) => {
        const newTiers = [...tiers]
        newTiers[index] = { ...newTiers[index], [field]: value }
        setTiers(newTiers)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">How multi-course tiered discounts work:</p>
                    <p>Set discount amounts based on how many courses a student signs up for in a single order. 
                    Students automatically receive the highest applicable discount.</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Minimum Courses
                    </Label>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Discount (NOK)
                    </Label>
                    <div className="w-9" /> {/* Spacer for delete button */}
                </div>

                {tiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                        <div className="relative">
                            <Input
                                type="number"
                                min={2}
                                max={10}
                                value={tier.count}
                                onChange={(e) => updateTier(index, 'count', parseInt(e.target.value) || 2)}
                                className="pr-16"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                courses
                            </span>
                        </div>
                        <div className="relative">
                            <Input
                                type="number"
                                min={0}
                                step={50}
                                value={tier.discountNok}
                                onChange={(e) => updateTier(index, 'discountNok', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                NOK
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTier(index)}
                            disabled={tiers.length <= 1}
                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTier}
                className="w-full"
            >
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
            </Button>

            {/* Preview */}
            <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Preview
                </p>
                <div className="space-y-1 text-sm">
                    {tiers
                        .filter(t => t.count >= 2 && t.discountNok > 0)
                        .sort((a, b) => a.count - b.count)
                        .map((tier, i) => (
                            <div key={i} className="flex justify-between">
                                <span>{tier.count}+ courses:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                    {tier.discountNok.toLocaleString('nb-NO')} NOK off
                                </span>
                            </div>
                        ))}
                    {tiers.filter(t => t.count >= 2 && t.discountNok > 0).length === 0 && (
                        <p className="text-muted-foreground italic">No valid tiers configured</p>
                    )}
                </div>
            </div>
        </div>
    )
}
