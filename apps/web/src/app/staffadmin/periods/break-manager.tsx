'use client'

import { useActionState, useTransition } from 'react'
import { createPeriodBreak, deletePeriodBreak } from '@/app/actions/period-breaks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, CalendarOff } from 'lucide-react'
import type { PeriodBreak, CourseTrack } from '@salsanor/database'

const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })

// Format date to YYYY-MM-DD for input min/max
function toDateInputValue(date: Date | string): string {
    const d = new Date(date)
    return d.toISOString().split('T')[0]
}

type BreakWithTrack = PeriodBreak & { CourseTrack?: { id: string; title: string } | null }

interface BreakManagerProps {
    periodId: string
    breaks: BreakWithTrack[]
    tracks: Pick<CourseTrack, 'id' | 'title'>[]
    periodStartDate: Date | string
    periodEndDate: Date | string
}

export function BreakManager({ periodId, breaks, tracks, periodStartDate, periodEndDate }: BreakManagerProps) {
    const minDate = toDateInputValue(periodStartDate)
    const maxDate = toDateInputValue(periodEndDate)
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
                                <div className="flex flex-col gap-0.5">
                                    <div>
                                        <span className="font-medium">
                                            {dateFormatter.format(new Date(b.startDate))} – {dateFormatter.format(new Date(b.endDate))}
                                        </span>
                                        {b.description && (
                                            <span className="ml-2 text-muted-foreground">{b.description}</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {b.CourseTrack ? b.CourseTrack.title : 'All tracks'}
                                    </span>
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
                            <Input id="startDate" name="startDate" type="date" required min={minDate} max={maxDate} />
                            {fieldErrors?.startDate && (
                                <p className="text-xs text-destructive">{fieldErrors.startDate[0]}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="endDate" className="text-xs">End Date</Label>
                            <Input id="endDate" name="endDate" type="date" required min={minDate} max={maxDate} />
                            {fieldErrors?.endDate && (
                                <p className="text-xs text-destructive">{fieldErrors.endDate[0]}</p>
                            )}
                        </div>
                    </div>
                    {tracks.length > 0 && (
                        <div className="space-y-1">
                            <Label htmlFor="trackId" className="text-xs">Applies to</Label>
                            <select
                                id="trackId"
                                name="trackId"
                                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="">All tracks in period</option>
                                {tracks.map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </div>
                    )}
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
