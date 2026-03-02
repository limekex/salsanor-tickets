'use client'

import { useActionState, useTransition } from 'react'
import { createPeriodBreak, deletePeriodBreak } from '@/app/actions/period-breaks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus, CalendarOff } from 'lucide-react'
import type { PeriodBreak } from '@salsanor/database'

const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })

interface BreakManagerProps {
    periodId: string
    breaks: PeriodBreak[]
}

export function BreakManager({ periodId, breaks }: BreakManagerProps) {
    const [state, formAction, isPending] = useActionState(
        createPeriodBreak.bind(null, periodId),
        null
    )
    const [isDeleting, startDeleteTransition] = useTransition()

    const fieldErrors = state?.error && typeof state.error === 'object' ? state.error as Record<string, string[]> : null
    const formError = fieldErrors?._form?.[0]

    function handleDelete(breakId: string) {
        startDeleteTransition(async () => {
            await deletePeriodBreak(breakId, periodId)
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarOff className="h-4 w-4" />
                    Break Weeks
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Existing breaks */}
                {breaks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No breaks defined for this period.</p>
                ) : (
                    <div className="space-y-2">
                        {breaks.map(b => (
                            <div key={b.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                <div>
                                    <span className="font-medium">
                                        {dateFormatter.format(new Date(b.startDate))} – {dateFormatter.format(new Date(b.endDate))}
                                    </span>
                                    {b.description && (
                                        <span className="ml-2 text-muted-foreground">{b.description}</span>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isDeleting}
                                    onClick={() => handleDelete(b.id)}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add break form */}
                <form action={formAction} className="space-y-3 border-t pt-4">
                    <p className="text-sm font-medium">Add Break</p>
                    {formError && <p className="text-sm text-destructive">{formError}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                            <Input id="startDate" name="startDate" type="date" required />
                            {fieldErrors?.startDate && (
                                <p className="text-xs text-destructive">{fieldErrors.startDate[0]}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="endDate" className="text-xs">End Date</Label>
                            <Input id="endDate" name="endDate" type="date" required />
                            {fieldErrors?.endDate && (
                                <p className="text-xs text-destructive">{fieldErrors.endDate[0]}</p>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="description" className="text-xs">Description (optional)</Label>
                        <Input id="description" name="description" placeholder="e.g. Christmas break, Easter" />
                    </div>
                    <Button type="submit" size="sm" disabled={isPending} className="gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        {isPending ? 'Adding...' : 'Add Break'}
                    </Button>
                    {state?.success && (
                        <p className="text-xs text-green-600">Break added successfully.</p>
                    )}
                </form>
            </CardContent>
        </Card>
    )
}
